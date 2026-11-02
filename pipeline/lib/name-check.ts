/**
 * Nordic name check — the pure part. The runner is pipeline/checks/name-check.ts.
 * ===============================================================================
 *
 * Mikkel, 2026-11-02: Sofia «Thogersen» was Thøgersen; a card with the wrong
 * spelling had already gone out. US rosters drop ø/æ/å and the scraper copies
 * it. A plain «o» for ø can't be found by a rule («Nordgard» could be Nordgård
 * or Nordgaard), so a model proposes the Nordic spelling and this file keeps it
 * honest: a suggestion only counts when it is the SAME name with Nordic letters
 * put back — never a different name — and the result goes to Mikkel, never into
 * the record by itself.
 */

/** home_country values whose names carry ø/æ/å/ä/ö. */
export const NORDIC = ["DK", "NO", "SE", "FI", "IS"];

const NORDIC_LETTERS = /[øæåäöØÆÅÄÖ]/;
const NON_ASCII = /[^\x00-\x7f]/;

export const hasDiacritics = (name: string) => NON_ASCII.test(name);

/** A name reduced to what survives the roster's folding: «Thøgersen», «Thogersen» and «Thoegersen» all give «thogersen». */
export function skeleton(name: string): string {
  return name
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[øö]/g, "o")
    .replace(/[æåä]/g, "a")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/oe/g, "o")
    .replace(/ae/g, "a")
    .replace(/aa/g, "a")
    .replace(/[^a-z0-9 ]/g, "");
}

/** A suggestion is accepted only if it is the same name with Nordic letters restored. */
export function validSuggestion(original: string, suggested: unknown): suggested is string {
  if (typeof suggested !== "string") return false;
  const s = suggested.trim();
  if (!s || s === original) return false;
  if (!NORDIC_LETTERS.test(s)) return false; // this check only restores Nordic letters
  if (s.split(/\s+/).length !== original.split(/\s+/).length) return false;
  return skeleton(s) === skeleton(original);
}

export interface Candidate { id: number; name: string; country: string; school: string; sport: string }
export interface Verdict { id: number; suggested: string | null; confidence: "high" | "medium" | "low" }

export function buildPrompt(rows: Candidate[]): string {
  return [
    "American college rosters often drop the Nordic letters ø, æ, å, ä, ö from athletes' names (Thøgersen is printed «Thogersen»).",
    "For each athlete below, decide whether the name as printed is a Nordic name whose correct spelling uses such letters.",
    "",
    "Rules:",
    "- Only suggest a spelling you are confident is the standard Nordic spelling of THAT name. Never guess, never change anything else about the name.",
    "- If the printed form is already a correct spelling (Hansen, Nielsen, Dahl, Moe, Paaske), suggested is null.",
    "- Keep every part of the name; only put the Nordic letters back.",
    `- confidence: "high" when you know this spelling, "medium" when likely, "low" when unsure (low is treated as no suggestion).`,
    "",
    'Answer with ONLY a JSON array, one object per athlete: [{"id": 1, "suggested": "Sofia Thøgersen" or null, "confidence": "high"}]',
    "",
    "Athletes (id | name as printed | country | school | sport):",
    ...rows.map((r) => `${r.id} | ${r.name} | ${r.country} | ${r.school} | ${r.sport}`),
  ].join("\n");
}

/** The model's JSON array, tolerant of prose or a code fence around it. Malformed items are dropped. */
export function parseVerdicts(text: string | null): Verdict[] {
  if (!text) return [];
  const a = text.indexOf("["), b = text.lastIndexOf("]");
  if (a < 0 || b <= a) return [];
  let raw: unknown;
  try { raw = JSON.parse(text.slice(a, b + 1)); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const out: Verdict[] = [];
  for (const x of raw as Array<Record<string, unknown>>) {
    const id = Number(x?.id);
    const conf = x?.confidence;
    if (!Number.isInteger(id) || (conf !== "high" && conf !== "medium" && conf !== "low")) continue;
    out.push({ id, suggested: typeof x.suggested === "string" ? x.suggested : null, confidence: conf });
  }
  return out;
}

export interface Decision { id: number; verdict: "ok" | "suspect"; suggested: string | null; confidence: string | null; source: "has-diacritics" | "llm" }

/**
 * One decision per candidate the model answered for. A candidate it skipped gets none,
 * so it is asked again next run instead of being recorded as fine.
 */
export function decide(rows: Candidate[], verdicts: Verdict[]): Decision[] {
  const byId = new Map(verdicts.map((v) => [v.id, v]));
  const out: Decision[] = [];
  for (const r of rows) {
    const v = byId.get(r.id);
    if (!v) continue;
    const suspect = v.confidence !== "low" && validSuggestion(r.name, v.suggested);
    out.push(suspect
      ? { id: r.id, verdict: "suspect", suggested: (v.suggested as string).trim(), confidence: v.confidence, source: "llm" }
      : { id: r.id, verdict: "ok", suggested: null, confidence: null, source: "llm" });
  }
  return out;
}

/** The command that applies a suggestion — what Discord and the report show. */
export const fixCommand = (id: number, suggested: string) => `npx tsx pipeline/fix/fix-athlete-name.ts ${id} "${suggested}" --apply`;
