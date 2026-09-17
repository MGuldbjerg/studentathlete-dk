/**
 * Skriver D1-synkroniseringen for de danske sportssider ud fra `sport-content.ts`.
 *
 * HVORFOR DEN SKAL GENERERES, IKKE SKRIVES I HÅNDEN. Filen fra 15. september
 * indeholdt teksterne, som de så ud den dag. Da Mikkels korrektur blev
 * indarbejdet 17. september — dobbeltoverskrifter, 52 mod 47, cyklingens datoer
 * — var SQL'en pludselig en ældre udgave af sandheden, og en kørsel ville have
 * udgivet præcis de fejl, korrekturen fandt. Nu kommer SQL'en samme sted fra som
 * siderne selv.
 *
 * Kun `content` og `updated_at` røres. Titel, meta, published, kind og category
 * står urørt, og UK har ingen rækker — dér vinder kode-defaulten, som den skal.
 *
 * Kør:  npx tsx pipeline/report/generate-sport-sql.ts > db/update-sport-pages.sql
 */
import { SPORT_CONTENT } from "../../src/lib/sport-content";
import { SPORT_KEYS } from "../../src/lib/sports";
import { sportSlug } from "../../src/lib/i18n";

/** SQL-streng: apostroffen fordobles, alt andet står som det er. */
function quote(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

const stamp = new Date().toISOString().slice(0, 10);
const out: string[] = [
  `-- Sportssidernes pillar-tekster → D1 (genereret ${stamp}).`,
  "--",
  "-- Genereret af pipeline/report/generate-sport-sql.ts fra src/lib/sport-content.ts.",
  "-- Skriv den ikke i hånden: så kan den nå at blive forældet i forhold til teksterne.",
  "--",
  "-- `resolveSportContent()` læser D1-rækken FØR kode-defaulten, så de danske",
  "-- sider viser det her. UK har ingen rækker og skal ikke have nogen.",
  "--",
  "-- PRODUKTIONSSKRIVNING af læservendt tekst. Kør først når Mikkel har godkendt:",
  "--   npx wrangler d1 execute studentathlete-dk --remote --file db/update-sport-pages.sql",
  "--",
  "-- Tjek før kørsel, at rækkerne ikke er håndredigeret siden sidst — ellers",
  "-- overskriver den her nogens rettelser.",
  "",
];

let n = 0;
for (const key of SPORT_KEYS) {
  const slug = sportSlug(key, "da");
  const content = SPORT_CONTENT[slug];
  if (!content) continue;
  out.push(
    `UPDATE pages SET content = ${quote(content.pillar)},`,
    `       updated_at = datetime('now')`,
    ` WHERE slug = ${quote(slug)} AND country = 'DK' AND kind = 'sport';`,
    "",
  );
  n++;
}
out.push(`-- ${n} sider.`);
console.log(out.join("\n"));
