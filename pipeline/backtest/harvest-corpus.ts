/**
 * Høst et målekorpus fra de artikler et menneske allerede har gennemgået.
 *
 * IDÉEN: Mikkels rettelser ER facitlisten. Ændrede han et tal før udgivelse,
 * var tallet forkert. Lod han det stå, var det acceptabelt. 49 af 59 artikler
 * er redigeret i hånden — det er hundredvis af gratis dømte tilfælde, som
 * ellers bare ligger i basen.
 *
 * Det gør det muligt at måle et TJEK i stedet for at diskutere det: fanger
 * taltjekket dét mennesket rettede (recall), og lader det være dét mennesket
 * accepterede (præcision)?
 *
 * Vi gemmer IKKE kilde-HTML — kun de TAL kilden dækker, plus de to
 * artikelversioner. Snapshottet bliver lille nok til git og kan køres offline.
 *
 * Kør:  npx tsx pipeline/backtest/harvest-corpus.ts
 * → pipeline/backtest/snapshots/number-corpus.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { numbersIn, digitsFromWords } from "../generate/fact-numbers";
import { renderFactSheet, type FactSheet } from "../generate/build-factsheet";

export interface CorpusCase {
  articleId: number;
  country: string | null;
  title: string;
  /** LLM-udkastet, før mennesket rørte det. */
  original: string;
  /** Den udgivne tekst. */
  final: string;
  /** Tal der er dækning for (faktaark + kilde + profil), inkl. skrevne tal. */
  allowedNumbers: string[];
  /** Faktaarkets begivenhedsdato, til ugedagstjekket. */
  eventDate: string | null;
  /** Faktaarket som tekst — så en ANDEN model kan skrive sit eget udkast af
   *  samme historie, og uenigheden kan måles bagud. */
  factSheetText: string;
  athleteName: string | null;
  sport: string | null;
}

interface Row {
  id: number;
  country: string | null;
  title: string;
  content: string;
  original_content: string;
  fact_sheet: string | null;
  content_raw: string | null;
  class_year: string | null;
  athlete_name: string | null;
  sport: string | null;
  expected_graduation: string | null;
}

/** Faktaarket som læsbar tekst — samme gengivelse skrivefasen fik. */
function renderSheet(raw: string | null): string {
  if (!raw) return "";
  try {
    return renderFactSheet(JSON.parse(raw) as FactSheet);
  } catch {
    return raw;
  }
}

async function main(): Promise<void> {
  const db = createD1Client();
  const rows = await db.query<Row>(
    `SELECT ar.id, ar.country, ar.title, ar.content, ar.original_content,
            s.fact_sheet, s.content_raw, at.class_year, at.expected_graduation,
            at.name AS athlete_name, at.sport
       FROM articles ar
       LEFT JOIN stories s ON s.id = ar.story_id
       LEFT JOIN athletes at ON at.id = ar.athlete_id
      WHERE ar.original_content IS NOT NULL
        AND ar.content IS NOT NULL
        AND s.fact_sheet IS NOT NULL
      ORDER BY ar.id`,
  );

  const cases: CorpusCase[] = [];
  for (const r of rows.results ?? []) {
    const factText = [
      r.fact_sheet ?? "",
      r.content_raw ?? "",
      String(r.class_year ?? ""),
      String(r.expected_graduation ?? ""),
    ].join(" ");
    const allowed = new Set(numbersIn(factText));
    for (const d of digitsFromWords(factText)) allowed.add(d);

    let eventDate: string | null = null;
    try {
      eventDate = (JSON.parse(r.fact_sheet ?? "{}") as { event?: { date?: string } }).event?.date ?? null;
    } catch {
      /* ulæseligt faktaark */
    }

    cases.push({
      articleId: r.id,
      country: r.country,
      title: r.title,
      original: r.original_content,
      final: r.content,
      allowedNumbers: [...allowed].sort(),
      eventDate,
      factSheetText: renderSheet(r.fact_sheet),
      athleteName: r.athlete_name,
      sport: r.sport,
    });
  }

  mkdirSync("pipeline/backtest/snapshots", { recursive: true });
  const out = "pipeline/backtest/snapshots/number-corpus.json";
  writeFileSync(out, JSON.stringify(cases, null, 1), "utf8");

  const edited = cases.filter((c) => c.original !== c.final).length;
  console.log(`${cases.length} sager skrevet til ${out}`);
  console.log(`  ${edited} af dem er redigeret af et menneske (= dømte tilfælde)`);
  console.log(`  ${cases.filter((c) => c.eventDate).length} har en begivenhedsdato`);
}

if (process.argv[1] && process.argv[1].endsWith("harvest-corpus.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
