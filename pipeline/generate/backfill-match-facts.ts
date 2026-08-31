/**
 * Efterslæb: kampforløb ind i faktaark der blev bygget FØR match-facts.
 *
 * `build-factsheet` rører kun historier med `fact_status IS NULL`, så et
 * faktaark bygget før 30-08-2026 beholder sin gamle form — uden
 * scoringsoversigt. Generatoren skriver videre på dem, og forbedringen når
 * derfor ikke de 26 faktaark der allerede lå klar. Det så man tydeligt i
 * kørslen 30-08 kl. 13:09: kun 5 faktaark var nye, og kun de fik kampdata.
 *
 * Kørslen er DETERMINISTISK: ingen LLM, ingen ny udtrækning. Den læser den
 * kildetekst der allerede er gemt, og henter kun siden hvis teksten ikke
 * bærer oversigten. Kun feltet `match` tilføjes — resten af faktaarket røres
 * ikke, så en menneskelig rettelse i det kan ikke forsvinde.
 *
 *   npx tsx pipeline/generate/backfill-match-facts.ts           # dry-run
 *   npx tsx pipeline/generate/backfill-match-facts.ts --apply
 */
import { createD1Client } from "../lib/d1-client";
import { fetchHtml } from "../discover/extract-story";
import { parseMatchFacts } from "./match-facts";
import { looksLikeMatchStory } from "./box-score";
import type { FactSheet } from "./build-factsheet";

interface Row {
  id: number;
  headline: string | null;
  content_raw: string | null;
  source_url: string | null;
  fact_sheet: string;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();

  const r = await db.query<Row>(
    `SELECT id, headline, content_raw, source_url, fact_sheet
     FROM stories
     WHERE fact_status = 'built' AND fact_sheet IS NOT NULL
       AND discovered_at >= date('now', '-30 days')`,
  );

  let updated = 0, skipped = 0, already = 0;
  for (const row of r.results) {
    let fs: FactSheet;
    try {
      fs = JSON.parse(row.fact_sheet) as FactSheet;
    } catch {
      skipped++;
      continue;
    }
    if (fs.match) { already++; continue; }
    if (!looksLikeMatchStory(fs)) { skipped++; continue; }

    let match = parseMatchFacts(row.content_raw ?? "");
    if (!match.goals.length && row.source_url) {
      const html = await fetchHtml(row.source_url);
      if (html) match = parseMatchFacts(html);
    }
    if (!match.goals.length && !match.teamStats) { skipped++; continue; }

    updated++;
    console.log(
      `#${row.id} ${row.headline?.slice(0, 52) ?? ""} → ${match.goals.length} mål` +
      `${match.teamStats ? `, ${match.teamStats.rows.length} nøgletal` : ""}`,
    );
    if (apply) {
      await db.execute("UPDATE stories SET fact_sheet = ? WHERE id = ?", [
        JSON.stringify({ ...fs, match }),
        row.id,
      ]);
    }
  }

  console.log(
    `\n${updated} faktaark ${apply ? "beriget" : "ville blive beriget"} · ` +
    `${already} havde det i forvejen · ${skipped} uden kampdata`,
  );
}

main();
