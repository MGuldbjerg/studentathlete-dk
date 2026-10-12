/**
 * Site check before an AdSense (re)application (PLAN-adsense-uk.md, step 4).
 * ======================================================================
 *
 * Crawls one site the way a reviewer clicks through it: every sitemap URL plus
 * the hubs, then every internal link those pages carry. Read-only — GET
 * requests to our own site, a few at a time.
 *
 * Flags:
 *   status   anything but 200 (a 404 linked from a page is a dead end for the reviewer)
 *   thin     under --min-words words in <main> (scripts, nav and footer excluded)
 *   danish   Danish UI words on the English site (the «Seneste nyheder» kind)
 *   junk     "undefined", "NaN", "[object Object]", "null" as visible text
 *   empty    the site's own empty-state sentences («No articles yet.»)
 *
 * Run:  npx tsx scripts/site-check.ts                     (student-athlete.co.uk)
 *       npx tsx scripts/site-check.ts --site dk --min-words 120
 *       npx tsx scripts/site-check.ts --no-links          (sitemap only, faster)
 * Writes logs/site-check-<site>-<date>.json with every page's numbers.
 *
 * Cloudflare: each page view is an ordinary request (D1 reads as a visitor's,
 * edge cache 5 min). ~700 pages for .co.uk — well inside the monthly allowance;
 * run it before an application, not on a schedule.
 */
import { mkdirSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const val = (f: string, d: string) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const SITE = val("--site", "uk").toLowerCase();
const BASE = SITE === "dk" ? "https://studentathlete.dk" : "https://student-athlete.co.uk";
const MIN_WORDS = Number(val("--min-words", "150"));
const CONCURRENCY = Number(val("--concurrency", "4"));
const LINKS = !args.includes("--no-links");
const MAX_LINKS = Number(val("--max-links", "2000"));
const UA = `StudentAthlete site-check/1.0 (+${BASE}/contact)`;

const HUBS = SITE === "dk"
  ? ["/", "/atleter", "/atleter/alle", "/skoler", "/artikler", "/statistik", "/viden"]
  : ["/", "/athletes", "/athletes/all", "/schools", "/articles", "/statistics", "/guides"];

/** Danish UI words that have no business on the English site. Whole words, case-sensitive where it matters. */
const DANISH = /\b(Seneste|nyheder|Fakta|Artikler|Foto:|Læs|Tidslinje|Kilde|Sæson|Cookieindstillinger|Udgivet|Opdateret|atleter|skoler|Tilbage|Forside)\b/;
const JUNK = /(^|[\s>])(undefined|NaN|\[object Object\]|null)(?=[\s<.,]|$)/;
const EMPTY = SITE === "dk"
  ? /Ingen artikler endnu|Ingen registrerede atleter endnu/
  : /No articles yet|No athletes registered yet/;

interface Page {
  url: string;
  status: number;
  words: number;
  robots: string | null;
  flags: string[];
  danish?: string;
  linkedFrom?: string;
}

function visibleMain(html: string): string {
  // Streamed pages send a «Loading…» <main> first and the real one later in
  // the same response: read every <main>, not the first.
  const mains = html.match(/<main[\s\S]*?<\/main>/gi);
  const main = mains ? mains.join(" ") : html;
  return main
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function internalLinks(html: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const p = m[1];
    if (/^\/(_next|api|admin|cdn-cgi)\b/.test(p) || /\.[a-z0-9]{2,4}$/i.test(p)) continue;
    out.add(p.replace(/\/$/, "") || "/");
  }
  return [...out];
}

async function check(path: string, from?: string): Promise<{ page: Page; links: string[] }> {
  const url = BASE + path;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    const html = res.ok ? await res.text() : "";
    const text = visibleMain(html);
    const page: Page = {
      url: path, status: res.status, words: text ? text.split(" ").length : 0,
      robots: /<meta name="robots" content="([^"]*)"/.exec(html)?.[1] ?? null, flags: [], linkedFrom: from,
    };
    if (res.status !== 200) page.flags.push("status");
    if (res.ok && page.words < MIN_WORDS && !(page.robots ?? "").includes("noindex")) page.flags.push("thin");
    if (SITE !== "dk") {
      const d = DANISH.exec(text);
      if (d) { page.flags.push("danish"); page.danish = text.slice(Math.max(0, d.index - 40), d.index + 40); }
    }
    if (JUNK.test(text)) page.flags.push("junk");
    if (EMPTY.test(text)) page.flags.push("empty");
    return { page, links: res.ok ? internalLinks(html) : [] };
  } catch (err) {
    return { page: { url: path, status: 0, words: 0, robots: null, flags: ["status"], linkedFrom: from,
      danish: err instanceof Error ? err.message : String(err) }, links: [] };
  }
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

async function main(): Promise<void> {
  const sm = await (await fetch(`${BASE}/sitemap.xml`, { headers: { "User-Agent": UA } })).text();
  const fromSitemap = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname.replace(/\/$/, "") || "/");
  const first = [...new Set([...HUBS, ...fromSitemap])];
  console.log(`${BASE}: ${fromSitemap.length} sitemap URLs + hubs = ${first.length} pages`);

  const seen = new Set(first);
  const results = await pool(first, CONCURRENCY, (p) => check(p));
  const pages = results.map((r) => r.page);

  if (LINKS) {
    const extra: Array<{ path: string; from: string }> = [];
    for (const r of results) for (const l of r.links) {
      if (!seen.has(l) && extra.length < MAX_LINKS) { seen.add(l); extra.push({ path: l, from: r.page.url }); }
    }
    console.log(`following ${extra.length} internal links not in the sitemap…`);
    const linked = await pool(extra, CONCURRENCY, (e) => check(e.path, e.from));
    pages.push(...linked.map((r) => r.page));
  }

  const by = (f: string) => pages.filter((p) => p.flags.includes(f));
  const show = (title: string, list: Page[], line: (p: Page) => string, max = 25) => {
    console.log(`\n${title}: ${list.length}`);
    for (const p of list.slice(0, max)) console.log(`  ${line(p)}`);
    if (list.length > max) console.log(`  … and ${list.length - max} more (see the JSON)`);
  };
  show("Not 200", by("status"), (p) => `${p.status} ${p.url}${p.linkedFrom ? `  ← linked from ${p.linkedFrom}` : ""}`);
  show(`Indexable and under ${MIN_WORDS} words`, by("thin").sort((a, b) => a.words - b.words), (p) => `${p.words} ${p.url}`);
  if (SITE !== "dk") show("Danish on the English site", by("danish"), (p) => `${p.url}  «…${p.danish}…»`);
  show("Junk text (undefined/NaN/null)", by("junk"), (p) => p.url);
  show("Empty-state sentences", by("empty"), (p) => p.url);

  const ok = pages.filter((p) => p.status === 200);
  const indexed = ok.filter((p) => !(p.robots ?? "").includes("noindex"));
  const words = indexed.map((p) => p.words).sort((a, b) => a - b);
  console.log(`\n${pages.length} pages checked · ${ok.length} answered 200 · ${indexed.length} indexable · median ${words[Math.floor(words.length / 2)] ?? 0} words in <main>`);

  mkdirSync("logs", { recursive: true });
  const file = `logs/site-check-${SITE}-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(file, JSON.stringify(pages, null, 1));
  console.log(`→ ${file}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
