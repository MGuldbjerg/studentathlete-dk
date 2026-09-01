/**
 * Mål taltjekket mod menneskets egne rettelser. Offline, deterministisk.
 *
 * Facitlisten er `original_content` (LLM-udkastet) holdt op mod `content`
 * (det Mikkel udgav). Forsvandt et tal undervejs, var det formentlig forkert.
 * Stod det der stadig, blev det accepteret.
 *
 * TO FORBEHOLD, som tallene herunder skal læses med:
 *
 * 1. En redaktør fjerner også tal af andre grunde end fejl — han stryger en
 *    sætning for længdens skyld, eller skriver den om. «Fjernet» er altså et
 *    STØJENDE ja, ikke en dom.
 * 2. Omvendt: et tal han LOD STÅ er et ret rent nej. Derfor er præcisions-
 *    tallet mere troværdigt end recall-tallet, og det er også præcisionen der
 *    betyder mest: en falsk alarm i et faktatjek lærer læseren at ignorere det.
 *
 * Kør:  npx tsx pipeline/backtest/checker-precision.ts [--vis]
 */
import { readFileSync } from "node:fs";
import { numbersIn, unsupportedNumbers } from "../generate/fact-numbers";
import type { CorpusCase } from "./harvest-corpus";

const SNAPSHOT = "pipeline/backtest/snapshots/number-corpus.json";

interface Tally {
  flaggedRemoved: number;
  flaggedKept: number;
  missedRemoved: number;
}

export function scoreCase(c: CorpusCase): {
  flaggedRemoved: string[];
  flaggedKept: string[];
  missedRemoved: string[];
} {
  const allowed = c.allowedNumbers.join(" ");
  const flagged = new Set(unsupportedNumbers(c.original, allowed));
  const inFinal = new Set(numbersIn(c.final));
  const inOriginal = new Set(numbersIn(c.original));

  const flaggedRemoved: string[] = [];
  const flaggedKept: string[] = [];
  for (const n of flagged) {
    if (inFinal.has(n)) flaggedKept.push(n);
    else flaggedRemoved.push(n);
  }

  // Tal mennesket fjernede, som vi IKKE advarede om.
  const missedRemoved: string[] = [];
  for (const n of inOriginal) {
    if (!inFinal.has(n) && !flagged.has(n)) missedRemoved.push(n);
  }
  return { flaggedRemoved, flaggedKept, missedRemoved };
}

function main(): void {
  const show = process.argv.includes("--vis");
  const cases = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as CorpusCase[];
  const edited = cases.filter((c) => c.original !== c.final);

  const t: Tally = { flaggedRemoved: 0, flaggedKept: 0, missedRemoved: 0 };
  const keptExamples: Array<{ id: number; n: string }> = [];

  for (const c of edited) {
    const r = scoreCase(c);
    t.flaggedRemoved += r.flaggedRemoved.length;
    t.flaggedKept += r.flaggedKept.length;
    t.missedRemoved += r.missedRemoved.length;
    for (const n of r.flaggedKept) keptExamples.push({ id: c.articleId, n });
  }

  const flagged = t.flaggedRemoved + t.flaggedKept;
  const precision = flagged ? (t.flaggedRemoved / flagged) * 100 : 0;
  const removed = t.flaggedRemoved + t.missedRemoved;
  const recall = removed ? (t.flaggedRemoved / removed) * 100 : 0;

  console.log(`Korpus: ${cases.length} artikler, ${edited.length} redigeret af et menneske\n`);
  console.log(`  advaret om, og mennesket fjernede det:   ${t.flaggedRemoved}`);
  console.log(`  advaret om, men mennesket lod det stå:   ${t.flaggedKept}   ← falske alarmer`);
  console.log(`  mennesket fjernede, uden at vi advarede: ${t.missedRemoved}`);
  console.log(`\n  præcision ${precision.toFixed(0)} %   recall ${recall.toFixed(0)} % (støjende, se filens hoved)`);

  /**
   * Regressionsspærre. Præcisionen er dét tal der betyder noget: en falsk
   * alarm lærer redaktøren at ignorere advarslerne, og så er tjekket væk.
   * Grænsen er sat UNDER den målte værdi, så normal variation ikke fælder CI
   * — den skal fange et fald, ikke en krusning.
   */
  const MIN_PRECISION = 65;
  if (flagged >= 5 && precision < MIN_PRECISION) {
    console.error(
      `
FEJL: præcisionen faldt til ${precision.toFixed(0)} % (grænse ${MIN_PRECISION} %).`,
    );
    process.exitCode = 1;
  }

  if (show && keptExamples.length) {
    console.log("\nTal vi advarede om, som mennesket beholdt (de dyre fejl):");
    const byId = new Map<number, string[]>();
    for (const e of keptExamples) byId.set(e.id, [...(byId.get(e.id) ?? []), e.n]);
    for (const [id, ns] of [...byId.entries()].slice(0, 15)) {
      console.log(`  #${id}: ${ns.join(", ")}`);
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith("checker-precision.ts")) {
  main();
}
