/**
 * Mål «anden mening» BAGUD.
 *
 * Mikkel, 2026-08-31: «Can't you test backwards?» — jo. Jeg havde skrevet at
 * flaget var umåleligt, fordi korpusset kun har ÉN kladde pr. historie. Men
 * den manglende kladde kan jo bare skrives NU: faktaarkene ligger der, og
 * facitlisten (mennesket rettede / lod stå) ligger der også.
 *
 * For hver historisk artikel: lad en anden model skrive sit eget udkast ud fra
 * SAMME faktaark, sammenlign tallene med det oprindelige udkast, og se om de
 * tal uenigheden peger på er dem mennesket rettede.
 *
 * FORBEHOLD, som tallene skal læses med:
 * · Udkast B skrives i dag, med dagens modeller. Udkast A blev skrevet dengang.
 * · Prompten er en tilnærmelse af produktionens, ikke den nøjagtige.
 * Begge dele trækker i retning af MERE uenighed end i produktion, så tallet
 * her er et konservativt skøn — den ægte præcision er næppe lavere.
 *
 * Kør:  npx tsx pipeline/backtest/second-opinion-backtest.ts [--limit N]
 */
import { readFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { ProviderChain } from "../lib/llm/provider-chain";
import { numbersIn, unsupportedNumbers, unstableNumbers } from "../generate/fact-numbers";
import type { CorpusCase } from "./harvest-corpus";

const SNAPSHOT = "pipeline/backtest/snapshots/number-corpus.json";

function promptFor(c: CorpusCase): string {
  const da = c.country !== "UK";
  const head = da
    ? `Skriv en kort sportsartikel på dansk om ${c.athleteName ?? "atleten"} (${c.sport ?? "sport"}).`
    : `Write a short sports article in English about ${c.athleteName ?? "the athlete"} (${c.sport ?? "sport"}).`;
  const rule = da
    ? "Brug KUN oplysninger fra faktaarket. Opfind ingen tal."
    : "Use ONLY information from the fact sheet. Invent no numbers.";
  return [head, rule, "", "FAKTAARK:", c.factSheetText].join(String.fromCharCode(10));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : 0;

  const all = JSON.parse(readFileSync(SNAPSHOT, "utf8")) as CorpusCase[];
  let cases = all.filter((c) => c.original !== c.final && c.factSheetText.length > 40);
  if (limit > 0) cases = cases.slice(0, limit);

  const chain = new ProviderChain(createD1Client());
  console.log(`Måler «anden mening» mod ${cases.length} dømte artikler...\n`);

  let flaggedRemoved = 0;
  let flaggedKept = 0;
  let skipped = 0;
  const examples: string[] = [];

  for (const c of cases) {
    let second: string;
    try {
      const res = await chain.generate({
        system: "Du skriver korte, faktuelle sportsartikler.",
        prompt: promptFor(c),
        max_tokens: 1200,
      });
      second = res.text ?? "";
    } catch {
      skipped++;
      continue;
    }
    if (second.length < 80) {
      skipped++;
      continue;
    }

    const supported = new Set(c.allowedNumbers);
    // Samme regel som produktionen: kun tal MED dækning sammenlignes.
    const unsup = new Set(unsupportedNumbers(c.original, c.allowedNumbers.join(" ")));
    const flagged = unstableNumbers(c.original, second).filter(
      (n) => !unsup.has(n) && supported.has(n),
    );

    const inFinal = new Set(numbersIn(c.final));
    for (const n of flagged) {
      if (inFinal.has(n)) {
        flaggedKept++;
        if (examples.length < 10) examples.push(`  #${c.articleId}: ${n} (beholdt)`);
      } else {
        flaggedRemoved++;
      }
    }
    process.stdout.write(".");
  }

  const total = flaggedRemoved + flaggedKept;
  const precision = total ? (flaggedRemoved / total) * 100 : 0;
  console.log(`\n\n${cases.length - skipped} artikler målt (${skipped} sprunget over)`);
  console.log(`  uenighed, og mennesket fjernede tallet: ${flaggedRemoved}`);
  console.log(`  uenighed, men mennesket lod det stå:    ${flaggedKept}`);
  console.log(`\n  præcision for «anden mening»: ${precision.toFixed(0)} % (n=${total})`);
  if (examples.length) {
    console.log("\nEksempler på uenighed mennesket ikke gav os ret i:");
    for (const e of examples) console.log(e);
  }
}

if (process.argv[1] && process.argv[1].endsWith("second-opinion-backtest.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
