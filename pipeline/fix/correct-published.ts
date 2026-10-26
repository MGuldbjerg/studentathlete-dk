/**
 * Corrections to PUBLISHED articles — always with a visible correction note.
 * ===========================================================================
 *
 * fix-draft-text.ts never touches a published article: there a correction is
 * a correction_note, not a silent change of the record. This is the published
 * counterpart, doing what /admin's updateArticle does (content, correction_note,
 * corrected_at, updated_at). Each fix is data below, must match exactly once in
 * the article's text, and is skipped loudly otherwise.
 *
 *   npx tsx pipeline/fix/correct-published.ts            (shows the diff)
 *   npx tsx pipeline/fix/correct-published.ts --apply
 */
import { createD1Client } from "../lib/d1-client";

interface Correction { id: number; from: string; to: string; note: string }

/**
 * Class-year review 2026-10-26 (logs/review/class-year-2026-10-26.md), Mikkel:
 * «Yes, correct». Roster and the school's bio page agree; for #674 the release
 * said junior, but the roster and bio both say senior.
 */
const CORRECTIONS: Correction[] = [
  {
    id: 261,
    from: "Filippa Mortensen, freshman fra Herlev",
    to: "Filippa Mortensen, sophomore fra Herlev",
    note: "Rettet 26. oktober 2026: Filippa Mortensen går på andet år (sophomore) ifølge Tarleton States spillertrup og hendes spillerprofil. En tidligere version af artiklen kaldte hende freshman.",
  },
  {
    id: 280,
    from: "a redshirt freshman goalkeeper",
    to: "a sophomore goalkeeper",
    note: "Updated 26 October 2026: Houston Christian's roster and Harvey Heeps's player profile list him as a sophomore. An earlier version of this article described him as a redshirt freshman.",
  },
  {
    id: 674,
    from: "the English junior diver",
    to: "the English senior diver",
    note: "Updated 26 October 2026: Bryant's roster and Megan Beasley's player profile list her as a senior. An earlier version of this article, following the release, described her as a junior.",
  },
];

const count = (hay: string, needle: string) => hay.split(needle).length - 1;

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  let done = 0;
  for (const c of CORRECTIONS) {
    const row = (await db.query<{ id: number; published: number; content: string; correction_note: string | null }>(
      `SELECT id, published, content, correction_note FROM articles WHERE id = ?`, [c.id])).results[0];
    if (!row) { console.log(`  ✗ #${c.id}: not found`); continue; }
    if (!row.published) { console.log(`  ✗ #${c.id}: not published — use fix-draft-text.ts`); continue; }
    const n = count(row.content, c.from);
    if (n !== 1) { console.log(`  ✗ #${c.id}: «${c.from}» matches ${n} times, skipped`); continue; }
    // An earlier note stays: the new one is added after it.
    const note = row.correction_note ? `${row.correction_note} ${c.note}` : c.note;
    console.log(`  #${c.id}: «${c.from}» → «${c.to}»\n     note: ${c.note}`);
    if (apply) {
      await db.execute(
        `UPDATE articles SET content = ?, correction_note = ?, corrected_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        [row.content.replace(c.from, c.to), note, c.id],
      );
      done++;
    }
  }
  console.log(apply ? `corrected: ${done}` : "dry run — --apply to write");
}

main().catch((e) => { console.error(e); process.exit(1); });
