/**
 * Bed Facebook om at hente OG-data forfra for en eller flere URL'er.
 * =================================================================
 *
 * Hvorfor der er brug for det: Facebook renderer link-kortet ud fra sin egen
 * cachede scrape, og cachen holder ~30 dage. Amtrup-opslaget 18. august 2026 blev
 * derfor delt uden billede — vores robots.txt spærrede `/api/og`, hvor OG-billedet
 * ligger. Da robots.txt var rettet, var billedet stadig ikke på opslaget, for
 * Facebook havde allerede gemt en scrape uden billede.
 *
 * Et nyt scrape retter forhåndsvisningen for FREMTIDIGE delinger af URL'en (og for
 * alle der deler den selv). **Et allerede offentliggjort opslag beholder som regel
 * det kort, det blev født med** — det kan ikke redigeres via API'et. Vil man have
 * billede på netop det opslag, skal det slettes og postes igen
 * (`pipeline/social/delete-post.ts` + køen).
 *
 * Kør:
 *   npx tsx pipeline/social/rescrape-facebook.ts --url https://studentathlete.dk/fodbold/...
 *   npx tsx pipeline/social/rescrape-facebook.ts --recent 10     # de nyest publicerede
 *   npx tsx pipeline/social/rescrape-facebook.ts --recent 10 --dry-run
 */

import { createD1Client } from "../lib/d1-client";
import { refreshLinkPreview } from "./channels/facebook";
import { getArticleUrl } from "../../src/lib/seo";
import { countryProfile } from "../../src/lib/countries";

interface Args { urls: string[]; recent: number; dryRun: boolean }

function parseArgs(argv: string[]): Args {
  const a: Args = { urls: [], recent: 0, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i + 1];
    if (argv[i] === "--url" && v) { a.urls.push(v); i++; }
    else if (argv[i] === "--recent" && v) { a.recent = parseInt(v, 10) || 0; i++; }
    else if (argv[i] === "--dry-run") a.dryRun = true;
  }
  return a;
}

interface Row { slug: string; sport: string | null; country: string | null }

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const urls = [...args.urls];

  if (args.recent > 0) {
    const db = createD1Client();
    // Sporten kommer fra atleten — `articles` har ingen sport-kolonne.
    const rows = await db.query<Row>(
      `SELECT a.slug, ath.sport AS sport, a.country
       FROM articles a LEFT JOIN athletes ath ON ath.id = a.athlete_id
       WHERE a.published = 1
       ORDER BY a.published_at DESC LIMIT ?`,
      [args.recent],
    );
    for (const r of rows.results) {
      // Sproget kommer fra landeprofilen: adressen er `/football/…` på .co.uk
      // og `/fodbold/…` på .dk, og en genscrape af den forkerte adresse
      // fornyer et kort ingen deler.
      const profile = countryProfile(r.country ?? undefined);
      const base = `https://${profile.host}`;
      urls.push(`${base}${getArticleUrl({ slug: r.slug, sport: r.sport }, profile.language)}`);
    }
  }

  if (urls.length === 0) {
    console.log("Ingen URL'er. Brug --url <adresse> eller --recent <n>.");
    return;
  }
  // Dry-run skal virke uden token: den er til at kontrollere URL-listen.
  if (!args.dryRun && !process.env.FB_PAGE_ACCESS_TOKEN) {
    console.error("FB_PAGE_ACCESS_TOKEN mangler — kør workflowet «Genscrape Facebook-kort».");
    process.exit(1);
  }

  let withImage = 0;
  for (const url of urls) {
    if (args.dryRun) {
      console.log(`  [dry-run] ville bede Facebook scrape ${url}`);
      continue;
    }
    const ok = await refreshLinkPreview(url);
    console.log(`  ${ok ? "✓ billede fundet" : "✗ intet billede"}: ${url}`);
    if (ok) withImage++;
    await new Promise((r) => setTimeout(r, 800));
  }

  if (!args.dryRun) {
    console.log(`\nFærdig. ${withImage}/${urls.length} URL'er har nu et billede i Facebooks cache.`);
    console.log("NB: allerede offentliggjorte opslag beholder deres oprindelige kort.");
  }
}

// Entrypoint-vagt: import må aldrig sende kald til Facebook.
if (process.argv[1] && /rescrape-facebook\.ts$/.test(process.argv[1])) {
  main().catch((err) => {
    console.error("Genscrape fejlede:", err);
    process.exit(1);
  });
}
