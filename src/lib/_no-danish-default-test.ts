/**
 * VAGTHUND: dansk må aldrig være et fallback i læservendt kode.
 * ===========================================================================
 *
 * Tre gange i træk var fejlen den samme form — ikke den samme fil:
 *
 *   2026-08-21  britiske artikler på /fodbold/… (`getArticleUrl` uden sprog)
 *   2026-08-21  «FODBOLD» og «19. august 2026» på britiske delekort
 *   2026-08-21  `inLanguage: "da"`, `nationality: Denmark`, .dk-URL'er i JSON-LD
 *
 * Fælles årsag: et VALGFRIT sprog med dansk som stiltiende standard. Koden
 * kompilerede, siden så rigtig ud på .dk, og fejlen viste sig kun på det andet
 * site — tit et sted et menneske ikke kigger (sitemap, JSON-LD, delekort).
 *
 * Testen håndhæver to regler mekanisk:
 *   1. Læservendte opslag må ikke have `lang?` — et glemt sprog skal være en
 *      TYPEFEJL, ikke en dansk streng.
 *   2. Ingen hardkodet dansk locale/sprogkode/nationalitet uden for
 *      sprogpakkerne og landeprofilerne.
 *
 * Kør: npx tsx src/lib/_no-danish-default-test.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;

function ok(label: string, condition: boolean, detail = ""): void {
  if (condition) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

/**
 * Kommentarer er ikke kode. Uden det her fejler testen på sine egne
 * forklaringer — «her stod `inLanguage: "da"`» er dokumentation af en RETTET
 * fejl, ikke fejlen selv.
 */
function code(rel: string): string {
  return read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    if (statSync(path.join(ROOT, rel)).isDirectory()) walk(rel, out);
    else if (/\.tsx?$/.test(entry)) out.push(rel);
  }
  return out;
}

// ── 1. Ingen valgfri sprogparameter i læservendte opslag ────────────────────
// Filerne her leverer tekst, adresser og datoer til læseren. Har de et
// valgfrit sprog, kan en ny kaldeplads glemme det og få dansk gratis.
const READER_FACING = [
  "src/lib/i18n/index.ts",
  "src/lib/seo.ts",
  "src/lib/types.ts",
  "src/lib/sport-content.ts",
  "src/lib/viden-content.ts",
  "src/lib/og-card.ts",
  "src/lib/analytics.ts",
];

for (const file of READER_FACING) {
  const src = code(file);
  const offenders = [...src.matchAll(/^\s*(?:export function \w+\([^)]*|.*)\blang\?\s*:/gm)].map(
    (m) => m[0].trim().slice(0, 80),
  );
  ok(
    `${file}: intet valgfrit \`lang?\``,
    offenders.length === 0,
    offenders.join("\n      "),
  );
}

// `languagePack()` er den ENE tilladte undtagelse: den ER opslaget der kender
// standarden, og alle andre går gennem den.
ok(
  "languagePack beholder sin standard (den er selve fallbacket)",
  /export function languagePack\(code: string = DEFAULT_LANGUAGE\)/.test(read("src/lib/i18n/index.ts")),
);

// ── 2. Ingen hardkodet dansk uden for sprogpakker og landeprofiler ─────────
const ALLOWED = [
  "src/lib/i18n/",           // sprogpakkerne ER dansk (og engelsk)
  "src/lib/countries/",      // landeprofilerne navngiver deres eget land
  "/admin/",                 // redaktionens flade, dansk med vilje (ADMIN_LANG)
  "src/lib/sport-content.ts", // pillartekst: dansk tabel + engelsk tabel side om side
  "src/lib/viden-content.ts", // guider: samme opdeling
  "src/lib/mock-data.ts",     // fixtures til udvikling, ikke læservendt
  "src/app/_spil-i-usa/",     // dansk landingsside, svarer 404 på andre sites
  "-test.ts",
  "_test.ts",
];

const BANNED: Array<{ pattern: RegExp; why: string }> = [
  { pattern: /["']da-DK["']/, why: "dansk locale hardkodet — brug languagePack(lang).locale" },
  { pattern: /inLanguage:\s*["']da["']/, why: "JSON-LD låst til dansk — brug sitets sprog" },
  { pattern: /name:\s*["']Denmark["']/, why: "nationalitet hardkodet — brug site.nationalityName" },
  { pattern: /["']dansk["']/, why: "«dansk» som nøgleord/tag — brug sitets landekode" },
];

const files = [...walk("src/lib"), ...walk("src/components"), ...walk("src/app")].filter(
  (f) => !ALLOWED.some((a) => f.includes(a)),
);

for (const { pattern, why } of BANNED) {
  const hits = files.filter((f) => pattern.test(code(f)));
  ok(`ingen ${pattern.source} i læservendt kode (${why})`, hits.length === 0, hits.join(", "));
}

// ── 3. Brandet må ikke stå som streng i motoren ────────────────────────────
// "StudentAthlete.dk" i en delt komponent er standardsitets navn på det andet
// sites side. Undtaget: alt-tekst på logofilen og OG-routens sidste fallback.
const brandHits = files.filter((f) => {
  const src = code(f);
  return /StudentAthlete\.dk/.test(src) && !/alt=|logo|searchParams\.get/.test(src);
});
ok("brandet kommer fra landeprofilen, ikke fra en streng", brandHits.length === 0, brandHits.join(", "));

console.log(`\nno-danish-default: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
