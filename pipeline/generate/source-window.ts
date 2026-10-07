/**
 * Which part of a long source the fact-sheet model gets to read.
 * ==============================================================
 *
 * The model reads at most `budget` characters (8000 — the free tiers meter
 * tokens per minute). It used to read the FIRST 8000. Sidearm pages open with
 * the box score — one table cell per line — and the story itself often starts
 * after it. Measured on the 200 newest British and Danish stories (7 October
 * 2026): 76 were longer than the window, and in 53 of them the athlete was
 * mentioned beyond it. In Mujica's 2-0 (#8180) her name first appears at
 * character 13,141, so the sheet held box-score numbers and none of the
 * story's «Warrior Notables»: her fourth shutout, 10th career shutout, eighth
 * in programme history. That is where thin articles come from.
 *
 * So the window is chosen, not cut: running text before table cells, the
 * athlete's own paragraphs before anyone else's, and the table rows around the
 * athlete's name before the rest of the table. Lines keep their original
 * order, and a gap is marked «…» so the model never reads two distant lines as
 * one passage.
 *
 * Pure function — the fact-sheet check verifies against exactly this text.
 */
import { surnamesOf } from "./verify-factsheet";

/** Running text, not a table cell. Box-score cells are a word or a number. */
const PROSE_MIN = 80;
/** Lines kept above and below an athlete mention in a table (stat rows). */
const TABLE_REACH = 10;
/** Opening paragraphs kept whatever they mention: the dateline and the result. */
const LEAD_LINES = 3;

export function selectSourceWindow(source: string, athleteName: string, budget = 8000): string {
  if (source.length <= budget) return source;

  const lines = source.split("\n");
  const names = surnamesOf(athleteName).map((s) => s.toLowerCase()).filter((s) => s.length > 1);
  const mentions = (line: string) => {
    const low = line.toLowerCase();
    return names.some((n) => new RegExp(`(?<![a-z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`).test(low));
  };
  const isProse = (i: number) => lines[i].trim().length >= PROSE_MIN;

  const prose = lines.map((_, i) => i).filter(isProse);
  const named = lines.map((_, i) => i).filter((i) => mentions(lines[i]));
  const namedProse = prose.filter((i) => named.includes(i));
  const neighbours = namedProse.flatMap((i) => {
    const k = prose.indexOf(i);
    return [prose[k - 1], prose[k + 1]].filter((x): x is number => x !== undefined);
  });

  // Tiers, most important first. A line can appear in several; the first wins.
  const tiers: number[][] = [
    // 1. the athlete's own paragraphs, then the paragraph either side of each
    namedProse,
    neighbours,
    // 2. the lead: dateline, result, the story's first claims
    prose.slice(0, LEAD_LINES),
    // 3. table rows around the athlete's name (her saves, minutes, place)
    named.flatMap((n) => range(Math.max(0, n - TABLE_REACH), Math.min(lines.length - 1, n + TABLE_REACH))),
    // 4. the rest of the running text
    prose,
    // 5. everything else, in page order
    lines.map((_, i) => i),
  ];

  const chosen = new Set<number>();
  let used = 0;
  for (const tier of tiers) {
    for (const i of tier) {
      if (chosen.has(i)) continue;
      // +1 newline, +2 for the «…» line a gap before it may need.
      const cost = lines[i].length + 3;
      if (used + cost > budget) continue;
      chosen.add(i);
      used += cost;
    }
  }

  const ordered = [...chosen].sort((a, b) => a - b);
  const out: string[] = [];
  ordered.forEach((i, k) => {
    if (k > 0 && i !== ordered[k - 1] + 1) out.push("…");
    out.push(lines[i]);
  });
  return out.join("\n");
}

function range(a: number, b: number): number[] {
  const r: number[] = [];
  for (let i = a; i <= b; i++) r.push(i);
  return r;
}
