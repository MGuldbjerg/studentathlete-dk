/**
 * Short drafts go straight onto the profile — no approval.
 * ========================================================
 *
 * Mikkel, 2026-10-13: «Articles that would have been less than 130 words can be
 * added to profiles (with a link to the source) without human approval.»
 *
 * A draft under the site's word floor never becomes a page anyway: publishing
 * it puts one dated line on the athlete's timeline (src/lib/timeline-entry.ts).
 * This does that without waiting for a publish decision, on both sites. The
 * line is the draft's title with the name taken off, dated from the fact sheet
 * or the source URL, and it links to the source.
 *
 * Guardrails, not judgement — a draft that fails one stays in the queue and is
 * decided as before:
 *  - it needs an athlete (a profile to stand on) and a source URL (the link)
 *  - a story flagged `sensitive` is never put up by the machine
 *  - the mechanical check (quality-check.ts) must find nothing HIGH in the
 *    title or the text: a wrong number, name, identity or quote means a person
 *    or the Opus editor looks first
 *
 * The repo is public: stdout carries ids only, the lines go to Discord.
 *
 *   npx tsx pipeline/fix/auto-timeline.ts [--dry-run] [--notify]
 */

import { createD1Client } from "../lib/d1-client";
import { notify, COLOR } from "../lib/notify";
import { countryProfile } from "../../src/lib/countries";
import { dossierSelect, type DossierRow } from "../generate/draft-dossier";
import { checkDraft, type Finding } from "../generate/quality-check";
import {
  becomesTimelineEntry, timelineLine, timelineParams, wordCount, TIMELINE_INSERT_SQL, TIMELINE_DELETE_SQL,
} from "../../src/lib/timeline-entry";

export interface ShortDraft extends DossierRow {
  athlete_id: number | null;
  preferred_name: string | null;
  sensitive: string | null;
}

/** Null when the draft may go up as a line; otherwise why it stays in the queue. */
export function whyNot(r: ShortDraft): string | null {
  if (!becomesTimelineEntry(r)) return "not under the word floor";
  if (!r.athlete_name) return "no athlete";
  if (!r.source_url) return "no source to link to";
  if (r.sensitive) return `flagged sensitive (${r.sensitive})`;
  const high = findings(r).find((f) => f.severity === "high");
  return high ? `mechanical check: ${high.claim} — ${high.why}` : null;
}

function findings(r: ShortDraft): Finding[] {
  return checkDraft({
    title: r.title,
    content: r.content,
    factSheet: r.fact_sheet,
    sourceText: [r.summary, r.content_raw].filter(Boolean).join("\n") || null,
    athlete: {
      name: r.athlete_name!,
      preferredName: r.preferred_name,
      gender: r.gender,
      classYear: r.class_year,
      university: r.university,
      hometown: r.hometown,
      previousSchool: r.previous_school,
    },
    language: r.country === "DK" ? "da" : "en",
  });
}

async function main() {
  const dry = process.argv.includes("--dry-run");
  const ping = process.argv.includes("--notify");
  const db = createD1Client();
  const rows = (await db.query<ShortDraft>(
    `${dossierSelect(["a.athlete_id", "ath.preferred_name", "s.sensitive"])}
     WHERE a.published = 0 AND a.athlete_id IS NOT NULL ORDER BY a.id`,
  )).results.filter((r) => becomesTimelineEntry(r));
  console.log(`${rows.length} draft(s) under the word floor`);

  const added: Record<string, string[]> = {};
  for (const r of rows) {
    const why = whyNot(r);
    if (why) {
      console.log(`  #${r.id}: stays in the queue`);
      continue;
    }
    const params = timelineParams({
      athlete_id: r.athlete_id!, athlete_name: r.athlete_name!, title: r.title,
      source_url: r.source_url, fact_sheet: r.fact_sheet,
    });
    console.log(`  #${r.id}: line (${wordCount(r.content)} words)`);
    (added[r.country ?? "?"] ??= []).push(`**${r.athlete_name}** · ${params[1]} · ${timelineLine(r.title, r.athlete_name!)}`);
    if (dry) continue;
    await db.batch([
      { sql: TIMELINE_INSERT_SQL, params },
      ...TIMELINE_DELETE_SQL.map((sql) => ({ sql, params: [r.id] })),
    ]);
  }

  if (!ping || dry) return;
  for (const [country, lines] of Object.entries(added)) {
    await notify(
      {
        title: `📌 ${lines.length} short stor${lines.length === 1 ? "y" : "ies"} added to profiles — ${countryProfile(country).brand}`,
        color: COLOR.report,
        description: lines.join("\n").slice(0, 4000),
      },
      country,
    );
  }
}

if (process.argv[1]?.endsWith("auto-timeline.ts")) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
