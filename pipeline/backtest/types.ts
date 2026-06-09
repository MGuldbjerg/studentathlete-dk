/**
 * Backtest-typer for box-score + to-fase-pipelinen.
 *
 * Designindsigt: box-score- og to-fase-KVALITET afhænger af KILDE-indhold (recap-tekst
 * + box-score-side), ikke af systemuret. Harnessen kalder derfor de rigtige funktioner
 * direkte på fixtures og omgår SQL-recency-gaten helt. `enrichFactSheetWithBoxScore`
 * tager injicerede deps — det er replay-sømmen.
 */

export type FixtureKind =
  | "normal" // recap m. box-score-link + atlet på siden → stats flettes, low risk
  | "no_boxscore_link" // recap uden box-score-link → berigelse skipper, ingen opdigtede tal
  | "athlete_absent" // box score findes men atleten står ikke på siden → ingen tal
  | "contradicting_number"; // artiklen påstår et tal der modsiger box scoren → high

export interface FixtureExpectation {
  /** Forventet findBoxScoreUrl(recapHtml, sourceUrl) — link-detektion (uafhængig af merge). */
  linkDetected: string | null;
  /** Forventet factSheet.result.final_score EFTER box-score-berigelse. */
  finalScore: string | null;
  /** Forventede box-score-tilflettede stats (source:"boxscore") EFTER berigelse. */
  statLine: string[];
  /** Forventet verifikations-verdict for den skrevne artikel. */
  fabricationRisk: "low" | "medium" | "high";
}

/** Scriptede LLM-svar pr. fase — StubChain returnerer disse deterministisk (offline). */
export interface FixtureLLMResponses {
  /** JSON-streng som fase-1-faktaark-udtrækket returnerer. */
  factsheet: string;
  /** JSON-streng som box-score-udtrækket returnerer (default: found=false). */
  boxScore?: string;
  /** Markdown-artikel som skrivefasen returnerer (# titel / > ingress / brødtekst). */
  article: string;
  /** JSON som fase-3-verifikationen returnerer. */
  verify: string;
}

export interface Fixture {
  id: string;
  kind: FixtureKind;
  athleteName: string;
  sport: string;
  university: string;
  hometown: string | null;
  sourceUrl: string;
  /** Inline HTML af recap-siden (links bevaret — som plain fetch ville give). */
  recapHtml: string;
  /** Inline HTML af (renderet) box-score-side. */
  boxScoreHtml: string;
  llm: FixtureLLMResponses;
  expected: FixtureExpectation;
}
