/**
 * KVALITETS-FEJEBLAD — finder de fejlklasser der faktisk er sluppet igennem.
 *
 * Baggrund (Mikkel, 2026-08-29): «for the next 5 months I can use you more
 * actively — cron jobs could be a way to regularly fix poor drafts or similar.»
 *
 * Hver kontrol her svarer til en fejl der ER fundet i produktion, ikke til en
 * jeg kunne forestille mig. Det er med vilje: en kontrol uden et virkeligt
 * fund bag sig larmer bare.
 *
 * Kørslen er DETERMINISTISK og SKRIVER INTET — ingen LLM, ingen D1-skrivning.
 * Den rapporterer, og et menneske (eller en efterfølgende --apply-kørsel)
 * afgør hvad der skal ske. Se token-effektivitets-reglen: script før LLM.
 *
 *   npx tsx pipeline/checks/quality-sweep.ts            # rapport
 *   npx tsx pipeline/checks/quality-sweep.ts --json     # maskinlæsbart
 */
import { createD1Client } from "../lib/d1-client";
import { type BaselineAthlete } from "../../src/lib/profile-baseline";
import { profileBuilder } from "../../src/lib/i18n/profile-builders";
import { countryProfile } from "../../src/lib/countries";
import { correctionFromText, looksTransliterated } from "./danish-names";

/** Tæl HELE mængden; eksemplerne hentes med LIMIT, men tallet må ikke være kappet. */
async function countOf(db: ReturnType<typeof createD1Client>, where: string): Promise<number> {
  const r = await db.query<{ n: number }>(`SELECT COUNT(*) n FROM ${where}`);
  return r.results[0]?.n ?? 0;
}

interface Finding {
  /** Kort nøgle til Discord-linjen og til at følge et fund over tid. */
  key: string;
  /** Hvad er galt, i én sætning. */
  what: string;
  count: number;
  /** Op til tre konkrete eksempler — nok til at genkende mønstret. */
  examples: string[];
  /** Hvad man gør ved det. */
  fix: string;
}

const findings: Finding[] = [];

function add(f: Finding): void {
  if (f.count > 0) findings.push(f);
}

async function main(): Promise<void> {
  const db = createD1Client();
  const asJson = process.argv.includes("--json");

  // ── 1. Roster-felter der bærer noget andet end deres kolonne ──────────
  // Sidearm-parserens kolonneforskydning gjorde Freddie Tucker til atleten
  // «Jr.» med højden som position (2026-08-26). Parseren er rettet; det her
  // fanger næste variant.
  const cols = await db.query<{ id: number; name: string; university: string; position: string | null; class_year: string | null }>(
    `SELECT id, name, university, position, class_year FROM athletes
     WHERE active = 1 AND (
       position GLOB '[3-8]-[0-9]*' OR position GLOB '[3-8]''*' OR
       class_year GLOB '[0-9][0-9][0-9]' OR
       trim(name) IN ('Jr.','Sr.','II','III','IV','Jr','Sr') OR length(trim(name)) < 4
     ) LIMIT 40`);
  add({
    key: "roster-kolonner",
    what: "roster-felter bærer noget andet end deres kolonne (højde i position, vægt i årgang, suffiks som navn)",
    count: await countOf(db, "athletes WHERE active = 1 AND (position GLOB '[3-8]-[0-9]*' OR position GLOB '[3-8]''*' OR class_year GLOB '[0-9][0-9][0-9]' OR trim(name) IN ('Jr.','Sr.','II','III','IV','Jr','Sr') OR length(trim(name)) < 4)"),
    examples: cols.results.slice(0, 3).map((r) => `#${r.id} ${r.name} (${r.university}) pos=${r.position} år=${r.class_year}`),
    fix: "tjek skolens roster-tabel — kolonnerne er formentlig forskudt i en parser",
  });

  // ── 2. Navne med dobbelt mellemrum ───────────────────────────────────
  const spaced = await db.query<{ id: number; name: string }>(
    `SELECT id, name FROM athletes WHERE active = 1 AND name LIKE '%  %' LIMIT 40`);
  add({
    key: "navne-mellemrum",
    what: "atletnavne med dobbelt mellemrum — synligt i sidens overskrift",
    count: await countOf(db, "athletes WHERE active = 1 AND name LIKE '%  %'"),
    examples: spaced.results.slice(0, 3).map((r) => `#${r.id} «${r.name}»`),
    fix: "UPDATE athletes SET name = trim(replace(name,'  ',' ')) — bulk-skrivning, kræver Mikkels ord",
  });

  // ── 3. Flere kladder fra ÉN kildeartikel PÅ SAMME SITE ───────────────
  // Grupperingen er (source_url, country) — ikke source_url alene. Samme kamp
  // ER to legitime artikler på .dk og .co.uk: to sprog, to publikum. Kun to
  // kladder på SAMME site er dubletten. `group-stories.ts` (27-08-2026)
  // forhindrer dem fremover; det her fanger efterslæbet og et evt. tilbagefald.
  const dupes = await db.query<{ source_url: string; country: string; n: number; ids: string }>(
    `SELECT s.source_url, a.country, COUNT(*) n, GROUP_CONCAT(a.id) ids
     FROM articles a JOIN stories s ON s.id = a.story_id
     WHERE a.published = 0 GROUP BY s.source_url, a.country HAVING n > 1`);
  add({
    key: "kladde-dubletter",
    what: "flere kladder fra samme kildeartikel PÅ SAMME SITE (to sites er tilladt)",
    count: dupes.results.reduce((sum, r) => sum + r.n, 0),
    examples: dupes.results.slice(0, 3).map((r) => `${r.n} kladder (#${r.ids}) på ${r.country} fra ${r.source_url.slice(0, 60)}`),
    fix: "efterslæb fra før group-stories.ts (27-08) — afvis alle på nær én pr. site",
  });

  // ── 4. Kladder med høj opdigtnings-risiko der bliver liggende ────────
  const risky = await db.query<{ id: number; title: string; created_at: string }>(
    `SELECT id, title, created_at FROM articles
     WHERE published = 0 AND fabrication_risk = 'high'
       AND datetime(created_at, '+3 days') < datetime('now') LIMIT 40`);
  add({
    key: "risiko-kladder",
    what: "kladder markeret «high» opdigtnings-risiko, ældre end tre dage",
    count: await countOf(db, "articles WHERE published = 0 AND fabrication_risk = 'high' AND datetime(created_at, '+3 days') < datetime('now')"),
    examples: risky.results.slice(0, 3).map((r) => `#${r.id} «${r.title.slice(0, 60)}»`),
    fix: "afvis dem — en kilde der ikke bærer artiklen bliver ikke bedre af at vente",
  });

  // ── 5. Titler modellen har afleveret i småt ──────────────────────────
  const lower = await db.query<{ id: number; title: string }>(
    `SELECT id, title FROM articles WHERE published = 0 AND title GLOB '[a-z]*' LIMIT 40`);
  add({
    key: "titler-i-småt",
    what: "kladdetitler der begynder med lille bogstav",
    count: await countOf(db, "articles WHERE published = 0 AND title GLOB '[a-z]*'"),
    examples: lower.results.slice(0, 3).map((r) => `#${r.id} «${r.title.slice(0, 60)}»`),
    fix: "ret titlen — mønstret gentager sig, så overvej en normalisering i parse-output",
  });

  // ── 6. Godkendte profiltekster skabelonen ville skrive anderledes ────
  // Efter en skabelonændring står de gamle tekster med den gamle formulering,
  // fordi ingen kørsel rører godkendt tekst. De skal i køen, ikke overskrives.
  const profCols =
    "a.id, a.name, a.preferred_name, a.university, a.university_state, a.sport, a.position, " +
    "a.hometown, a.year_enrolled, a.expected_graduation, a.active, a.home_country, " +
    "a.profile_summary, s.common_name AS university_common_name, s.city AS university_city, s.nickname AS university_nickname, a.gender";
  const profiles = await db.query<BaselineAthlete & { id: number; profile_summary: string }>(
    `SELECT ${profCols} FROM athletes a LEFT JOIN schools s ON s.name = a.university
     WHERE a.active = 1 AND a.profile_summary IS NOT NULL AND length(a.profile_summary) <= 400`);
  const stale = profiles.results.filter((p) => {
    const lang = countryProfile(p.home_country ?? undefined).language;
    return profileBuilder(lang)(p) !== p.profile_summary;
  });
  add({
    key: "forældede-profiler",
    what: "godkendte profiltekster som den NUVÆRENDE skabelon ville skrive anderledes",
    count: stale.length,
    examples: stale.slice(0, 3).map((p) => `#${p.id} ${p.name}: «${p.profile_summary.slice(0, 70)}…»`),
    fix: "npx tsx pipeline/profiles/queue-stale-profiles.ts --apply → lægger dem i godkendelseskøen",
  });

  // ── 7. Danske navne der har mistet æ/ø/å ─────────────────────────────
  // Amerikanske rosters skriver ASCII, så «Jørgensen» bliver «Jorgensen» —
  // og det navn står i sidens overskrift og i JSON-LD. To tiers: BEVIS (den
  // rigtige stavemåde findes allerede i vores egen tekst) og MØNSTER (led
  // hvor dansk aldrig skriver bart «o»). Se danish-names.ts for hvorfor
  // «aa»/«ae» bevidst ikke er med i mønstret.
  const danes = await db.query<{ id: number; name: string; profile_summary: string | null; profile_draft: string | null }>(
    `SELECT id, name, profile_summary, profile_draft FROM athletes WHERE home_country = 'DK'`);

  const evidence = danes.results
    .map((d) => ({ d, fix: correctionFromText(d.name, d.profile_summary) ?? correctionFromText(d.name, d.profile_draft) }))
    .filter((x) => x.fix);
  add({
    key: "danske-navne-bevis",
    what: "danske navne hvor vores EGEN tekst staver navnet rigtigt, men athletes.name ikke gør",
    count: evidence.length,
    examples: evidence.slice(0, 3).map((x) => `#${x.d.id} «${x.d.name}» → «${x.fix}»`),
    fix: "npx tsx pipeline/profiles/fix-danish-names.ts --apply (retter navnet og sætter name_locked)",
  });

  const pattern = danes.results
    .map((d) => ({ d, hits: looksTransliterated(d.name) }))
    .filter((x) => x.hits.length > 0 && !evidence.some((e) => e.d.id === x.d.id));
  add({
    key: "danske-navne-mønster",
    what: "danske navne med led hvor dansk aldrig skriver bart «o» (Jorgensen, Moller, Ostergaard …)",
    count: pattern.length,
    examples: pattern.slice(0, 3).map((x) => `#${x.d.id} «${x.d.name}» — jf. ${x.hits.join(", ")}`),
    fix: "kræver et menneske: bekræft stavemåden mod skolens bioside, ret i /admin og sæt name_locked",
  });

  // ── Rapport ──────────────────────────────────────────────────────────
  if (asJson) {
    console.log(JSON.stringify({ ran_at: new Date().toISOString(), findings }, null, 2));
  } else if (findings.length === 0) {
    console.log("Kvalitets-fejeblad: intet at rapportere.");
  } else {
    console.log(`Kvalitets-fejeblad — ${findings.length} fund\n`);
    for (const f of findings) {
      console.log(`▸ ${f.key} (${f.count})`);
      console.log(`  ${f.what}`);
      for (const ex of f.examples) console.log(`    · ${ex}`);
      console.log(`  → ${f.fix}\n`);
    }
  }

  // Exit 0 uanset hvad: fund er ikke en FEJL i kørslen, og et rødt kryds i
  // Actions hver dag lærer man at ignorere. Workflowen læser antallet.
  console.log(`SWEEP_FINDINGS=${findings.length}`);
}

main();
