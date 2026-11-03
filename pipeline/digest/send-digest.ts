/**
 * The weekly email digest: each confirmed subscriber gets the past week's
 * articles from the sports they chose, from their own site (growth plan,
 * Mikkel 2026-11-03). Texts, links and the Brevo call live in src/lib/digest.ts,
 * shared with the sign-up in the Worker.
 *
 *   npx tsx pipeline/digest/send-digest.ts                 dry run, both sites: counts + a preview
 *                                                          email with every sport → logs/digest-preview-<site>.html
 *   npx tsx pipeline/digest/send-digest.ts --site UK       one site
 *   npx tsx pipeline/digest/send-digest.ts --send          send (BREVO_API_KEY); only for sites whose
 *                                                          country profile has `emailDigest` on
 *
 * Sending is a publication (CLAUDE.md): it runs only with --send, which the
 * workflow passes only when Mikkel has set the repo variable DIGEST_SEND=1.
 * With --send it also applies the privacy page's retention: unconfirmed
 * sign-ups go after 7 days, unsubscribed rows 30 days after unsubscribing.
 * Never twice in a week to the same person (`last_sent_at`), and at most
 * DAILY_CAP emails a run: the Brevo account's free plan allows 300 a day and is
 * shared with other projects.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createD1Client, type D1Client } from "../lib/d1-client";
import { COUNTRIES } from "../../src/lib/countries";
import type { CountryProfile } from "../../src/lib/countries/types";
import { sourceParam } from "../../src/lib/routes";
import {
  buildDigestEmail, digestLinks, groupBySport, sectionsFor, sendBrevo,
  type DigestArticle, type DigestSection,
} from "../../src/lib/digest";

const DAILY_CAP = 250;
const PER_SECTION = 8;

function parseArgs() {
  const a = process.argv.slice(2);
  const val = (f: string) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] ?? null : null; };
  return { site: val("--site"), send: a.includes("--send") };
}

async function weekSections(db: D1Client, site: CountryProfile): Promise<DigestSection[]> {
  const rows = (await db.query<DigestArticle>(
    `SELECT a.title, a.summary, a.slug, at.sport
     FROM articles a JOIN athletes at ON at.id = a.athlete_id
     WHERE a.published = 1 AND a.country = ? AND a.published_at >= datetime('now', '-7 days')
       AND at.sport IS NOT NULL
     ORDER BY a.published_at DESC`, [site.code])).results;
  return groupBySport(rows).map((s) => ({ ...s, articles: s.articles.slice(0, PER_SECTION) }));
}

async function cleanup(db: D1Client, site: CountryProfile) {
  const a = await db.query("DELETE FROM digest_subscribers WHERE site = ? AND status = 'pending' AND created_at < datetime('now', '-7 days')", [site.code]);
  const b = await db.query("DELETE FROM digest_subscribers WHERE site = ? AND status = 'unsubscribed' AND unsubscribed_at < datetime('now', '-30 days')", [site.code]);
  console.log(`  retention: ${a.meta?.changes ?? 0} unconfirmed, ${b.meta?.changes ?? 0} unsubscribed deleted`);
}

async function runSite(db: D1Client, site: CountryProfile, send: boolean, budget: { left: number }) {
  console.log(`\n== ${site.brand} (${site.code}) — ${send ? "SEND" : "dry run"}, emailDigest=${site.emailDigest}`);
  const sections = await weekSections(db, site);
  console.log(`  this week: ${sections.map((s) => `${s.sport} ${s.articles.length}`).join(", ") || "no articles"}`);

  // Preview with every sport, so the format can be read before anyone gets it.
  const preview = buildDigestEmail(site, sections, "0".repeat(64), sourceParam(site.language));
  mkdirSync("logs", { recursive: true });
  writeFileSync(`logs/digest-preview-${site.code}.html`, preview.html);
  console.log(`  preview: logs/digest-preview-${site.code}.html — «${preview.subject}»`);

  if (send && !site.emailDigest) { console.log("  emailDigest is off for this site — nothing sent"); return; }
  if (send) await cleanup(db, site);

  const subs = (await db.query<{ id: number; email: string; sports: string; token: string; last_sent_at: string | null }>(
    `SELECT id, email, sports, token, last_sent_at FROM digest_subscribers
     WHERE site = ? AND status = 'active'
       AND (last_sent_at IS NULL OR last_sent_at < datetime('now', '-6 days'))`, [site.code])).results;
  let sent = 0, empty = 0, failed = 0;
  for (const s of subs) {
    const mine = sectionsFor(s.sports.split(","), sections);
    if (mine.length === 0) { empty++; continue; }
    if (!send) { sent++; continue; }
    if (budget.left <= 0) { console.log("  daily cap reached — the rest go next run"); break; }
    try {
      const email = buildDigestEmail(site, mine, s.token, sourceParam(site.language));
      await sendBrevo(process.env.BREVO_API_KEY!, site, s.email, email, digestLinks(site, s.token).unsubscribe);
      await db.query("UPDATE digest_subscribers SET last_sent_at = datetime('now') WHERE id = ?", [s.id]);
      sent++; budget.left--;
      await new Promise((r) => setTimeout(r, 1000));
    } catch (e) {
      failed++;
      console.error(`  FAILED subscriber ${s.id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`  subscribers due: ${subs.length} · ${send ? "sent" : "would send"} ${sent} · nothing this week ${empty} · failed ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

async function main() {
  const args = parseArgs();
  if (args.send && !process.env.BREVO_API_KEY) throw new Error("--send needs BREVO_API_KEY");
  const db = createD1Client();
  const sites = Object.values(COUNTRIES).filter((c) => !args.site || c.code === args.site);
  const budget = { left: DAILY_CAP };
  for (const site of sites) await runSite(db, site, args.send, budget);
}

main().catch((e) => { console.error(e); process.exit(1); });
