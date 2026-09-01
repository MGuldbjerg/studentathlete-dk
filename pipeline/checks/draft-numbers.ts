/**
 * Mekanisk faktatjek af kladder: TAL og UGEDAG.
 *
 * Baggrund (2026-08-31): kladde #199 skrev at holdet kom bagud «i den 10.
 * minut» og at Banasik scorede «i det 33. minut». Kilden siger 4. og 32.
 * LLM-verifikatoren fangede kun det ene af dem — den er en dommer, ikke en
 * lommeregner, og et tal der LYDER rigtigt slipper forbi.
 *
 * Et tal kan tjekkes uden skøn: står det i faktaarket eller i kilden, eller
 * gør det ikke. Samme med ugedagen: faktaarket har datoen, og en dato har
 * præcis én ugedag. Begge dele hører derfor til her — mekanisk, ikke i en
 * prompt og ikke i en model.
 *
 * Kør:  npx tsx pipeline/checks/draft-numbers.ts [--id N]
 * Skriver ALDRIG. Den rapporterer; rettelsen er et menneskes beslutning.
 */
import { createD1Client } from "../lib/d1-client";
import { numbersIn, digitsFromWords, unsupportedNumbers } from "../generate/fact-numbers";

const WEEKDAYS: Record<string, number> = {
  søndag: 0, mandag: 1, tirsdag: 2, onsdag: 3, torsdag: 4, fredag: 5, lørdag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

const DAY_NAMES_DA = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];

/** Nævner kladden en ugedag der ikke passer til faktaarkets dato? */
export function weekdayMismatch(
  content: string,
  isoDate: string | null,
): { claimed: string; actual: string } | null {
  if (!isoDate) return null;
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const actualIdx = d.getUTCDay();
  const lower = content.toLowerCase();
  for (const [name, idx] of Object.entries(WEEKDAYS)) {
    if (!lower.includes(name)) continue;
    if (idx !== actualIdx) {
      return { claimed: name, actual: DAY_NAMES_DA[actualIdx] };
    }
  }
  return null;
}

interface Row {
  id: number;
  title: string;
  content: string;
  country: string | null;
  fact_sheet: string | null;
  content_raw: string | null;
  profil: string | null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const onlyId = args.includes("--id") ? Number(args[args.indexOf("--id") + 1]) : null;
  const db = createD1Client();

  const rows = await db.query<Row>(
    `SELECT ar.id, ar.title, ar.content, ar.country, s.fact_sheet, s.content_raw,
            (at.class_year || ' ' || COALESCE(at.expected_graduation,'')) AS profil
       FROM articles ar LEFT JOIN stories s ON s.id = ar.story_id
            LEFT JOIN athletes at ON at.id = ar.athlete_id
      WHERE ar.published = 0 ${onlyId ? "AND ar.id = ?" : ""}
      ORDER BY ar.id`,
    onlyId ? [onlyId] : [],
  );

  let flagged = 0;
  for (const r of rows.results ?? []) {
    const haystack = `${r.fact_sheet ?? ""} ${r.content_raw ?? ""} ${r.profil ?? ""}`;
    const bad = unsupportedNumbers(`${r.title} ${r.content ?? ""}`, haystack);

    let eventDate: string | null = null;
    try {
      eventDate = (JSON.parse(r.fact_sheet ?? "{}") as { event?: { date?: string } }).event?.date ?? null;
    } catch {
      /* ulæseligt faktaark er ikke tjekkets problem */
    }
    const day = weekdayMismatch(`${r.title} ${r.content ?? ""}`, eventDate);

    if (bad.length === 0 && !day) continue;
    flagged++;
    console.log(`\n#${r.id} [${r.country}] ${r.title}`);
    if (bad.length) console.log(`   tal uden dækning: ${bad.join(", ")}`);
    if (day) {
      console.log(`   ugedag: kladden siger «${day.claimed}», men ${eventDate} var en ${day.actual}`);
      // Ikke nødvendigvis en fejl: en KOMMENDE kamp har sin egen ugedag. Men
      // er den dag passeret, er sætningen forældet — se forward-looking.ts.
      console.log("           (kan være en kommende kamp — tjek om den dag er passeret)");
    }
  }

  console.log(`\n${(rows.results ?? []).length} kladde(r) tjekket, ${flagged} med fund.`);
}

if (process.argv[1] && process.argv[1].endsWith("draft-numbers.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

// Gen-eksporteres, så testen og andre kaldere har ét sted at hente dem.
export { numbersIn, digitsFromWords, unsupportedNumbers };
