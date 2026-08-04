/**
 * Unit-tests for de læservendte UI-strenge. Kør: npx tsx src/lib/_ui-strings-test.ts
 *
 * Formålet er ikke at kontrollere oversættelsernes ORDVALG (det er en
 * redaktionel vurdering), men at fange de mekaniske fejl der ellers først ses
 * på et live site: en manglende nøgle, en pladsholder der ikke findes i
 * oversættelsen, eller dansk tekst der er sluppet med over i den engelske pakke.
 */
import { LANGUAGES, t } from "./i18n";
import type { UiKey } from "./i18n";
import { getSportContent } from "./sport-content";

let passed = 0;
let failed = 0;

function ok(cond: boolean, label: string): void {
  if (cond) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

const langs = Object.keys(LANGUAGES);
ok(langs.length >= 2, `mindst to sprog registreret (fandt: ${langs.join(", ")})`);

const daKeys = Object.keys(LANGUAGES.da.ui) as UiKey[];

// ── Ingen sprog må mangle en nøgle ───────────────────────────────────────────
for (const lang of langs) {
  const keys = Object.keys(LANGUAGES[lang].ui);
  ok(keys.length === daKeys.length, `${lang}: samme antal nøgler som da (${keys.length} vs ${daKeys.length})`);
  for (const key of daKeys) {
    const value = LANGUAGES[lang].ui[key];
    ok(typeof value === "string" && value.trim().length > 0, `${lang}: "${key}" er udfyldt`);
  }
}

// ── Pladsholdere skal være ens på tværs af sprog ─────────────────────────────
// "Viser {from}–{to} af {total}" må ikke blive til "Showing {from} of {total}":
// den manglende {to} ville stille og roligt forsvinde fra siden.
function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

for (const key of daKeys) {
  const want = placeholders(LANGUAGES.da.ui[key]);
  for (const lang of langs) {
    const got = placeholders(LANGUAGES[lang].ui[key]);
    ok(
      JSON.stringify(got) === JSON.stringify(want),
      `${lang}: "${key}" har pladsholderne [${want}] (fik [${got}])`,
    );
  }
}

// ── Dansk må ikke sive ind i de andre sprog ──────────────────────────────────
// æ/ø/å er den billigste og mest pålidelige detektor for en glemt oversættelse.
for (const lang of langs) {
  if (lang === "da") continue;
  for (const key of daKeys) {
    const value = LANGUAGES[lang].ui[key];
    ok(!/[æøåÆØÅ]/.test(value), `${lang}: "${key}" indeholder ikke æ/ø/å ("${value}")`);
  }
}

// ── t() udfylder faktisk ─────────────────────────────────────────────────────
const showing = t("archive.showing", "en", { from: 1, to: 18, total: 18 });
ok(showing.includes("1") && showing.includes("18"), "t() indsætter værdier");
ok(!showing.includes("{"), `t() efterlader ingen pladsholdere ("${showing}")`);

const daShowing = t("archive.showing", "da", { from: 1, to: 18, total: 18 });
ok(daShowing !== showing, "dansk og engelsk giver forskellig tekst");

// Ukendt sprog må aldrig give en tom side — fald tilbage til standardsproget.
ok(t("home.latest", "xx") === t("home.latest", "da"), "ukendt sprog → standardsprog");
ok(t("home.latest") === t("home.latest", "da"), "intet sprog → standardsprog");

// Manglende variabel skal efterlade pladsholderen synlig frem for "undefined":
// en synlig {n} i UI'et er en fejl man opdager, "undefined" ligner en tekst.
ok(t("band.athletes_count", "en", {}).includes("{n}"), "manglende variabel efterlader {n}");

// ── Sport-pillartekster: én pr. slug, på begge sprog ────────────────────────
// Mangler en, falder sitet tilbage til den ANDEN sprogs tekst (eller ingenting)
// — og det opdages først når nogen åbner /athletics og læser dansk.
for (const lang of langs) {
  const pack = LANGUAGES[lang];
  for (const key of Object.keys(pack.sportSlug) as (keyof typeof pack.sportSlug)[]) {
    const slug = pack.sportSlug[key];
    const content = getSportContent(slug, lang);
    ok(!!content, `${lang}: sport-slug "${slug}" (${String(key)}) har en pillartekst`);
    if (content) {
      ok(content.pillar.trim().length > 200, `${lang}: "${slug}" har reelt indhold`);
      ok(
        lang !== "en" || !/[æøåÆØÅ]/.test(content.title + content.intro + content.pillar),
        `${lang}: "${slug}" indeholder ikke dansk tekst`,
      );
    }
  }
}

console.log(`\nui-strings: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
