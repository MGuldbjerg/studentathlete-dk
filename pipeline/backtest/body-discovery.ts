/**
 * Backtest of the article-body pass (check-sources.ts, 2026-10-26) — reads
 * only: no story, no seen-row, no draft is written.
 * ===========================================================================
 *
 * Every school feed with active athletes, items from the last 21 days (the
 * live pass's window). For each item: would the title pass catch it, and if
 * not, what does the body pass find (school tags 95 / full name 90)? Each
 * (athlete, item) is checked against the stories we already have, so «new»
 * means a story discovery has not found by any route.
 *
 *   npx tsx pipeline/backtest/body-discovery.ts [--limit N]
 */
import { createD1Client } from "../lib/d1-client";
import { fetchArticle, listFeedItems, matchArticle, matchAthletes, type AthleteRef } from "../discover/extract-story";
import { normalizeSourceUrl, storyHash } from "../lib/story-url";

const WINDOW_DAYS = 21;
const HOSTS_AT_ONCE = 8;

interface A extends AthleteRef { home_country: string }
type Group = "UK" | "DK" | "collecting";
const group = (c: string): Group => (c === "UK" || c === "DK" ? c : "collecting");

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;
  const db = createD1Client();
  const schools = (await db.query<{ id: number; name: string; news_feed_url: string; news_feed_type: "rss" | "html" }>(
    `SELECT s.id, s.name, s.news_feed_url, s.news_feed_type FROM schools s
      WHERE s.news_feed_url IS NOT NULL AND s.name IN (SELECT university FROM athletes WHERE active = 1)
      ORDER BY s.id`)).results.slice(0, limit);
  const athletes = (await db.query<A & { university: string }>(
    `SELECT id, name, sport, home_country, university FROM athletes WHERE active = 1`)).results;
  const bySchool = new Map<string, A[]>();
  for (const a of athletes) bySchool.set(a.university, [...(bySchool.get(a.university) ?? []), a]);
  const known = new Set((await db.query<{ url_hash: string }>(
    `SELECT url_hash FROM stories WHERE discovered_at >= date('now', '-60 days')`)).results.map((r) => r.url_hash));
  console.log(`${schools.length} school feeds, ${athletes.length} athletes, ${known.size} stories from the last 60 days to compare with`);

  const now = Date.now();
  const cutoff = now - WINDOW_DAYS * 86_400_000;
  const t = {
    feeds: 0, feedsEmpty: 0, items: 0, itemsUndated: 0, titleItems: 0, opened: 0, unreadable: 0, bodyItems: 0,
    stories: { UK: 0, DK: 0, collecting: 0 } as Record<Group, number>,
    newStories: { UK: 0, DK: 0, collecting: 0 } as Record<Group, number>,
    new7d: { UK: 0, DK: 0, collecting: 0 } as Record<Group, number>,
    byTag: 0, byText: 0,
    // Per-day rates: each feed's stories from DATED items divided by the days those items span
    // (a feed holds ~10 items: 2 days at a busy school, weeks at a quiet one), summed over feeds.
    rateTitle: { UK: 0, DK: 0, collecting: 0 } as Record<Group, number>,
    rateBody: { UK: 0, DK: 0, collecting: 0 } as Record<Group, number>,
  };
  const perSchool = new Map<string, number>();

  // One host at a time per worker, HOSTS_AT_ONCE workers.
  const byHost = new Map<string, typeof schools>();
  for (const s of schools) { let h = "?"; try { h = new URL(s.news_feed_url).host; } catch { /* keep */ } byHost.set(h, [...(byHost.get(h) ?? []), s]); }
  const hosts = [...byHost.keys()];
  let next = 0;
  await Promise.all(Array.from({ length: HOSTS_AT_ONCE }, async () => {
    while (next < hosts.length) {
      for (const s of byHost.get(hosts[next++])!) {
        const ours = bySchool.get(s.name) ?? [];
        const items = await listFeedItems(s.news_feed_url, s.news_feed_type);
        t.feeds++;
        if (!items.length) { t.feedsEmpty++; continue; }
        const dated = items.map((i) => i.pubDate?.getTime()).filter((x): x is number => !!x && x >= cutoff);
        const spanDays = dated.length ? Math.max(1, (now - Math.min(...dated)) / 86_400_000) : 0;
        const add = (rate: Record<Group, number>, g: Group, pubDate: Date | null) => { if (pubDate && spanDays) rate[g] += 1 / spanDays; };
        for (const i of items) {
          if (i.pubDate && i.pubDate.getTime() < cutoff) continue;
          t.items++;
          if (!i.pubDate) t.itemsUndated++;
          const recent = !!i.pubDate && now - i.pubDate.getTime() <= 7 * 86_400_000;
          // The title pass (extractStoriesForSchool) matches title + summary + link.
          const titleHits = matchAthletes(`${i.title} ${i.description} ${i.link}`, ours);
          if (titleHits.length) {
            t.titleItems++;
            for (const h of titleHits) add(t.rateTitle, group((h.athlete as A).home_country), i.pubDate);
            continue;
          }
          t.opened++;
          const article = await fetchArticle(i.link);
          await new Promise((r) => setTimeout(r, 300));
          if (!article) { t.unreadable++; continue; }
          const m = matchArticle(article, ours);
          if (!m.length) continue;
          t.bodyItems++;
          for (const x of m) {
            const g = group((x.athlete as A).home_country);
            t.stories[g]++;
            if (x.relevance_score >= 95) t.byTag++; else t.byText++;
            if (known.has(storyHash(x.athlete.id, normalizeSourceUrl(i.link))) || known.has(storyHash(x.athlete.id, i.link))) continue;
            t.newStories[g]++;
            if (recent) t.new7d[g]++;
            add(t.rateBody, g, i.pubDate);
            if (g !== "collecting") perSchool.set(s.name, (perSchool.get(s.name) ?? 0) + 1);
          }
        }
      }
    }
  }));

  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");
  console.log(`\nFeeds read: ${t.feeds} (${t.feedsEmpty} gave no items)`);
  console.log(`Items from the last ${WINDOW_DAYS} days: ${t.items} (${t.itemsUndated} undated, HTML pages)`);
  console.log(`  caught by the title pass: ${t.titleItems} (${pct(t.titleItems, t.items)})`);
  console.log(`  opened by the body pass: ${t.opened} — unreadable ${t.unreadable}, with one of ours ${t.bodyItems} (${pct(t.bodyItems, t.opened)})`);
  console.log(`\nAthlete-stories the body pass finds (tag ${t.byTag}, full name ${t.byText}):`);
  for (const g of ["UK", "DK", "collecting"] as Group[]) {
    console.log(`  ${g.padEnd(10)} ${String(t.stories[g]).padStart(5)} found · ${String(t.newStories[g]).padStart(5)} new (not already a story) · ${String(t.new7d[g]).padStart(4)} of them dated in the last 7 days`);
  }
  console.log(`\nEstimated stories per day (dated items, per feed over the days its items span):`);
  for (const g of ["UK", "DK", "collecting"] as Group[]) {
    const a = t.rateTitle[g], b = t.rateBody[g];
    console.log(`  ${g.padEnd(10)} title pass ${a.toFixed(1).padStart(6)} · body pass ${b.toFixed(1).padStart(6)} · body/title ${a ? (b / a).toFixed(1) : "—"}×`);
  }
  console.log(`\nSchools with the most new UK/DK stories:`);
  for (const [name, n] of [...perSchool].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`  ${String(n).padStart(3)}  ${name}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
