/**
 * Mål rolletjekket mod hele arkivet. Kræver D1 — derfor ikke i CI.
 * =================================================================
 *
 * To spørgsmål, ét svar hver:
 *
 *   RECALL     Fyrer tjekket på de udkast (`articles.original_content`) hvor
 *              vi VED der var en fejl?
 *   PRÆCISION  Er det tavst på den tekst mennesket faktisk udgav
 *              (`articles.content`)? Hvert fund her er en falsk alarm — og en
 *              falsk alarm lærer redaktøren at ignorere listen.
 *
 * Præcisionen er den vigtige af de to. Rolletjekket sætter badgen alene (det
 * står i `PRECISE` i quality-check.ts), og den plads er kun fortjent så længe
 * tallet nedenfor er nul.
 *
 * Kørt 2026-09-08, 79 artikler med bevaret kilde:
 *   8 fund i udkast (6 sæsonpremierer, 1 rekord-som-score, 1 forkert
 *   ligaplacering) · 0 fund i udgivet tekst.
 *
 * Kør:  npx tsx pipeline/backtest/role-precision.ts [--vis]
 */
import { createD1Client } from "../lib/d1-client";
import { numberRoleFindings } from "../generate/number-roles";

interface Row {
  id: number;
  title: string;
  content: string;
  original_content: string | null;
  fact_sheet: string | null;
  content_raw: string | null;
  summary: string | null;
  headline: string | null;
  athlete_name: string | null;
  preferred_name: string | null;
}

async function main(): Promise<void> {
  const show = process.argv.includes("--vis");
  const db = createD1Client();
  const rows = (
    await db.query<Row>(
      `SELECT a.id, a.title, a.content, a.original_content,
              s.fact_sheet, s.content_raw, s.summary, s.headline,
              ath.name AS athlete_name, ath.preferred_name
         FROM articles a
         JOIN stories s ON s.id = a.story_id
         LEFT JOIN athletes ath ON ath.id = a.athlete_id
        WHERE s.content_raw IS NOT NULL
        ORDER BY a.id`,
    )
  ).results;

  let drafts = 0;
  let draftHits = 0;
  let publishedHits = 0;
  const kinds = new Map<string, number>();

  for (const r of rows) {
    const base = {
      title: r.title,
      factSheet: r.fact_sheet,
      sourceText: [r.headline, r.summary, r.content_raw].filter(Boolean).join("\n") || null,
      athleteNames: [r.athlete_name, r.preferred_name],
    };

    if (r.original_content) {
      drafts++;
      const found = numberRoleFindings({ ...base, content: r.original_content });
      if (found.length) draftHits++;
      for (const f of found) {
        kinds.set(f.kind, (kinds.get(f.kind) ?? 0) + 1);
        if (show) console.log(`udkast   #${r.id} [${f.kind}] ${f.claim}\n     ${f.why}`);
      }
    }

    const onPublished = numberRoleFindings({ ...base, content: r.content });
    if (onPublished.length) {
      publishedHits++;
      // Vises ALTID: en falsk alarm er hele pointen med at køre den her.
      for (const f of onPublished) console.log(`UDGIVET  #${r.id} [${f.kind}] ${f.claim}\n     ${f.why}`);
    }
  }

  console.log(`\n${rows.length} artikler med kilde · ${drafts} med bevaret udkast`);
  console.log(`  udkast med fund:   ${draftHits}`);
  console.log(`  UDGIVNE med fund:  ${publishedHits}   ← falske alarmer`);
  console.log(`  fund pr. type:     ${JSON.stringify(Object.fromEntries(kinds))}`);
  if (publishedHits > 0) {
    console.log("\n! Rolletjekket fyrer på godkendt tekst. Stram reglen, eller tag");
    console.log("  «roles» ud af PRECISE i quality-check.ts — badgen må ikke blive støj.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
