/**
 * Forældede GODKENDTE profiltekster → opdateret tekst eller godkendelseskøen.
 *
 * Når skabelonen rettes, står de allerede godkendte tekster tilbage med den
 * gamle formulering: ingen kørsel rører `profile_summary`. Efter
 * skolenavn-rettelsen 2026-08-29 gjaldt det 138 profiler, fx «for University
 * of North Carolina i North Carolina som Forward».
 *
 * Mikkel, 2026-10-26: «Rule based for this is fine» — en tekst som skabelonen
 * SELV skrev, må skabelonen også opdatere uden godkendelse. Men en
 * håndredigeret profil må stadig ikke forsvinde fordi en skabelon ændrede sig.
 * Derfor:
 *   · TILFØJER den nye tekst kun ord (holdnavn, by: «University of Charleston»
 *     → «the University of Charleston Golden Eagles») → `profile_summary`
 *     opdateres direkte;
 *   · ændrer eller fjerner den noget → `profile_draft`, hvor admin viser den
 *     nuværende tekst ved siden af (som før). Det fanger både skabelonens
 *     svagere formuleringer («svømmer som butterfly») over for en
 *     godkendt-og-forbedret tekst, og data der har ændret sig (skifte, navne).
 *   Et ord-overlap var ikke nok: de 40 skoler med en anden skoles kaldenavn
 *   (repair-school-collisions.ts) lignede stadig «skabelonens egen tekst».
 * Kun sites lande: et indsamlingsland har ingen side og intet sprog, og
 * skabelonen faldt tilbage til dansk for australske atleter (5 stk., 2026-10-26).
 *
 *   npx tsx pipeline/profiles/queue-stale-profiles.ts           # dry-run
 *   npx tsx pipeline/profiles/queue-stale-profiles.ts --apply
 */
import { createD1Client } from "../lib/d1-client";
import { type BaselineAthlete } from "../../src/lib/profile-baseline";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { countryProfile, siteCountrySql } from "../../src/lib/countries";

const MAX_CHARS = 400;

const COLS =
  "a.id, a.name, a.preferred_name, a.university, a.university_state, a.sport, a.position, " +
  "a.hometown, a.year_enrolled, a.expected_graduation, a.active, a.home_country, " +
  "a.profile_summary, s.common_name AS university_common_name, s.city AS university_city, s.nickname AS university_nickname, a.gender";

const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter(Boolean);

/**
 * Does `next` only ADD to `now`? The words that differ in `now` (between the
 * common start and the common end) must all reappear in `next`'s differing
 * stretch — nothing reworded, nothing removed.
 */
export function onlyAdds(now: string, next: string): boolean {
  const a = words(now), b = words(next);
  let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
  let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  const removed = a.slice(i, a.length - j), added = b.slice(i, b.length - j);
  const pool = [...added];
  for (const w of removed) {
    const k = pool.indexOf(w);
    if (k < 0) return false;
    pool.splice(k, 1);
  }
  // What is left was added. It must carry information — a name or a number
  // (a team, a city, a year) — not just a word of grammar («svømmer SOM
  // butterfly» is the template's weaker wording, not a new fact).
  const original = next.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, ""));
  return pool.some((w) => original.some((o) => o.toLowerCase() === w && /^[\p{Lu}\p{N}]/u.test(o)));
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const r = await db.query<BaselineAthlete & { id: number; profile_summary: string }>(
    `SELECT ${COLS} FROM athletes a
     LEFT JOIN schools s ON s.name = a.university
     WHERE a.active = 1 AND ${siteCountrySql("a.home_country")}
       AND a.profile_summary IS NOT NULL
       AND length(a.profile_summary) <= ?
       -- Ligger der allerede et udkast, er det menneskets tur — ikke vores.
       AND a.profile_draft IS NULL`,
    [MAX_CHARS],
  );

  let updated = 0, queued = 0;
  for (const p of r.results) {
    const lang = countryProfile(p.home_country ?? undefined).language;
    const next = profileBuilder(lang)(p);
    if (next === p.profile_summary) continue;
    const own = onlyAdds(p.profile_summary, next);
    if (own) updated++; else queued++;
    if (updated + queued <= 5) {
      console.log(`#${p.id} ${p.name} → ${own ? "opdateres" : "køen"}`);
      console.log(`  nu:      ${p.profile_summary}`);
      console.log(`  ny:      ${next}\n`);
    }
    if (!apply) continue;
    await db.execute(
      own
        ? "UPDATE athletes SET profile_summary = ?, updated_at = datetime('now') WHERE id = ?"
        : "UPDATE athletes SET profile_draft = ?, profile_draft_at = datetime('now') WHERE id = ?",
      [next, p.id],
    );
  }

  console.log(
    `${updated} profiltekst(er) ${apply ? "opdateret" : "ville blive opdateret"} (tilføjer kun), ` +
    `${queued} ${apply ? "lagt i godkendelseskøen" : "ville komme i køen"} (ændrer eller fjerner noget)` +
    (apply ? "." : " — kør med --apply."),
  );
}

if (/queue-stale-profiles\.ts$/.test(process.argv[1] ?? "")) main();
