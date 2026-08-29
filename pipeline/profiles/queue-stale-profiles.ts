/**
 * Forældede GODKENDTE profiltekster → godkendelseskøen.
 *
 * Når skabelonen rettes, står de allerede godkendte tekster tilbage med den
 * gamle formulering: ingen kørsel rører `profile_summary`. Efter
 * skolenavn-rettelsen 2026-08-29 gjaldt det 138 profiler, fx «for University
 * of North Carolina i North Carolina som Forward».
 *
 * ⚠️ Teksten OVERSKRIVES ALDRIG. Den lægges i `profile_draft`, hvor admin
 * viser den nuværende tekst ved siden af — samme princip som
 * `refresh-position-drafts.ts`. En håndredigeret profil må ikke kunne
 * forsvinde fordi en skabelon ændrede sig.
 *
 *   npx tsx pipeline/profiles/queue-stale-profiles.ts           # dry-run
 *   npx tsx pipeline/profiles/queue-stale-profiles.ts --apply
 */
import { createD1Client } from "../lib/d1-client";
import { type BaselineAthlete } from "../../src/lib/profile-baseline";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { countryProfile } from "../../src/lib/countries";

const MAX_CHARS = 400;

const COLS =
  "a.id, a.name, a.preferred_name, a.university, a.university_state, a.sport, a.position, " +
  "a.hometown, a.year_enrolled, a.expected_graduation, a.active, a.home_country, " +
  "a.profile_summary, s.common_name AS university_common_name, s.city AS university_city";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const r = await db.query<BaselineAthlete & { id: number; profile_summary: string }>(
    `SELECT ${COLS} FROM athletes a
     LEFT JOIN schools s ON s.name = a.university
     WHERE a.active = 1
       AND a.profile_summary IS NOT NULL
       AND length(a.profile_summary) <= ?
       -- Ligger der allerede et udkast, er det menneskets tur — ikke vores.
       AND a.profile_draft IS NULL`,
    [MAX_CHARS],
  );

  let queued = 0;
  for (const p of r.results) {
    const lang = countryProfile(p.home_country ?? undefined).language;
    const next = profileBuilder(lang)(p);
    if (next === p.profile_summary) continue;
    queued++;
    if (queued <= 5) {
      console.log(`#${p.id} ${p.name}`);
      console.log(`  nu:      ${p.profile_summary}`);
      console.log(`  forslag: ${next}\n`);
    }
    if (apply) {
      await db.execute(
        "UPDATE athletes SET profile_draft = ?, profile_draft_at = datetime('now') WHERE id = ?",
        [next, p.id],
      );
    }
  }

  console.log(
    `${queued} profil(er) ${apply ? "lagt i godkendelseskøen" : "ville blive lagt i køen — kør med --apply"}.`,
  );
}

main();
