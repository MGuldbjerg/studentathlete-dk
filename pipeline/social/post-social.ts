/**
 * Social-kø: enqueue + dræn (modul 7).
 *
 * Kør: npx tsx pipeline/social/post-social.ts [--dry-run]
 *
 * Flow pr. kørsel (timevis cron i social-post.yml):
 *  1. Enqueue: publicerede artikler (published_at inden for friskhedsvinduet)
 *     uden kø-række → én række pr. KONFIGURERET kanal. Ukonfigurerede kanaler
 *     får aldrig kø-rækker, så secrets kan tilføjes gradvist (Bluesky først).
 *  2. Expiry: kø-rækker ældre end 48t markeres 'expired' — gamle nyheder
 *     postes ikke.
 *  3. Dræn: pr. kanal — adaptiv gap ud fra kø-dybde (se pacing.ts); er der
 *     gået gap-tid siden sidste opslag postes den ÆLDSTE i køen. Max ét
 *     opslag pr. kanal pr. kørsel; hård grænse = 1/time/kanal.
 *
 * Fejl: attempts tælles op; 3 mislykkede forsøg → status 'failed'. Enhver
 * fejl giver exit 1, så workflowens failure-Discord fyrer.
 */

import { createD1Client, type D1Client } from "../lib/d1-client";
import { getArticleCoverUrl, getArticleUrl } from "../../src/lib/seo";
import { countryProfile } from "../../src/lib/countries";
import { siteBaseUrl } from "../../src/lib/site";
import { DEFAULT_PACING, computeGapMinutes, shouldPostNow } from "./pacing";
import { buildPostText } from "./copy";
import type { PostContent, SocialChannel } from "./types";
import { bluesky } from "./channels/bluesky";
// X droppet 2026-06-15: X fjernede sit gratis API-tier (nu pay-per-use, ~$0,01/opslag).
// Adapter + secrets bevares — for at gen-aktivere: gendan importen og føj `x` til
// ALL_CHANNELS igen (kræver pay-per-use-kredit på X-kontoen).
// import { x } from "./channels/x";
import { facebook } from "./channels/facebook";

const ALL_CHANNELS: SocialChannel[] = [bluesky, facebook];

/**
 * Må dette lands artikler distribueres overhovedet?
 *
 * Dark launch betyder "domænet peger på sitet, men ingen distribution" — også
 * på sociale medier. Spærren ligger HER og ikke kun i kanalens landefilter,
 * fordi den skal gælde selv hvis nogen senere opretter en konto for landet.
 */
export function distributionAllowed(country: string): boolean {
  return countryProfile(country).darkLaunch !== true;
}
const MAX_ATTEMPTS = 3;

interface QueuedRow {
  id: number;
  article_id: number;
  attempts: number;
  title: string;
  summary: string | null;
  slug: string;
  sport: string | null;
  cover_image_url: string | null;
  country: string;
}

async function enqueue(db: D1Client, channels: SocialChannel[]): Promise<number> {
  let added = 0;
  for (const ch of channels) {
    if (!distributionAllowed(ch.country)) {
      console.log(`  ${ch.name}: ${ch.country} er dark launch — intet distribueres`);
      continue;
    }
    // `a.country = ch.country` er hele pointen: en kanal er en KONTO i ét land.
    // Uden det led postede den danske Facebook-side og Bluesky-konto en
    // britisk artikel (2026-08-05), midt i UK-sitets dark launch.
    const res = await db.execute(
      `INSERT OR IGNORE INTO social_posts (article_id, channel)
       SELECT a.id, ?
       FROM articles a
       WHERE a.published = 1
         AND a.country = ?
         AND a.published_at >= datetime('now', ?)`,
      [ch.name, ch.country, `-${DEFAULT_PACING.expiryMinutes} minutes`],
    );
    added += res.meta.changes;
  }
  return added;
}

async function expireStale(db: D1Client): Promise<number> {
  const res = await db.execute(
    `UPDATE social_posts SET status = 'expired'
     WHERE status = 'queued'
       AND created_at < datetime('now', ?)`,
    [`-${DEFAULT_PACING.expiryMinutes} minutes`],
  );
  return res.meta.changes;
}

function buildContent(row: QueuedRow, channel: SocialChannel["name"]): PostContent {
  // Artiklens EGET site — ikke modul-konstanten. Den britiske artikel blev
  // postet med et .dk-link, som ikke engang findes på det site.
  const base = siteBaseUrl(countryProfile(row.country));
  const url = base + getArticleUrl({ slug: row.slug, sport: row.sport });
  const imageUrl = base + getArticleCoverUrl({ id: row.article_id });
  return {
    text: buildPostText({ title: row.title, summary: row.summary, url }, channel),
    url,
    title: row.title,
    summary: row.summary,
    imageUrl,
  };
}

/** Dræn én kanal: post den ældste i køen hvis pacing tillader det. */
async function drainChannel(
  db: D1Client,
  ch: SocialChannel,
  dryRun: boolean,
): Promise<{ posted: boolean; error: string | null }> {
  const [{ depth }] = (
    await db.query<{ depth: number }>(
      `SELECT COUNT(*) AS depth FROM social_posts WHERE channel = ? AND status = 'queued'`,
      [ch.name],
    )
  ).results;

  const [last] = (
    await db.query<{ posted_at: string | null }>(
      `SELECT MAX(posted_at) AS posted_at FROM social_posts WHERE channel = ? AND status = 'posted'`,
      [ch.name],
    )
  ).results;

  if (!shouldPostNow(last?.posted_at ?? null, depth)) {
    const gap = computeGapMinutes(depth);
    console.log(`  ${ch.name}: venter (kø ${depth}, gap ${gap} min, sidst ${last?.posted_at ?? "aldrig"})`);
    return { posted: false, error: null };
  }

  const [row] = (
    await db.query<QueuedRow>(
      `SELECT sp.id, sp.article_id, sp.attempts,
              a.title, a.summary, a.slug, a.cover_image_url, a.country,
              ath.sport
       FROM social_posts sp
       JOIN articles a ON a.id = sp.article_id
       LEFT JOIN athletes ath ON ath.id = a.athlete_id
       WHERE sp.channel = ? AND sp.status = 'queued'
         AND a.country = ?
       ORDER BY sp.created_at ASC, sp.id ASC
       LIMIT 1`,
      [ch.name, ch.country],
    )
  ).results;
  if (!row) return { posted: false, error: null };

  // Sidste kontrol før noget forlader huset. En kø-række kan være oprettet af
  // en ældre version af koden — den må ikke kunne poste alligevel.
  if (row.country !== ch.country || !distributionAllowed(row.country)) {
    console.log(`  ${ch.name}: springer ${row.country}-artikel over (kanalen er ${ch.country})`);
    await db.execute("UPDATE social_posts SET status = 'expired' WHERE id = ?", [row.id]);
    return { posted: false, error: null };
  }

  const content = buildContent(row, ch.name);

  if (dryRun) {
    console.log(`  ${ch.name} [dry-run]: ville poste "${row.title}" → ${content.url}`);
    return { posted: false, error: null };
  }

  try {
    const { postUrl } = await ch.post(content);
    await db.execute(
      `UPDATE social_posts
       SET status = 'posted', posted_at = datetime('now'), post_url = ?, attempts = attempts + 1
       WHERE id = ?`,
      [postUrl, row.id],
    );
    console.log(`  ${ch.name}: postet "${row.title}"${postUrl ? ` → ${postUrl}` : ""}`);
    return { posted: true, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const exhausted = row.attempts + 1 >= MAX_ATTEMPTS;
    await db.execute(
      `UPDATE social_posts
       SET attempts = attempts + 1, last_error = ?, status = ?
       WHERE id = ?`,
      [msg.slice(0, 500), exhausted ? "failed" : "queued", row.id],
    );
    console.error(`  ${ch.name}: FEJL (forsøg ${row.attempts + 1}/${MAX_ATTEMPTS}): ${msg}`);
    return { posted: false, error: msg };
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const channels = ALL_CHANNELS.filter((c) => c.isConfigured());

  if (channels.length === 0) {
    console.log("Ingen kanaler konfigureret (secrets mangler) — intet at gøre.");
    return;
  }
  console.log(`Kanaler: ${channels.map((c) => c.name).join(", ")}${dryRun ? " [dry-run]" : ""}`);

  const db = createD1Client();

  const added = await enqueue(db, channels);
  if (added > 0) console.log(`Enqueued ${added} nye kø-rækker.`);

  const expired = await expireStale(db);
  if (expired > 0) console.log(`Markerede ${expired} forældede kø-rækker som expired.`);

  const errors: string[] = [];
  for (const ch of channels) {
    const { error } = await drainChannel(db, ch, dryRun);
    if (error) errors.push(`${ch.name}: ${error}`);
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} kanal-fejl — se ovenfor.`);
    process.exit(1);
  }
}

/**
 * Kør KUN når filen er startet direkte.
 *
 * Uden vagten kørte et `import` af denne fil hele posteringen — en test der
 * blot ville tjekke en konstant, ville med secrets i miljøet kunne POSTE.
 * Præcis den slags utilsigtede udsendelse er grunden til at filen findes i
 * denne form i dag.
 */
const runDirectly = process.argv[1]?.endsWith("post-social.ts") ?? false;
if (runDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
