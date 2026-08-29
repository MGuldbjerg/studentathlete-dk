/**
 * Genberegn de VENTENDE baseline-udkast efter en ændring i skabelonen.
 *
 * `build-profile-drafts.ts --baseline` rører kun atleter helt uden udkast, så
 * en rettelse i skabelonen når aldrig de udkast der allerede står i køen. Da
 * skolenavne, hjembyer og rolle-filtre blev rettet 2026-08-29, lå der 2.196
 * udkast skrevet med den gamle tekst — med registernavne («University of
 * North Carolina at Chapel Hill»), highschool i hjembyen og årgangskoder som
 * rolle («as a Sr.-3L»).
 *
 * Kørslen er DETERMINISTISK og bruger ingen LLM: den kalder samme bygger som
 * baseline-kørslen. Den rører kun `profile_draft` — aldrig `profile_summary`,
 * altså aldrig noget der står på sitet. Godkendelse sker som altid i
 * /admin/profiler.
 *
 * ⚠️ Udvidede udkast (--expand, LLM-skrevne karriere-resuméer) må ikke
 * overskrives. De er lange; grænsen nedenfor holder dem ude.
 *
 *   npx tsx pipeline/profiles/refresh-pending-drafts.ts           # dry-run
 *   npx tsx pipeline/profiles/refresh-pending-drafts.ts --apply
 */
import { createD1Client } from "../lib/d1-client";
import { type BaselineAthlete } from "../../src/lib/profile-baseline";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { countryProfile } from "../../src/lib/countries";

/** Over denne længde er udkastet skrevet af LLM'en (--expand), ikke af skabelonen. */
const BASELINE_MAX_CHARS = 400;

interface Row extends BaselineAthlete {
  id: number;
  profile_draft: string;
}

const COLS =
  "a.id, a.name, a.preferred_name, a.university, a.university_state, a.sport, a.position, " +
  "a.hometown, a.year_enrolled, a.expected_graduation, a.active, a.home_country, " +
  "a.profile_draft, s.common_name AS university_common_name";

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const r = await db.query<Row>(
    `SELECT ${COLS} FROM athletes a
     LEFT JOIN schools s ON s.name = a.university
     WHERE a.profile_draft IS NOT NULL AND length(a.profile_draft) <= ?`,
    [BASELINE_MAX_CHARS],
  );
  const rows = r.results ?? [];
  console.log(`${rows.length} ventende baseline-udkast${apply ? "" : " (DRY-RUN)"}\n`);

  let changed = 0;
  let unchanged = 0;
  for (const row of rows) {
    const lang = countryProfile(row.home_country ?? undefined).language;
    const next = profileBuilder(lang)(row);
    if (next === row.profile_draft) { unchanged++; continue; }
    changed++;
    if (changed <= 8) {
      console.log(`#${row.id} ${row.name}`);
      console.log(`  før:  ${row.profile_draft}`);
      console.log(`  nu:   ${next}\n`);
    }
    if (apply) {
      await db.execute("UPDATE athletes SET profile_draft = ? WHERE id = ?", [next, row.id]);
    }
  }

  console.log(`\n${changed} ændret · ${unchanged} uændret${apply ? "" : " — kør med --apply"}`);
}

main();
