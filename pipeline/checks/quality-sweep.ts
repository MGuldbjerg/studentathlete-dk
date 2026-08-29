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

  // ── 3. Flere kladder fra ÉN kildeartikel ─────────────────────────────
  // matchAthletes udsender én historie pr. (artikel, atlet), så et kampreferat
  // der nævner tre af vores atleter bliver til tre næsten ens artikler — og
  // det er dér opdigtningen opstår (2026-08-26).
  const dupes = await db.query<{ source_url: string; n: number; ids: string }>(
    `SELECT s.source_url, COUNT(*) n, GROUP_CONCAT(a.id) ids
     FROM articles a JOIN stories s ON s.id = a.story_id
     WHERE a.published = 0 GROUP BY s.source_url HAVING n > 1`);
  add({
    key: "kladde-dubletter",
    what: "flere kladder skrevet ud fra SAMME kildeartikel",
    count: dupes.results.reduce((sum, r) => sum + r.n, 0),
    examples: dupes.results.slice(0, 3).map((r) => `${r.n} kladder (#${r.ids}) fra ${r.source_url.slice(0, 70)}`),
    fix: "vælg én kladde pr. kilde og afvis resten — eller byg dedupe i generate-articles",
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
    "a.profile_summary, s.common_name AS university_common_name, s.city AS university_city";
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
