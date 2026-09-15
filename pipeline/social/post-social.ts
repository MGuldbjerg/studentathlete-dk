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
 *  3. Dræn: pr. kanal — adaptiv gap ud fra kø-dybde (se pacing.ts). Kørslen
 *     sender så mange af de ÆLDSTE i køen som gap'et har budgetteret siden
 *     sidste opslag, højst `maxPerRun`. Den indhentning er ikke pynt: cron'en
 *     fyrer 6-8 gange i døgnet, ikke 24, og med ét opslag pr. kørsel udløb 7
 *     britiske artikler uden at være forsøgt (4. og 7. september 2026).
 *
 * Fejl: attempts tælles op; 3 mislykkede forsøg → status 'failed'. Enhver
 * fejl giver exit 1, så workflowens failure-Discord fyrer.
 */

import { createD1Client, type D1Client } from "../lib/d1-client";
import { CARD_VERSION, getArticleCoverUrl, getArticleIgCardUrl, getArticleUrl } from "../../src/lib/seo";
import { countryProfile } from "../../src/lib/countries";
import { siteBaseUrl, siteIsLive } from "../../src/lib/site";
import { DEFAULT_PACING, computeGapMinutes, minutesUntilExpiry, postsAllowedNow } from "./pacing";
import { buildPostText } from "./copy";
import { ChannelAuthError, type CardKind, type PostContent, type SocialChannel } from "./types";
import { bluesky, blueskyUk } from "./channels/bluesky";
// X droppet 2026-06-15: X fjernede sit gratis API-tier (nu pay-per-use, ~$0,01/opslag).
// Adapter + secrets bevares — for at gen-aktivere: gendan importen og føj `x` til
// ALL_CHANNELS igen (kræver pay-per-use-kredit på X-kontoen).
// import { x } from "./channels/x";
import { facebook } from "./channels/facebook";
import { instagram } from "./channels/instagram";

/**
 * Alle kendte konti. Ukonfigurerede springes over i main(), så en konto kan
 * stå her længe før dens secrets findes — det er sådan UK-kontoen kom til.
 */
export const ALL_CHANNELS: SocialChannel[] = [bluesky, blueskyUk, facebook, instagram];

/**
 * Må dette lands artikler distribueres overhovedet?
 *
 * Dark launch betyder "domænet peger på sitet, men ingen distribution" — også
 * på sociale medier. Spærren ligger HER og ikke kun i kanalens landefilter,
 * fordi den skal gælde selv hvis nogen senere opretter en konto for landet.
 */
export function distributionAllowed(country: string): boolean {
  return profileAllowsDistribution(countryProfile(country));
}

/**
 * Selve reglen, adskilt fra opslaget i landetabellen — så testen kan holde fast
 * i MEKANISMEN og ikke i hvilke lande der tilfældigvis er dark launch i dag.
 * (UK var det fra 5. til 21. august; en test der hårdkodede «UK er spærret»
 * ville have holdt op med at måle noget den dag flaget blev slået fra.)
 */
export function profileAllowsDistribution(profile: { darkLaunch?: boolean }): boolean {
  // Samme flag, samme regel som footerens familielinje (`siteIsLive`): et
  // dark launch-site hverken linkes til eller distribueres fra. To kopier af
  // reglen ville kunne skride fra hinanden præcis når det gør mest skade.
  return siteIsLive(profile);
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

function buildContent(row: QueuedRow, channel: SocialChannel): PostContent {
  // Artiklens EGET site — ikke modul-konstanten. Den britiske artikel blev
  // postet med et .dk-link, som ikke engang findes på det site.
  const profile = countryProfile(row.country);
  const base = siteBaseUrl(profile);
  // Sproget skal med: sport-sluggen i adressen er sitets, ikke standardsitets.
  const url = base + getArticleUrl({ slug: row.slug, sport: row.sport }, profile.language);
  // Kanalens eget kort: Instagram kan kun bruge 1080×1350-JPEG'et, resten
  // bruger delekortet. Se CardKind.
  const imageUrl =
    base +
    (channel.cardKind === "ig"
      ? getArticleIgCardUrl({ id: row.article_id })
      : getArticleCoverUrl({ id: row.article_id }));
  return {
    text: buildPostText(
      { title: row.title, summary: row.summary, url, lang: profile.language },
      channel.name,
    ),
    url,
    title: row.title,
    summary: row.summary,
    imageUrl,
  };
}

/**
 * "Har artiklen et færdigt kampkort?" som SQL — ÉT sted, så drænet og
 * advarslen ikke kan komme til at spørge om hver sin nøgle. Nøgleformatet er
 * `cardBlobKey()`s (src/lib/seo.ts); testen holder de to sammen.
 */
export function cardReadyClause(alias = "a", kind: CardKind = "share"): string {
  // Nøgleformaterne er cardBlobKey()'s og igCardBlobKey()'s (src/lib/seo.ts);
  // testen binder dem sammen, så en ændring dér ikke kan skride fra SQL'en.
  const prefix = kind === "ig" ? "ig-" : "card-";
  return `EXISTS (SELECT 1 FROM card_blobs cb WHERE cb.key = '${prefix}' || ${alias}.id || '-v${CARD_VERSION}')`;
}

/**
 * Køen er ikke tom — den venter på kort. Sig det højt, med navn og id.
 *
 * Uden linjen ligner "intet postet" en stille no-op, og et permanent brudt
 * kort-render ville standse al distribution uden at nogen kunne se hvorfor
 * (kø-rækkerne udløber tavst efter 48 timer).
 */
async function warnIfWaitingForCards(db: D1Client, ch: SocialChannel): Promise<void> {
  const { results } = await db.query<{ id: number; title: string }>(
    `SELECT a.id, a.title
       FROM social_posts sp
       JOIN articles a ON a.id = sp.article_id
      WHERE sp.channel = ? AND sp.status = 'queued' AND a.country = ?
        AND NOT ${cardReadyClause("a", ch.cardKind)}
      ORDER BY sp.created_at ASC`,
    [ch.name, ch.country],
  );
  for (const r of results) {
    const prefix = ch.cardKind === "ig" ? "ig" : "card";
    console.warn(`  ⚠ ${ch.name}: #${r.id} "${r.title}" venter på sit kampkort (${prefix}-${r.id}-v${CARD_VERSION}) — ikke postet.`);
  }
}

/**
 * Post ÉT opslag på kanalen: tag den ældste kø-række der er klar, og send den.
 *
 * Skilt ud fra drænet fordi kørslen nu kan sende flere ad gangen (se
 * pacing.ts). `empty` betyder "der var ikke mere at tage" — ikke en fejl, men
 * grunden til at bygen stopper før sit loft.
 */
async function postOne(
  db: D1Client,
  ch: SocialChannel,
  dryRun: boolean,
): Promise<{ posted: boolean; error: string | null; empty: boolean; fatal: boolean }> {
  // KORTET SKAL FINDES FØRST. Facebook (og Bluesky) bygger forhåndsvisningen af
  // sin EGEN scrape af siden, og siden lover `og:image:width=1200`. Mangler
  // blob'en, serverer /api/og sit 600×315-fallback — halvdelen af det lovede —
  // og Facebook viser opslaget uden billede OG husker det i ~30 dage.
  //
  // Rækkefølgen var tænkt løst med cron (kort :05, social :15), men GitHub
  // Actions' skemalægning skrider: 18. august postede Amtrup-artiklen 07:07 og
  // fik sit kort 07:46; 20. august postede #108 07:58 og fik kortet 08:50.
  // Begge opslag blev uden billede. En rækkefølge man ØNSKER, er ikke en
  // rækkefølge man HAR — derfor er den nu en betingelse i forespørgslen:
  // en artikel uden kort er ikke klar til at blive delt og bliver stående i
  // køen, mens de andre kan komme forbi.
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
         AND ${cardReadyClause("a", ch.cardKind)}
       ORDER BY sp.created_at ASC, sp.id ASC
       LIMIT 1`,
      [ch.name, ch.country],
    )
  ).results;
  if (!row) {
    await warnIfWaitingForCards(db, ch);
    return { posted: false, error: null, empty: true, fatal: false };
  }

  // Sidste kontrol før noget forlader huset. En kø-række kan være oprettet af
  // en ældre version af koden — den må ikke kunne poste alligevel.
  if (row.country !== ch.country || !distributionAllowed(row.country)) {
    console.log(`  ${ch.name}: springer ${row.country}-artikel over (kanalen er ${ch.country})`);
    await db.execute("UPDATE social_posts SET status = 'expired' WHERE id = ?", [row.id]);
    return { posted: false, error: null, empty: false, fatal: false };
  }

  const content = buildContent(row, ch);

  if (dryRun) {
    console.log(`  ${ch.name} [dry-run]: ville poste "${row.title}" → ${content.url}`);
    // Dry-run skriver intet, så næste runde ville hente den SAMME række og
    // kunne love det samme opslag fire gange. Stop bygen efter ét.
    return { posted: false, error: null, empty: true, fatal: false };
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
    return { posted: true, error: null, empty: false, fatal: false };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // Kontoen kunne ikke logge ind: lad kø-rækken være HELT i fred. Artiklen
    // fejlede ikke — den nåede aldrig ud af huset. Talte vi forsøg op her,
    // ville et forkert kodeord tømme køen i timen, tre timer pr. artikel.
    if (err instanceof ChannelAuthError) {
      console.error(`  ${ch.name}: KONTO-FEJL — intet forsøg brugt, køen står urørt: ${msg}`);
      return { posted: false, error: msg, empty: false, fatal: true };
    }

    const exhausted = row.attempts + 1 >= MAX_ATTEMPTS;
    await db.execute(
      `UPDATE social_posts
       SET attempts = attempts + 1, last_error = ?, status = ?
       WHERE id = ?`,
      [msg.slice(0, 500), exhausted ? "failed" : "queued", row.id],
    );
    console.error(`  ${ch.name}: FEJL (forsøg ${row.attempts + 1}/${MAX_ATTEMPTS}): ${msg}`);
    return { posted: false, error: msg, empty: false, fatal: true };
  }
}

/**
 * Dræn én kanal: post så mange fra køen som pacingen har budgetteret siden
 * sidste opslag (se `postsAllowedNow` — og hvorfor det ikke længere er ét).
 *
 * Bygen stopper ved første fejl. En kanal der lige har afvist et opslag, skal
 * ikke have tre til i samme sekund: ved en platform-nedetid ville det brænde
 * tre forsøg af på tre artikler i stedet for ét på én.
 */
async function drainChannel(
  db: D1Client,
  ch: SocialChannel,
  dryRun: boolean,
): Promise<{ posted: number; error: string | null }> {
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

  // Hvor lang tid har den ÆLDSTE i køen igen? Pacingen skal kende sin deadline,
  // ellers spacer den de sidste artikler med 3 timer mens de har 4 tilbage.
  // Bemærk: rækken behøver ikke have sit kampkort — den udløber uanset.
  const [oldest] = (
    await db.query<{ created_at: string | null }>(
      `SELECT MIN(created_at) AS created_at FROM social_posts WHERE channel = ? AND status = 'queued'`,
      [ch.name],
    )
  ).results;
  const leftMin = oldest?.created_at ? minutesUntilExpiry(oldest.created_at) : null;

  const allowed = postsAllowedNow(last?.posted_at ?? null, depth, new Date(), DEFAULT_PACING, leftMin);
  const gap = computeGapMinutes(depth, DEFAULT_PACING, leftMin);
  if (allowed === 0) {
    console.log(`  ${ch.name}: venter (kø ${depth}, gap ${gap} min, sidst ${last?.posted_at ?? "aldrig"})`);
    return { posted: 0, error: null };
  }
  if (allowed > 1) {
    console.log(
      `  ${ch.name}: indhenter — kø ${depth}, gap ${gap} min` +
        `${leftMin !== null ? `, ældste udløber om ${Math.round(leftMin / 60)} t` : ""}` +
        `, sidst ${last?.posted_at}, sender op til ${allowed}`,
    );
  }

  let posted = 0;
  for (let i = 0; i < allowed; i++) {
    const res = await postOne(db, ch, dryRun);
    if (res.posted) posted++;
    if (res.empty || res.fatal) return { posted, error: res.error };
  }
  return { posted, error: null };
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
  let postedTotal = 0;
  for (const ch of channels) {
    const { posted, error } = await drainChannel(db, ch, dryRun);
    postedTotal += posted;
    if (error) errors.push(`${ch.name}: ${error}`);
  }
  console.log(`I alt postet: ${postedTotal}`);

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
