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
import { SPORT_KEYS } from "../../src/lib/sports";
import { sportSlug } from "../../src/lib/i18n";

type Content = { title: string; intro: string; metaDescription: string; pillar: string };

function anchor(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function build(record: Record<string, Content>, lang: "da" | "en", heading: string): string {
  const entries = SPORT_KEYS.map((key) => record[sportSlug(key, lang)]).filter(Boolean) as Content[];
  const lines = [`# ${heading}`, ""];
  lines.push(lang === "da" ? "## Indhold" : "## Contents", "");
  for (const c of entries) lines.push(`- [${c.title}](#${anchor(c.title)})`);
  lines.push("");
  for (const c of entries) {
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
