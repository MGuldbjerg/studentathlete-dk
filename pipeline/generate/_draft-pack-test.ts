/**
 * Kilden i gennemgangspakken skal indeholde BEGGE felter.
 *
 * Fælden (2026-08-20): `content_raw ?? summary` betød, at når en Sidearm-side
 * havde en «Upcoming Event»-widget i content_raw, så gennemgangen kun
 * kampprogrammet — mens artiklens egen manchet lå i summary. Kladde #111 blev
 * afvist for at "opdigte" FAU's David Roberts og Felipe Santos, som stod ordret
 * i manchetten. Et falsk «opdigtet» sender en korrekt kladde retur.
 */
import { cleanSource, dossier, type DossierRow } from "./draft-dossier";

let passed = 0;
let failed = 0;

function ok(cond: boolean, name: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

const manchet =
  '<img alt="Mikkelsen" src="x.jpg" /><br /><br />BOCA RATON, Fla. – Florida Atlantic senior goalkeeper ' +
  "Alfred Mikkelsen has been named the American Conference Preseason Goalkeeper of the Year. Mikkelsen, " +
  "junior defender David Roberts, and senior midfielder Felipe Santos were also named to the team.";
const widget = "Upcoming Event: Men's Soccer at Mercer on August 20, 2026 at 7 p.m.August 207 p.m.";

const both = cleanSource(widget, manchet);
ok(both.includes("David Roberts"), "manchetten er med, selv når content_raw findes");
ok(both.includes("Mercer"), "sidens egen tekst er stadig med");
ok(!both.includes("<img"), "html-rester fra feedet er strippet");

ok(cleanSource(null, manchet).includes("Felipe Santos"), "kun manchet: teksten kommer med");
ok(cleanSource(widget, null).includes("Mercer"), "kun sidetekst: teksten kommer med");
ok(cleanSource(null, null) === "", "ingen kilde giver tom streng");

// Er manchetten allerede i sidens tekst, skal den ikke stå to gange.
const helSide = `${manchet.replace(/<[^>]+>/g, " ")}\nmere brødtekst`;
const uddrag = cleanSource(helSide, manchet);
ok(uddrag.indexOf("David Roberts") === uddrag.lastIndexOf("David Roberts"), "manchetten gentages ikke");

// ── Companion athletes (migration 058, 2026-09-28) ──
// #409: Carter Ford's "London" was judged invented because the pack only showed
// the primary athlete. A single-athlete pack must not change by one byte.
const base: DossierRow = {
  id: 409, title: "t", content: "c", country: "UK", article_type: "game_recap",
  source_url: "https://x", fact_sheet: null, content_raw: "src", summary: null,
  athlete_name: "Jersey Lopez", gender: "m", class_year: "Jr.", expected_graduation: 2028,
  sport: "soccer", position: "Midfielder", university: "Kentucky Wesleyan College",
  hometown: "Wolverhampton, England", previous_school: null,
};
const solo = dossier(base);
ok(dossier({ ...base, companions: "[]" }) === solo, "no companions: pack unchanged");
ok(dossier({ ...base, companions: null }) === solo, "companions NULL: pack unchanged");
ok(dossier({ ...base, companions: "not json" }) === solo, "broken companions JSON: pack unchanged");
const duo = dossier({ ...base, companions: JSON.stringify([{ name: "Carter Ford", hometown: "London, England", class_year: "Fr." }]) });
ok(duo.includes("### Carter Ford") && duo.includes("| Hjemby | London, England |"), "companion's hometown is in the pack");
ok(duo.indexOf("Carter Ford") < duo.indexOf("## Kilden"), "companions come before the source, like the primary athlete");
ok(duo.replace(/\n## Flere atleter[\s\S]*?(?=\n## Kilden)/, "") === solo, "the rest of the pack is unchanged");

console.log(`\ndraft-pack: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
