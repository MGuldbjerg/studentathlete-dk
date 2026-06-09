/**
 * Scorecard: sammenligner faktiske pipeline-resultater pr. fixture mod forventningen
 * og udskriver en pass/fail-tabel. Returnerer false hvis NOGEN fixture fejler.
 */
import type { Fixture } from "./types";

export interface ActualResult {
  linkDetected: string | null;
  finalScore: string | null;
  statLine: string[];
  fabricationRisk: "low" | "medium" | "high";
  /** Den skrevne artikels brødtekst (til numerisk konsistens-tjek). */
  articleText: string;
  /** Faktaark + box-score-blok som tekst — tilladte tal. */
  factText: string;
}

interface Check {
  name: string;
  pass: boolean;
  detail: string;
}

function sortedEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

/** Tal-tokens i artiklen der IKKE optræder i de tilladte fakta (= opdigtede tal). */
export function fabricatedNumbers(articleText: string, factText: string): string[] {
  const nums = articleText.match(/\d+/g) ?? [];
  const allowed = factText.match(/\d+/g) ?? [];
  const allowedSet = new Set(allowed);
  return [...new Set(nums)].filter((n) => !allowedSet.has(n));
}

export function scoreFixture(fixture: Fixture, actual: ActualResult): { pass: boolean; checks: Check[] } {
  const e = fixture.expected;
  const fab = fabricatedNumbers(actual.articleText, actual.factText);
  const expectFabricated = fixture.kind === "contradicting_number";

  const checks: Check[] = [
    {
      name: "link-detektion",
      pass: actual.linkDetected === e.linkDetected,
      detail: `fik ${JSON.stringify(actual.linkDetected)}, forventede ${JSON.stringify(e.linkDetected)}`,
    },
    {
      name: "slutresultat",
      pass: actual.finalScore === e.finalScore,
      detail: `fik ${JSON.stringify(actual.finalScore)}, forventede ${JSON.stringify(e.finalScore)}`,
    },
    {
      name: "box-score-statline",
      pass: sortedEq(actual.statLine, e.statLine),
      detail: `fik ${JSON.stringify(actual.statLine)}, forventede ${JSON.stringify(e.statLine)}`,
    },
    {
      name: "fabrication_risk",
      pass: actual.fabricationRisk === e.fabricationRisk,
      detail: `fik ${actual.fabricationRisk}, forventede ${e.fabricationRisk}`,
    },
    {
      name: "numerisk-konsistens",
      pass: expectFabricated ? fab.length > 0 : fab.length === 0,
      detail: expectFabricated
        ? `forventede ≥1 opdigtet tal (fanges af verify); fandt [${fab.join(", ")}]`
        : `forventede 0 opdigtede tal; fandt [${fab.join(", ")}]`,
    },
  ];

  return { pass: checks.every((c) => c.pass), checks };
}

export function printScorecard(rows: Array<{ fixture: Fixture; result: { pass: boolean; checks: Check[] } }>): boolean {
  let allPass = true;
  console.log("\n══════════════════════ BACKTEST SCORECARD ══════════════════════\n");
  for (const { fixture, result } of rows) {
    const tag = result.pass ? "✓ PASS" : "✗ FAIL";
    console.log(`${tag}  ${fixture.id}  (${fixture.kind})`);
    for (const c of result.checks) {
      const mark = c.pass ? "  ·" : "  ✗";
      // Vis kun detaljer for fejlede checks (mindre støj på grønne kørsler).
      if (!c.pass) console.log(`${mark} ${c.name}: ${c.detail}`);
    }
    if (!result.pass) allPass = false;
  }
  const passed = rows.filter((r) => r.result.pass).length;
  console.log(`\n${passed}/${rows.length} fixtures bestået.`);
  console.log("═════════════════════════════════════════════════════════════════\n");
  return allPass;
}
