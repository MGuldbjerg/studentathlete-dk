/**
 * Eksporterer sportssidernes pillar-tekster til markdown-udkast, ét pr. sprog.
 *
 * Udkastene blev første gang lavet i hånden 15. september 2026 og brugt til
 * korrekturlæsning. Da teksterne derefter blev rettet, var der ingen måde at
 * få udkastene med — derfor dette script: kilden er `sport-content.ts` og
 * `sport-content-en.ts`, og filerne kan altid skrives om.
 *
 * Rækkefølgen er SPORT_KEYS', ikke objekternes, så de to sprog står i samme
 * orden og kan læses side om side.
 *
 * Kør:  npx tsx pipeline/report/export-sport-pages.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { SPORT_CONTENT } from "../../src/lib/sport-content";
import { SPORT_CONTENT_EN } from "../../src/lib/sport-content-en";
import { SPORT_KEYS, type SportKey } from "../../src/lib/sports";
import { sportSlug } from "../../src/lib/i18n";

type Content = { title: string; intro: string; metaDescription: string; pillar: string };

/**
 * Ankeret er sidens EGEN slug, ikke noget udledt af overskriften.
 *
 * Den udledte udgave gik galt på dansk: ø og æ er selvstændige bogstaver, ikke
 * o og a med tegn over, så NFD dekomponerer dem ikke — «Svømning» blev til
 * `#sv-mning` og «Fægtning» til `#f-gtning`. Slugsene findes i forvejen og er
 * dem, siderne faktisk ligger på (`svoemning`, `faegtning`), så de bruges.
 */
function anchor(key: SportKey, lang: "da" | "en"): string {
  return sportSlug(key, lang);
}

function build(record: Record<string, Content>, lang: "da" | "en", heading: string): string {
  const entries = SPORT_KEYS.map((key) => [key, record[sportSlug(key, lang)]] as const).filter(
    (pair): pair is readonly [SportKey, Content] => Boolean(pair[1]),
  );
  const lines = [`# ${heading}`, ""];
  lines.push(lang === "da" ? "## Indhold" : "## Contents", "");
  for (const [key, c] of entries) lines.push(`- [${c.title}](#${anchor(key, lang)})`);
  lines.push("");
  for (const [, c] of entries) {
    lines.push(`# ${c.title}`, "");
    lines.push(`*${c.intro}*`, "");
    lines.push(c.pillar.trim(), "");
  }
  return lines.join("\n");
}

// Skriv relativt til arbejdsmappen: `import.meta.dirname` er undefined, når
// tsx oversætter filen til CJS, og scriptet køres fra repo-roden.
const root = resolve(process.cwd());
const files: [string, string][] = [
  ["UDKAST-sportsider-da.md", build(SPORT_CONTENT, "da", "Sportsider — dansk")],
  ["UDKAST-sportsider-en.md", build(SPORT_CONTENT_EN as Record<string, Content>, "en", "Sport pages — English")],
];
for (const [name, body] of files) {
  writeFileSync(resolve(root, name), body);
  console.log(`✓ ${name} — ${body.length} tegn`);
}
