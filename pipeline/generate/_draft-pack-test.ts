/**
 * Kilden i gennemgangspakken skal indeholde BEGGE felter.
 *
 * Fælden (2026-08-20): `content_raw ?? summary` betød, at når en Sidearm-side
 * havde en «Upcoming Event»-widget i content_raw, så gennemgangen kun
 * kampprogrammet — mens artiklens egen manchet lå i summary. Kladde #111 blev
 * afvist for at "opdigte" FAU's David Roberts og Felipe Santos, som stod ordret
 * i manchetten. Et falsk «opdigtet» sender en korrekt kladde retur.
 */
import { cleanSource } from "./draft-pack";

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

console.log(`\ndraft-pack: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
