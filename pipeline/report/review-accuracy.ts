/**
 * Holder kvalitetstjekket op mod Mikkels FAKTISKE beslutninger.
 * ============================================================
 *
 * Spørgsmålet der afgør om badgen er værd at stole på: forudsiger fundene hvad et
 * menneske gjorde med kladden? Det gamle badge (modellens formulerings-skøn)
 * bestod ikke prøven — af 11 afvisninger var 4 ikke flaget høj, og af 5
 * redigerede var 3 flaget høj. Denne rapport laver samme prøve på det mekaniske
 * tjek, og gør det på tre niveauer:
 *
 *  1. GROVT: flagede tjekket kladder der blev redigeret? Og lod det de urørte
 *     være? (Recall og falske alarmer.)
 *  2. PRÆCIST: pegede de enkelte fund på tekst mennesket FAKTISK fjernede? Et
 *     fund hvis påstand står uændret i den udgivne artikel, var støj — mennesket
 *     læste den og lod den stå.
 *  3. SAMMENLIGNING: samme tal for det gamle badge, så forbedringen kan ses frem
 *     for påstås.
 *
 * Datagrundlaget vokser af sig selv: `articles.original_content` bevarer kladden
 * for alt der blev udgivet, og fra migration 044 bevarer `review_log` også de
 * AFVISTE kladders tekst — de vigtigste sager, som hidtil forsvandt med sletningen.
 *
 * Kør:
 *   npx tsx pipeline/report/review-accuracy.ts
 *   npx tsx pipeline/report/review-accuracy.ts --verbose   # fund for fund
 */

import { createD1Client } from "../lib/d1-client";
import { checkDraft, severityOf, type Finding } from "../generate/quality-check";
import { countryProfile } from "../../src/lib/countries";

interface Case {
  article_id: number;
  title: string;
  /** Kladden som modellen skrev den. */
  draft: string;
  /** Den udgivne tekst, eller null hvis kladden blev afvist. */
  final: string | null;
  decision: "approved_as_is" | "edited" | "rejected";
  old_badge: string | null;
  country: string | null;
  fact_sheet: string | null;
  content_raw: string | null;
  summary: string | null;
  headline: string | null;
  preferred_name: string | null;
  athlete_name: string | null;
  gender: string | null;
  class_year: string | null;
  university: string | null;
  hometown: string | null;
}

/** Normalisering til sammenligning: whitespace og små bogstaver. */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

async function load(): Promise<Case[]> {
  const db = createD1Client();

  // A: artikler der stadig findes og har en kladde bevaret.
  const kept = await db.query<Case>(
    `SELECT a.id AS article_id, a.title, a.original_content AS draft, a.content AS final,
            CASE WHEN norm_equal.same = 1 THEN 'approved_as_is' ELSE 'edited' END AS decision,
            (SELECT rl.fabrication_risk FROM review_log rl
              WHERE rl.article_id = a.id ORDER BY rl.id DESC LIMIT 1) AS old_badge,
            a.country, s.fact_sheet, s.content_raw, s.summary, s.headline, ath.preferred_name,
            ath.name AS athlete_name, ath.gender, ath.class_year, ath.university, ath.hometown
     FROM articles a
     LEFT JOIN stories s ON s.id = a.story_id
     LEFT JOIN athletes ath ON ath.id = a.athlete_id
     JOIN (SELECT id, CASE WHEN replace(replace(original_content, char(10), ''), ' ', '')
                             = replace(replace(content, char(10), ''), ' ', '')
                        THEN 1 ELSE 0 END AS same
           FROM articles) norm_equal ON norm_equal.id = a.id
     -- En kladde der stadig ligger i køen er IKKE godkendt uændret; den er
     -- ulæst. Uden dette filter tælles hver ventende kladde som en falsk alarm.
     WHERE a.original_content IS NOT NULL AND a.published = 1`,
  );

  // B: afviste kladder, hvis tekst blev gemt ved sletningen (migration 044).
  const rejected = await db.query<Case>(
    `SELECT rl.article_id, COALESCE(rl.title_snapshot, '') AS title,
            rl.content_snapshot AS draft, NULL AS final,
            'rejected' AS decision, rl.fabrication_risk AS old_badge,
            NULL AS country, s.fact_sheet, s.content_raw, s.summary, s.headline, ath.preferred_name,
            ath.name AS athlete_name, ath.gender, ath.class_year, ath.university, ath.hometown
     FROM review_log rl
     LEFT JOIN stories s ON s.id = rl.story_id
     LEFT JOIN athletes ath ON ath.id = rl.athlete_id
     WHERE rl.decision = 'rejected' AND rl.content_snapshot IS NOT NULL`,
  );

  return [...kept.results, ...rejected.results];
}

function run(c: Case): Finding[] {
  const language = countryProfile(c.country ?? undefined).language === "en" ? "en" : "da";
  return checkDraft({
    title: c.title,
    content: c.draft,
    factSheet: c.fact_sheet,
    sourceText: [c.headline, c.summary, c.content_raw].filter(Boolean).join("\n") || null,
    athlete: c.athlete_name
      ? {
          name: c.athlete_name,
          preferredName: c.preferred_name,
          gender: c.gender,
          classYear: c.class_year,
          university: c.university,
          hometown: c.hometown,
        }
      : null,
    language,
  });
}

/** Fjernede mennesket den påstand fundet pegede på? */
function humanRemoved(f: Finding, c: Case): boolean | null {
  if (c.final === null) return null; // afvist: hele teksten blev fjernet
  const claim = norm(f.claim);
  if (!claim) return null;
  const inDraft = norm(c.draft).includes(claim);
  const inFinal = norm(c.final).includes(claim);
  return inDraft && !inFinal;
}

function pct(a: number, b: number): string {
  return b === 0 ? "—" : `${Math.round((a / b) * 100)}%`;
}

async function main(): Promise<void> {
  const verbose = process.argv.includes("--verbose");
  const cases = await load();

  if (cases.length === 0) {
    console.log("Intet at måle på endnu: ingen kladder med bevaret tekst.");
    return;
  }

  const stats = {
    total: cases.length,
    needed_work: 0,        // edited eller rejected
    clean: 0,              // approved_as_is
    flagged_needed: 0,     // tjekket flagede en der skulle rettes
    flagged_clean: 0,      // falsk alarm
    old_flagged_needed: 0,
    old_flagged_clean: 0,
    findings: 0,
    findings_removed: 0,
    findings_kept: 0,
  };
  const byCategory = new Map<string, { total: number; removed: number }>();

  for (const c of cases) {
    const findings = run(c);
    // Badgen er kun handlingsanvisende når den er RØD. «medium» er en note, og
    // en note er ikke en advarsel — ellers måler vi på et signal ingen reagerer på.
    const flagged = severityOf(findings) === "high";
    const oldHigh = (c.old_badge ?? "") === "high";
    const needed = c.decision !== "approved_as_is";

    if (needed) {
      stats.needed_work++;
      if (flagged) stats.flagged_needed++;
      if (oldHigh) stats.old_flagged_needed++;
    } else {
      stats.clean++;
      if (flagged) stats.flagged_clean++;
      if (oldHigh) stats.old_flagged_clean++;
    }

    for (const f of findings) {
      stats.findings++;
      const removed = humanRemoved(f, c);
      const cat = byCategory.get(f.category) ?? { total: 0, removed: 0 };
      cat.total++;
      if (removed === true) {
        stats.findings_removed++;
        cat.removed++;
      } else if (removed === false) {
        stats.findings_kept++;
      }
      byCategory.set(f.category, cat);
    }

    if (verbose) {
      console.log(
        `#${c.article_id} ${c.decision}${c.decision === "edited" ? "" : "        "} · tjek=${severityOf(findings)} · gammelt badge=${c.old_badge ?? "-"} · ${c.title.slice(0, 55)}`,
      );
      for (const f of findings) {
        const r = humanRemoved(f, c);
        const mark = r === true ? "FJERNET " : r === false ? "beholdt " : "afvist  ";
        console.log(`     ${mark} [${f.category}] ${f.claim.slice(0, 60)}`);
      }
    }
  }

  console.log(`\n═══ Kvalitetstjekket mod menneskets beslutninger (${stats.total} kladder) ═══\n`);
  console.log(`Kladder der skulle rettes eller afvises: ${stats.needed_work}`);
  console.log(`  fanget af det MEKANISKE tjek:  ${stats.flagged_needed}/${stats.needed_work}  (${pct(stats.flagged_needed, stats.needed_work)})`);
  console.log(`  fanget af det GAMLE badge:     ${stats.old_flagged_needed}/${stats.needed_work}  (${pct(stats.old_flagged_needed, stats.needed_work)})`);
  console.log(`\nKladder godkendt uændret: ${stats.clean}`);
  console.log(`  falske alarmer, mekanisk: ${stats.flagged_clean}/${stats.clean}  (${pct(stats.flagged_clean, stats.clean)})`);
  console.log(`  falske alarmer, gammelt:  ${stats.old_flagged_clean}/${stats.clean}  (${pct(stats.old_flagged_clean, stats.clean)})`);

  console.log(`\nFund i alt: ${stats.findings}`);
  console.log(`  pegede på tekst mennesket FJERNEDE: ${stats.findings_removed}  (${pct(stats.findings_removed, stats.findings_removed + stats.findings_kept)} af de målbare)`);
  console.log(`  pegede på tekst mennesket BEHOLDT:  ${stats.findings_kept}`);

  if (byCategory.size > 0) {
    console.log(`\nPr. kategori (fund → hvor mange mennesket fjernede):`);
    for (const [cat, v] of [...byCategory.entries()].sort((a, b) => b[1].total - a[1].total)) {
      console.log(`  ${cat.padEnd(12)} ${String(v.total).padStart(3)} → ${v.removed}`);
    }
  }

  const measurable = stats.findings_removed + stats.findings_kept;
  if (stats.needed_work < 10 || measurable < 10) {
    console.log(
      `\n⚠ Grundlaget er for lille til at konkludere (${stats.needed_work} beslutninger, ` +
        `${measurable} målbare fund). Tallene er retningsgivende, ikke bevis.`,
    );
    console.log(
      `  Afviste kladder gemmes fra migration 044 — de 11 hidtidige afvisninger er væk,` +
        ` og de var de vigtigste sager. Kør rapporten igen efter en måneds sæson.`,
    );
  }
}

if (process.argv[1] && /review-accuracy\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Rapport fejlede:", err);
    process.exit(1);
  });
}
