/**
 * Instagram-handles fra atletens OFFICIELLE bio-side (athletes.bio_url)
 * → admin → Instagram, hvor de følges manuelt.
 *
 * WHY THIS IS A WORKLIST AND NOT A BOT: Meta has no follow endpoint. The
 * Instagram Platform covers publishing, comments, messages, mentions and
 * insights; the old `/users/{id}/relationship` call died with the legacy API
 * in 2018. Following in code means driving a browser against the ToS, and the
 * account that gets action-blocked would be the one `social/channels/
 * instagram.ts` publishes through. So the machine finds the handles and a
 * human clicks — 250-ish clicks instead of 2,583 page visits.
 *
 * IDENTITY, same rule as suggest-photos.ts: the handle counts because it sits
 * on the school's page FOR THIS ATHLETE. A name search over Instagram would be
 * the Bluesky mistake again (0% precision on 30 athletes, 31 August).
 *
 * THE HARD PART IS NOT FINDING LINKS — IT IS THROWING THEM AWAY. Most bio
 * pages carry a row of department accounts in the site chrome (bryanthoops,
 * yalefencing, fsc_waterski). They are dropped two ways: any handle that also
 * appears on the athletics site's FRONT page is chrome by construction (one
 * extra fetch per host, cached for the run), and any handle built from the
 * school's or the sport's own words is dropped by name.
 *
 * Kør:  npx tsx pipeline/scrape/scrape-instagram.ts
 *       npx tsx pipeline/scrape/scrape-instagram.ts --dry-run --limit 20
 *       npx tsx pipeline/scrape/scrape-instagram.ts --country UK --limit 500
 */
import * as cheerio from "cheerio";
import { createD1Client } from "../lib/d1-client";
import { pipelineUserAgent } from "../../src/lib/site";

interface AthleteRow {
  id: number;
  name: string;
  university: string;
  bio_url: string;
  /** Comma-separated handles already turned down for this athlete (migration-054). */
  instagram_rejected: string | null;
}

/** The handles turned down for one athlete, as a lookup. */
export function rejectedSet(list: string | null): Set<string> {
  return new Set(
    (list ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Instagram's own paths, plus the URL scheme — never a person. */
const RESERVED = new Set([
  "p", "reel", "reels", "explore", "accounts", "stories", "tv", "direct",
  "developer", "about", "legal", "privacy", "terms", "help", "web", "s",
  "http", "https", "www",
]);

/** Words that make a handle a team's, not a person's. */
const TEAM_WORDS = [
  "athletic", "sports", "sport", "bball", "mbb", "wbb", "bb", "fb", "football",
  "soccer", "msoc", "wsoc", "volley", "vb", "wvb", "mvb", "lax", "lacrosse",
  "mlax", "wlax", "baseball", "softball", "sb", "golf", "mgolf", "wgolf",
  "tennis", "mten", "wten", "track", "xctf", "xc", "tf", "swim", "dive",
  "fencing", "rowing", "crew", "hockey", "wrestl", "gym", "rodeo", "cheer",
  "dance", "stunt", "equestrian", "waterski", "beach", "bowl", "rugby", "tri",
  "official", "athletics", "recruit", "club", "team", "nation", "pack", "den",
];

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Every instagram.com handle linked from a page. Anchors only: a handle in the
 * page's prose without a link is not something we can trust to be the athlete's.
 *
 * THE LAST MATCH IN THE HREF, NOT THE FIRST. Sidearm prefixes its own base onto
 * whatever the athlete typed into the social field, so an athlete who pasted a
 * full URL comes out doubled:
 *
 *     href="https://www.instagram.com/https://www.instagram.com/eva_isabel_/"
 *
 * Read from the front, that says the handle is `https` — 39 athletes were filed
 * that way on the first run (Mikkel spotted it: «if the handle is http or https
 * it's obviously not the correct handle»). Read from the back, it says
 * `eva_isabel_`, which is what she wrote. The doubling is a marker worth
 * noticing rather than a defect to discard: it only happens in the field the
 * ATHLETE filled in, so those links are personal far more often than not.
 *
 * `RESERVED` still catches the leftovers — an inner link to somewhere other
 * than Instagram leaves a bare scheme behind.
 */
export function extractInstagramHandles(html: string): string[] {
  const $ = cheerio.load(html);
  const found = new Map<string, string>(); // normalized → first-seen spelling
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const matches = [...href.matchAll(/instagram\.com\/([A-Za-z0-9_.]{1,30})/gi)];
    if (matches.length === 0) return;
    const handle = matches[matches.length - 1][1].replace(/\.+$/, "");
    const key = handle.toLowerCase();
    if (!handle || RESERVED.has(key)) return;
    if (!found.has(key)) found.set(key, handle);
  });
  return [...found.values()];
}

/** Distinctive words in a school name — "University"/"College" tell us nothing. */
function schoolTokens(university: string): string[] {
  const stop = new Set([
    "university", "college", "state", "the", "of", "at", "saint", "st",
    "community", "institute", "school", "and", "in", "academy",
  ]);
  return (university.toLowerCase().match(/[a-z]+/g) ?? []).filter(
    (t) => t.length >= 4 && !stop.has(t),
  );
}

/**
 * A team/department account, by its words alone.
 *
 * The `go`-prefix is the third test and it is the one that catches the accounts
 * named after nobody: `gothunderwolves`, `gobonnies`, `gochoctaws` carry neither
 * the school's words nor the sport's. Same convention `athletics-site.ts` reads
 * hostnames by (gocards.com, gozips.com).
 */
export function looksInstitutional(handle: string, university: string): boolean {
  const h = normalize(handle);
  if (TEAM_WORDS.some((w) => h.includes(w))) return true;
  if (/^go[a-z]{4,}$/.test(h)) return true;
  return schoolTokens(university).some((t) => h.includes(t.slice(0, 6)));
}

/**
 * The handle with the athlete's own name removed — what is left is the reason
 * it looks institutional, if it does.
 *
 * Without this, an athlete whose surname is the school's loses to the school:
 * `bryantufootball` "matches" Jake Bryant, and would have been followed instead
 * of `jakebryant`. Strip the name first and the remainder, `ufootball`, still
 * says team — while `jakebryant` strips to nothing and says nobody.
 */
function withoutName(handle: string, athleteName: string): string {
  let h = normalize(handle);
  for (const part of athleteName.split(/\s+/).filter(Boolean).map(normalize)) {
    if (part.length >= 3) h = h.split(part).join("");
  }
  return h;
}

/**
 * Does the handle carry the athlete's name? Surname is the strong signal
 * (`francescajbaber`, `joebrayson9`, `_boprice`). A given name only counts when
 * it is most of the handle, so `soccermom` does not match an athlete called Mo.
 */
export function matchesName(handle: string, athleteName: string): boolean {
  const h = normalize(handle);
  const parts = athleteName.split(/\s+/).filter(Boolean).map(normalize);
  if (parts.length === 0 || !h) return false;
  const last = parts[parts.length - 1];
  const first = parts[0];
  if (last.length >= 4 && h.includes(last)) return true;
  if (first.length >= 4 && h.includes(first) && h.length <= first.length + 4) return true;
  return false;
}

export interface HandleChoice {
  handle: string;
  confidence: "name_match" | "unverified";
}

/**
 * Pick at most one handle for the athlete. A name match wins, but only when the
 * name is the whole reason it matched — see `withoutName`. What survives the
 * chrome and the team words is offered as 'unverified', and only when there is
 * exactly one: two anonymous candidates on one page is not evidence, it is a
 * coin toss.
 *
 * A handle Mikkel has already turned down is removed before anything is weighed
 * (migration-054) — otherwise the athlete would be offered the same wrong
 * account every Sunday, and the only way to stop it would be to retire the
 * athlete from the queue entirely.
 */
export function pickHandle(
  handles: string[],
  athleteName: string,
  university: string,
  chrome: Set<string>,
  rejected: Set<string> = new Set(),
): HandleChoice | null {
  handles = handles.filter((h) => !rejected.has(h.toLowerCase()));
  const named = handles.find(
    (h) => matchesName(h, athleteName) && !looksInstitutional(withoutName(h, athleteName), university),
  );
  if (named) return { handle: named, confidence: "name_match" };

  const rest = handles.filter(
    (h) => !chrome.has(h.toLowerCase()) && !looksInstitutional(h, university),
  );
  if (rest.length === 1) return { handle: rest[0], confidence: "unverified" };
  return null;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": pipelineUserAgent() },
      redirect: "follow",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * The department accounts of the athletics site, read once from its front page.
 * Empty when the front page cannot be read — then only the word filters apply.
 */
async function chromeHandles(origin: string): Promise<Set<string>> {
  if (!origin) return new Set();
  const html = await fetchPage(origin);
  return new Set(html ? extractInstagramHandles(html).map((h) => h.toLowerCase()) : []);
}

/** The athletics site a bio page lives on; "" when the URL will not parse. */
function originOf(bioUrl: string): string {
  try {
    return new URL(bioUrl).origin;
  } catch {
    return "";
  }
}

function parseArgs(): { limit: number; dryRun: boolean; country: string | null } {
  const args = process.argv.slice(2);
  let limit = 400;
  let country: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit" && args[i + 1]) {
      const n = parseInt(args[i + 1], 10);
      if (!Number.isNaN(n)) limit = n;
    }
    if (args[i] === "--country" && args[i + 1]) country = args[i + 1].toUpperCase();
  }
  return { limit, dryRun: args.includes("--dry-run"), country };
}

/**
 * Six schools at a time, one athlete at a time within a school.
 *
 * Serial, this is ~12 athletes a minute — four hours for the 2,800 athletes with
 * a bio page, which is also longer than the weekly workflow's own timeout. The
 * wait is nearly all fetch latency, so the fix is concurrency; the constraint is
 * that a school's own server should not feel it. Grouping by host gives both:
 * no school is ever fetched twice at once, and the school's front page is read
 * once by the worker that owns it — no shared cache, no race.
 */
const HOST_CONCURRENCY = 6;

async function main(): Promise<void> {
  const { limit, dryRun, country } = parseArgs();
  const db = createD1Client();

  // Athletes we have never resolved a handle for. A rejected candidate keeps
  // its status and stays out; a found handle keeps its row out too.
  const athletes = await db.query<AthleteRow>(
    `SELECT a.id, a.name, a.university, a.bio_url, a.instagram_rejected
     FROM athletes a
     WHERE a.active = 1
       AND a.bio_url IS NOT NULL AND a.bio_url <> ''
       AND a.instagram_handle IS NULL
       AND a.instagram_status = 'pending'
       ${country ? "AND a.home_country = ?" : ""}
     ORDER BY a.instagram_checked_at ASC NULLS FIRST, a.name
     LIMIT ?`,
    country ? [country, limit] : [limit],
  );

  const byHost = new Map<string, AthleteRow[]>();
  for (const athlete of athletes.results) {
    const origin = originOf(athlete.bio_url);
    const bucket = byHost.get(origin);
    if (bucket) bucket.push(athlete);
    else byHost.set(origin, [athlete]);
  }
  const hosts = [...byHost.entries()];
  console.log(
    `${athletes.results.length} atlet(er) i køen${country ? ` (${country})` : ""} fordelt på ${hosts.length} atletiksite(r)`,
  );

  let found = 0;
  let unverified = 0;
  let next = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const index = next++;
      if (index >= hosts.length) return;
      const [origin, rows] = hosts[index];
      const chrome = await chromeHandles(origin);

      for (const athlete of rows) {
        const html = await fetchPage(athlete.bio_url);
        // Stamped on every attempt, result or not — see migration-046. Without
        // it the unresolvable pages stay at the front of the queue forever.
        if (!dryRun) {
          await db.execute(
            `UPDATE athletes SET instagram_checked_at = datetime('now') WHERE id = ?`,
            [athlete.id],
          );
        }
        if (!html) {
          console.log(`– ${athlete.name}: bio-siden kunne ikke hentes`);
          continue;
        }
        const choice = pickHandle(
          extractInstagramHandles(html),
          athlete.name,
          athlete.university,
          chrome,
          rejectedSet(athlete.instagram_rejected),
        );
        if (!choice) continue;

        if (choice.confidence === "name_match") found++;
        else unverified++;
        const mark = choice.confidence === "name_match" ? "✓" : "?";
        console.log(`${mark} ${athlete.name}: @${choice.handle} (${choice.confidence})`);
        if (dryRun) continue;
        await db.execute(
          `UPDATE athletes
           SET instagram_handle = ?, instagram_confidence = ?, updated_at = datetime('now')
           WHERE id = ?`,
          [choice.handle, choice.confidence, athlete.id],
        );
      }
    }
  }

  await Promise.all(Array.from({ length: HOST_CONCURRENCY }, () => worker()));

  console.log(
    `\nFærdig: ${found} navne-matchede + ${unverified} usikre handles klar i admin → Instagram.`,
  );
}

if (process.argv[1] && process.argv[1].endsWith("scrape-instagram.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
