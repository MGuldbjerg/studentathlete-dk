/**
 * Correct an athlete's name — the record AND everything already written with it.
 * =============================================================================
 *
 * Mikkel, 2026-11-02: Sofia «Thogersen» is Thøgersen. The school's roster drops
 * ø/æ/å, the scraper copies it, and by the time anyone notices there are
 * articles, a card and social posts with the wrong spelling. /admin's
 * renameAthlete fixes the record; this does the same (roster_name kept as the
 * scraper's match key, name_locked set, old slug becomes a 301 alias) and also
 * corrects the athlete's articles, with the visible correction note every
 * published article gets (see correct-published.ts).
 *
 *   npx tsx pipeline/fix/fix-athlete-name.ts <athleteId> "<new full name>"           (shows the plan)
 *   npx tsx pipeline/fix/fix-athlete-name.ts <athleteId> "<new full name>" --apply
 *
 * Article slugs are NOT changed: they are already in social posts and shared
 * links and articles have no alias table, so a new slug would be a 404.
 * Cards carry the name too, so afterwards (printed at the end): render-cards
 * --article N --force, then purge the media URL — the bucket object is cached.
 */
import { generateSlug } from "../../src/lib/slug";
import { createD1Client } from "../lib/d1-client";

/** Letters, so «Thogersens» (possessive) is matched but «Thogersen» inside another word is not. */
const L = "\\p{L}\\p{M}";

/** Every spelling fix `oldName` → `newName` needs in a text: the full name, then a changed surname on its own. */
export function replaceName(text: string, oldName: string, newName: string): { text: string; changes: number } {
  let out = text, changes = 0;
  const sub = (from: string, to: string) => {
    if (!from || from === to) return;
    const re = new RegExp(`(?<![${L}])${from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "gu");
    out = out.replace(re, () => { changes++; return to; });
  };
  sub(oldName, newName);
  const oldLast = oldName.trim().split(/\s+/).slice(-1)[0], newLast = newName.trim().split(/\s+/).slice(-1)[0];
  sub(oldLast, newLast);
  return { text: out, changes };
}

/** The correction note, in the article's language. */
export function correctionNote(oldName: string, newName: string, country: string | null, today: Date): string {
  const english = /^(uk|gb|en)/i.test(country ?? "");
  const date = today.toLocaleDateString(english ? "en-GB" : "da-DK", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return english
    ? `Updated ${date}: the name is spelled «${newName}», not «${oldName}». An earlier version of this article used the wrong spelling.`
    : `Rettet ${date}: Navnet staves «${newName}», ikke «${oldName}». En tidligere version af artiklen brugte den forkerte stavemåde.`;
}

interface Article { id: number; slug: string; title: string; summary: string | null; content: string; published: number; country: string | null; correction_note: string | null }

async function main(): Promise<void> {
  const [idArg, newName] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const apply = process.argv.includes("--apply");
  const id = Number(idArg);
  if (!id || !newName?.trim()) { console.error('Usage: fix-athlete-name.ts <athleteId> "<new full name>" [--apply]'); process.exit(2); }
  const db = createD1Client();

  const a = (await db.query<{ id: number; name: string; slug: string; roster_name: string | null; profile_summary: string | null }>(
    `SELECT id, name, slug, roster_name, profile_summary FROM athletes WHERE id = ?`, [id])).results[0];
  if (!a) { console.error(`No athlete #${id}`); process.exit(1); }
  const name = newName.trim();
  if (name === a.name) { console.log("Already spelled that way — nothing to do."); return; }

  const newSlug = generateSlug(name);
  const clash = (await db.query<{ id: number }>(`SELECT id FROM athletes WHERE slug = ? AND id != ?`, [newSlug, id])).results[0];
  if (clash) { console.error(`/atleter/${newSlug} is already athlete #${clash.id}. Same person? Merge instead.`); process.exit(1); }

  const rosterName = a.roster_name ?? a.name;
  const locked = name === rosterName ? 0 : 1;
  console.log(`Athlete #${id}: «${a.name}» → «${name}»   slug ${a.slug} → ${newSlug}${newSlug !== a.slug ? " (old one becomes a 301 alias)" : ""}`);
  console.log(`  roster_name stays «${rosterName}» (the scraper's match key), name_locked = ${locked}`);

  const arts = (await db.query<Article>(
    `SELECT id, slug, title, summary, content, published, country, correction_note FROM articles
      WHERE athlete_id = ? OR id IN (SELECT article_id FROM article_athletes WHERE athlete_id = ?)`, [id, id])).results;
  const today = new Date();
  const fixes: Array<{ art: Article; title: string; summary: string | null; content: string; note: string | null }> = [];
  for (const art of arts) {
    const t = replaceName(art.title, a.name, name), s = replaceName(art.summary ?? "", a.name, name), c = replaceName(art.content, a.name, name);
    const n = t.changes + s.changes + c.changes;
    console.log(`  article #${art.id} (${art.published ? "published" : "draft"}) ${art.slug}: ${n} replacements (title ${t.changes}, summary ${s.changes}, text ${c.changes})`);
    if (!n) continue;
    const note = art.published ? [art.correction_note, correctionNote(a.name, name, art.country, today)].filter(Boolean).join(" ") : null;
    if (note) console.log(`     note: ${correctionNote(a.name, name, art.country, today)}`);
    fixes.push({ art, title: t.text, summary: art.summary === null ? null : s.text, content: c.text, note });
  }
  const profile = a.profile_summary ? replaceName(a.profile_summary, a.name, name) : null;
  if (profile?.changes) console.log(`  profile_summary: ${profile.changes} replacements`);

  if (!apply) { console.log("\nDry run. Add --apply to write."); return; }

  if (newSlug !== a.slug) {
    await db.execute(`INSERT OR IGNORE INTO athlete_aliases (athlete_id, slug, name, reason) VALUES (?, ?, ?, 'manual')`, [id, a.slug, a.name]);
    await db.execute(`DELETE FROM athlete_aliases WHERE slug = ?`, [newSlug]); // a reused slug must not also be an alias (redirect loop)
  }
  await db.execute(
    `UPDATE athletes SET name = ?, slug = ?, roster_name = ?, name_locked = ?, profile_summary = COALESCE(?, profile_summary), updated_at = datetime('now') WHERE id = ?`,
    [name, newSlug, rosterName, locked, profile?.changes ? profile.text : null, id]);
  for (const f of fixes) {
    await db.execute(
      `UPDATE articles SET title = ?, summary = ?, content = ?, updated_at = datetime('now')${f.note ? ", correction_note = ?, corrected_at = datetime('now')" : ""} WHERE id = ?`,
      f.note ? [f.title, f.summary, f.content, f.note, f.art.id] : [f.title, f.summary, f.content, f.art.id]);
  }
  // Close the name check's suspect, if it had one (the table exists once migration 081 has run).
  await db.execute(`UPDATE name_checks SET verdict = 'fixed', suggested = ? WHERE athlete_id = ?`, [name, id]).catch(() => {});
  console.log(`\nWritten: athlete + ${fixes.length} article(s).`);
  const published = fixes.filter((f) => f.art.published);
  if (published.length) {
    console.log("\nCards still carry the old name. For each published article:");
    for (const f of published) console.log(`  npx tsx pipeline/render/render-cards.ts --article ${f.art.id} --force   # then purge https://media.studentathlete.dk/cards/card-${f.art.id}-v9.webp (and the ig- jpg)`);
    console.log("Social posts already out keep the old spelling; they can only be edited on the platforms.");
  }
}

if (process.argv[1]?.endsWith("fix-athlete-name.ts")) main().catch((e) => { console.error(e); process.exit(1); });
