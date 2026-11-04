/**
 * Publish the rule-based profile text for countries whose template is approved.
 *
 * Mikkel, 2026-11-04: «I want the UK profiles to be approved on a template
 * level.» After the template audit that day (raw position codes, cut-off school
 * names, «Washington, Washington D.C.», «runs as a distance runner» — all fixed
 * in profile-baseline-en.ts), the template's output goes live without a
 * per-profile click in /admin/profiler. `profileTemplateApproved` on the country
 * profile is the switch (UK on, DK off).
 *
 * What it may touch, per active athlete in an approved country:
 *   · no text yet → publish the template's text. A REJECTED draft (draft NULL,
 *     draft_at set) is respected: nothing is proposed again.
 *   · a text the template wrote (`profile_by_template = 1`) → replace it with
 *     the template's current text.
 *   · anything else — a text a person approved or edited (0), or one we can't
 *     tell (NULL) — is never touched. queue-stale-profiles.ts handles those as
 *     before.
 *   · a pending draft over 400 characters is an LLM career summary (--expand)
 *     waiting for a person: never touched.
 *
 * One hold: the text names a school the athlete is no longer at, and no
 * transfer was recorded. Then «has played for X since 2023» would claim the
 * whole time at the new school — or the row was matched to the wrong person.
 * That goes to the approval queue instead.
 *
 * The text is built from the CURRENT data at run time, never from a stored
 * draft: two queued drafts on 2026-11-04 described transfers the data no
 * longer showed.
 *
 *   npx tsx pipeline/profiles/apply-template-profiles.ts           # dry-run
 *   npx tsx pipeline/profiles/apply-template-profiles.ts --apply
 */
import { createD1Client } from "../lib/d1-client";
import { type BaselineAthlete, TRANSFER_EVENT_SQL, transferInto } from "../../src/lib/profile-baseline";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { COUNTRIES, countryProfile } from "../../src/lib/countries";
import { displaySchoolName } from "../../src/lib/school-display-name";
import { teamName } from "../../src/lib/school-team-name";

/** Longer than any template text; an --expand summary is longer. */
export const MAX_TEMPLATE_CHARS = 400;

export interface TemplateRow extends BaselineAthlete {
  id: number;
  home_country: string | null;
  profile_summary: string | null;
  profile_draft: string | null;
  profile_draft_at: string | null;
  profile_by_template: number | null;
}

export type Decision =
  | { action: "skip"; why: string }
  | { action: "publish"; text: string }
  | { action: "hold"; text: string; why: string };

/** Does the text still name the athlete's current school (or its team)? */
export function namesCurrentSchool(text: string, a: BaselineAthlete): boolean {
  const school = displaySchoolName(a.university, a.university_common_name);
  // The stored common_name too, as it is: an older text used it even where the
  // seed had cut it («Hinds Community»), and that is not a change of school.
  const stored = (a.university_common_name ?? "").split("/")[0].trim();
  const names = [school, a.university, stored, teamName(school, a.university_nickname, a.gender)]
    .filter((n): n is string => Boolean(n && n.trim()));
  return names.some((n) => text.includes(n));
}

export function decide(a: TemplateRow, build: (a: BaselineAthlete) => string): Decision {
  if (a.profile_draft && a.profile_draft.length > MAX_TEMPLATE_CHARS) {
    return { action: "skip", why: "long draft (LLM summary) waits for a person" };
  }
  if (a.profile_summary == null) {
    if (a.profile_draft == null && a.profile_draft_at != null) {
      return { action: "skip", why: "draft was rejected" };
    }
  } else if (a.profile_by_template !== 1) {
    return { action: "skip", why: "text is a person's" };
  }

  const text = build(a);
  if (a.profile_summary === text && a.profile_draft == null) {
    return { action: "skip", why: "up to date" };
  }
  if (a.profile_summary != null && !namesCurrentSchool(a.profile_summary, a) && !transferInto(a)) {
    return { action: "hold", text, why: "school changed without a recorded transfer" };
  }
  return { action: "publish", text };
}

const COLS =
  "a.id, a.name, a.preferred_name, a.university, a.university_state, a.sport, a.position, " +
  "a.hometown, a.year_enrolled, a.expected_graduation, a.active, a.home_country," + TRANSFER_EVENT_SQL + ", " +
  "a.profile_summary, a.profile_draft, a.profile_draft_at, a.profile_by_template, " +
  "s.common_name AS university_common_name, s.city AS university_city, s.nickname AS university_nickname, a.gender";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const approved = Object.values(COUNTRIES).filter((c) => c.profileTemplateApproved).map((c) => c.code);
  if (approved.length === 0) {
    console.log("No country has profileTemplateApproved — nothing to do.");
    return;
  }
  const db = createD1Client();
  const r = await db.query<TemplateRow>(
    `SELECT ${COLS} FROM athletes a
     LEFT JOIN schools s ON s.name = a.university
     WHERE a.active = 1 AND a.home_country IN (${approved.map(() => "?").join(",")})`,
    approved,
  );

  const counts = { publish: 0, hold: 0, skip: 0, newText: 0 };
  const shown = { publish: 0, hold: 0 };
  for (const a of r.results) {
    const lang = countryProfile(a.home_country ?? undefined).language;
    const d = decide(a, (x) => profileBuilder(lang)(x));
    counts[d.action]++;
    if (d.action === "skip") continue;
    if (d.action === "publish" && a.profile_summary == null) counts.newText++;
    if (shown[d.action] < 8) {
      shown[d.action]++;
      console.log(`#${a.id} ${a.name} → ${d.action}${d.action === "hold" ? ` (${d.why})` : ""}`);
      if (a.profile_summary) console.log(`  now: ${a.profile_summary}`);
      console.log(`  new: ${d.text}\n`);
    }
    if (!apply) continue;
    if (d.action === "publish") {
      await db.execute(
        `UPDATE athletes SET profile_summary = ?, profile_draft = NULL, profile_draft_at = NULL,
         profile_by_template = 1, updated_at = datetime('now') WHERE id = ?`,
        [d.text, a.id],
      );
    } else if (a.profile_draft !== d.text) {
      await db.execute(
        "UPDATE athletes SET profile_draft = ?, profile_draft_at = datetime('now') WHERE id = ?",
        [d.text, a.id],
      );
    }
  }
  console.log(
    `${approved.join(",")}: ${counts.publish} ${apply ? "published" : "would be published"} ` +
    `(${counts.newText} new, ${counts.publish - counts.newText} updated), ` +
    `${counts.hold} held for approval, ${counts.skip} untouched` + (apply ? "." : " — run with --apply."),
  );
}

if (/apply-template-profiles\.ts$/.test(process.argv[1] ?? "")) main();
