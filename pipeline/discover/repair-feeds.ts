/**
 * Dead school news feeds → a working address on the same athletics site.
 * ===========================================================================
 *
 * Quality sweep 2026-10-26 (Mikkel: «Yes, fix the dead feeds»): of 12 silent
 * schools sampled, 5 feeds answered 200 with no items (Berkeley, San
 * Francisco, Jacksonville State, Illinois) or 403 (Belmont Abbey). The Sidearm
 * sites had moved their feed from /rss.aspx to /rss, which answered with this
 * weekend's news.
 *
 * Every school with a feed is read once. A feed is dead when it errors, has no
 * items, or its newest item is older than STALE_DAYS. For a dead one the
 * candidates on the athletics site's origin (the feed's own and the school's
 * website) are tried; the first with ≥3 items and a fresher newest item
 * replaces it. A working feed is never touched.
 *
 *   npx tsx pipeline/discover/repair-feeds.ts            # report
 *   npx tsx pipeline/discover/repair-feeds.ts --apply    # write the replacements
 */
import { createD1Client } from "../lib/d1-client";
import { pipelineUserAgent } from "../../src/lib/site";

const STALE_DAYS = 45;
const CANDIDATES = ["/rss", "/rss.aspx", "/rss.aspx?path=general", "/feed", "/rss.xml", "/news/rss", "/feed/"];
const AT_ONCE = 8;

interface Feed { ok: boolean; items: number; newest: number | null; status: number }

export function readFeed(xml: string): { items: number; newest: number | null } {
  const items = (xml.match(/<item[\s>]/gi) ?? []).length + (xml.match(/<entry[\s>]/gi) ?? []).length;
  const dates = [...xml.matchAll(/<(?:pubDate|updated|published|dc:date)>([^<]+)</gi)]
    .map((m) => Date.parse(m[1].trim())).filter((t) => !isNaN(t));
  return { items, newest: dates.length ? Math.max(...dates) : null };
}

async function fetchFeed(url: string, ua: string): Promise<Feed> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": ua }, redirect: "follow", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { ok: false, items: 0, newest: null, status: res.status };
    const { items, newest } = readFeed(await res.text());
    return { ok: true, items, newest, status: res.status };
  } catch {
    return { ok: false, items: 0, newest: null, status: 0 };
  }
}

const dead = (f: Feed, now: number) => !f.ok || f.items === 0 || (f.newest !== null && now - f.newest > STALE_DAYS * 86_400_000);
/** An HTML news page (check-sources reads it as HTML) has no <item>s by design: dead only when it errors. */
const deadAs = (type: string | null, f: Feed, now: number) => (type === "html" ? !f.ok : dead(f, now));

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const db = createD1Client();
  const ua = pipelineUserAgent();
  const now = Date.now();
  const schools = (await db.query<{ id: number; name: string; news_feed_url: string; news_feed_type: string | null; website: string | null; athletics_url: string | null }>(
    `SELECT id, name, news_feed_url, news_feed_type, website, athletics_url FROM schools WHERE news_feed_url IS NOT NULL`)).results;
  console.log(`${schools.length} feeds to read`);

  const fixes: Array<{ id: number; name: string; from: string; to: string; items: number }> = [];
  const stillDead: Array<{ name: string; url: string; why: string }> = [];
  let next = 0, deadCount = 0;
  await Promise.all(Array.from({ length: AT_ONCE }, async () => {
    while (next < schools.length) {
      const s = schools[next++];
      const cur = await fetchFeed(s.news_feed_url, ua);
      if (!deadAs(s.news_feed_type, cur, now)) continue;
      deadCount++;
      const origins = [...new Set([s.news_feed_url, s.athletics_url, s.website].filter((u): u is string => !!u).map((u) => {
        try { return new URL(u).origin; } catch { return null; }
      }).filter((o): o is string => !!o))];
      let found: { url: string; feed: Feed } | null = null;
      for (const o of origins) {
        for (const p of CANDIDATES) {
          const url = o + p;
          if (url === s.news_feed_url) continue;
          const f = await fetchFeed(url, ua);
          if (f.ok && f.items >= 3 && !dead(f, now) && (cur.newest === null || (f.newest ?? 0) > cur.newest)) { found = { url, feed: f }; break; }
        }
        if (found) break;
      }
      if (found) fixes.push({ id: s.id, name: s.name, from: s.news_feed_url, to: found.url, items: found.feed.items });
      else stillDead.push({ name: s.name, url: s.news_feed_url, why: !cur.ok ? `HTTP ${cur.status || "error"}` : cur.items === 0 ? "no items" : "stale" });
    }
  }));

  console.log(`dead: ${deadCount} · a working address found: ${fixes.length} · still dead: ${stillDead.length}`);
  for (const f of fixes.slice(0, 15)) console.log(`  ✓ ${f.name}: ${f.from} → ${f.to} (${f.items} items)`);
  const why = stillDead.reduce((m, x) => m.set(x.why, (m.get(x.why) ?? 0) + 1), new Map<string, number>());
  console.log("still dead by reason:", Object.fromEntries(why));
  for (const d of stillDead.slice(0, process.argv.includes("--list") ? Infinity : 15)) console.log(`  ✗ ${d.name}: ${d.url} (${d.why})`);
  if (!apply) { console.log("report only — --apply writes the replacements"); return; }
  const writes = fixes.map((f) => ({ sql: `UPDATE schools SET news_feed_url = ?, news_feed_type = 'rss' WHERE id = ?`, params: [f.to, f.id] }));
  for (let i = 0; i < writes.length; i += 50) await db.batch(writes.slice(i, i + 50));
  console.log(`written: ${writes.length}`);
}

if (/repair-feeds\.ts$/.test(process.argv[1] ?? "")) main().catch((e) => { console.error(e); process.exit(1); });
