/**
 * Prober resterende skoler uden feed for kendte URL-mønstre.
 * Kør: npx tsx pipeline/discover/probe-remaining.ts
 */

import { createD1Client } from "../lib/d1-client";

const USER_AGENT = "StudentAthlete.dk/1.0 (research)";

async function probe(url: string): Promise<{ ok: boolean; isRss: boolean; size: number }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (res.status !== 200) return { ok: false, isRss: false, size: 0 };
    const body = await res.text();
    const isRss = body.includes("<item>") || body.includes("<entry>");
    return { ok: body.length > 1024, isRss, size: body.length };
  } catch {
    return { ok: false, isRss: false, size: 0 };
  }
}

function normalizeBase(website: string): string {
  return website
    .replace(/\/index\.(aspx|html?|php)$/i, "")
    .replace(/\/+$/, "")
    .replace(/\/splash\.aspx.*$/i, "")
    .replace(/\/landing\/index$/, "");
}

async function main(): Promise<void> {
  const db = createD1Client();
  const r = await db.query<{
    id: number;
    name: string;
    website: string;
    platform_type: string;
  }>(
    `SELECT id, name, website, platform_type FROM schools
     WHERE news_feed_url IS NULL AND website IS NOT NULL
     ORDER BY name ASC`,
  );
  const schools = r.results;
  console.log(`Prober ${schools.length} resterende skoler...\n`);

  let found = 0;
  let notFound = 0;

  for (const s of schools) {
    const base = normalizeBase(s.website);

    const candidates: Array<{ url: string; label: string }> = [
      { url: `${base}/landing/headlines-featured`, label: "presto" },
      { url: `${base}/feed`, label: "wp-feed" },
      { url: `${base}/rss.aspx`, label: "sidearm-rss" },
      { url: `${base}/rss`, label: "rss" },
      { url: `${base}/news`, label: "news" },
      { url: `${base}/archives`, label: "archives" },
    ];

    // Hvis base ender på /athletics, prøv også med athletics-prefix
    if (/\/athletics$/i.test(base)) {
      const root = base.replace(/\/athletics$/i, "");
      candidates.push(
        { url: `${root}/feed`, label: "root-feed" },
        { url: `${root}/landing/headlines-featured`, label: "root-presto" },
      );
    }

    let feedFound = false;
    for (const c of candidates) {
      const result = await probe(c.url);
      if (result.ok) {
        const feedType = result.isRss ? "rss" : "html";
        console.log(
          `  ✓ ${s.name}: ${feedType.toUpperCase()} → ${c.url} (${c.label}, ${Math.round(result.size / 1024)}KB)`,
        );
        await db.execute(
          `UPDATE schools SET news_feed_url = ?, news_feed_type = ? WHERE id = ?`,
          [c.url, feedType, s.id],
        );
        found++;
        feedFound = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (!feedFound) {
      notFound++;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\nResultat: ${found} nye feeds, ${notFound} stadig uden feed`);

  const total = await db.query<{ c: number }>(
    "SELECT COUNT(*) as c FROM schools WHERE news_feed_url IS NOT NULL",
  );
  const missing = await db.query<{ c: number }>(
    "SELECT COUNT(*) as c FROM schools WHERE news_feed_url IS NULL AND website IS NOT NULL",
  );
  console.log(
    `Totalt: ${total.results[0].c} med feed, ${missing.results[0].c} uden`,
  );
}

main().catch((err) => {
  console.error("Fejl:", err);
  process.exit(1);
});
