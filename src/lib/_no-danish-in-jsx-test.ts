/**
 * Spærre mod DANSK TEKST hardkodet i læservendte komponenter.
 * Kør: npx tsx src/lib/_no-danish-in-jsx-test.ts
 *
 * `_no-danish-default-test.ts` fanger et valgfrit `lang` og hardkodet `da-DK`.
 * Den fangede IKKE en dansk streng skrevet direkte ind i JSX — og tre sådanne
 * lå på hver eneste britiske artikel fra .co.uk gik live 5. august 2026:
 * «Kilde» i SourceBox, «Sæson {season}» i SeasonUpdateTemplate og
 * «Sådan bruger vi Ai» i AiDisclaimer.
 *
 * Reglen: tekst der RENDRES skal komme fra sprogpakken. Admin er dansk med
 * vilje (én bruger) og er derfor undtaget — samme grænse som ADMIN_LANG.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let passed = 0;
let failed = 0;

/**
 * Admin er dansk med vilje (én bruger, ADMIN_LANG). Mapper med `_` foran er
 * Next.js-private og rutes ikke — `_spil-i-usa` er den parkerede lead-side,
 * som ingen læser kan nå. Alt andet er læservendt.
 */
const EXEMPT = [
  "src/app/admin/",
  "src/components/admin/",
  "src/components/AdminEditButton",
  "/_", // Next.js-private mapper (fx src/app/_spil-i-usa)
];

/**
 * ⚠️ Spærren er en NEDRE grænse, ikke et bevis. Den leder efter æ/ø/å, så
 * dansk uden de bogstaver slipper igennem — «Noget gik galt» stod lige ved
 * siden af «Prøv igen» og blev ikke fanget. Fald ikke i søvn på et grønt
 * resultat; den fanger klassen, ikke hvert enkelt tilfælde.
 */

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Fjern kommentarer og import-linjer — dér er dansk helt i orden. */
function stripNonRendered(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ")
    .replace(/^\s*import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, " ");
}

/**
 * Tekstknuder i JSX: det der står mellem `>` og `<`. Vi leder efter æ/ø/å,
 * som ikke findes i engelsk — den billigste pålidelige markør for dansk.
 */
function danishTextNodes(src: string): string[] {
  const hits: string[] = [];
  for (const m of stripNonRendered(src).matchAll(/>([^<>{}]{2,})</g)) {
    const text = m[1].trim();
    if (/[æøåÆØÅ]/.test(text)) hits.push(text);
  }
  return hits;
}

const files = walk("src").filter((f) => !EXEMPT.some((e) => f.includes(e)));
const offenders: Array<[string, string[]]> = [];

for (const f of files) {
  const hits = danishTextNodes(readFileSync(f, "utf8"));
  if (hits.length) offenders.push([f, hits]);
}

if (offenders.length === 0) {
  passed++;
} else {
  failed++;
  console.error("  ✗ dansk tekst hardkodet i læservendt JSX:");
  for (const [f, hits] of offenders) {
    for (const h of hits) console.error(`      ${f}: "${h}"`);
  }
  console.error("    Flyt strengen til sprogpakken og hent den med t(nøgle, lang).");
}

console.log(`\nno-danish-in-jsx: ${passed} bestået, ${failed} fejlet (${files.length} filer skannet).`);
process.exit(failed > 0 ? 1 : 0);
