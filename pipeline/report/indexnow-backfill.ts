/**
 * Engangs-indsendelse af HELE sitemappet til IndexNow.
 *
 * Den løbende ping (se src/lib/admin.ts) dækker nye artikler fra i dag. Men de
 * 2.703 URLer der allerede ligger på .co.uk — og som Google svarer «unknown»
 * på — er aldrig blevet annonceret nogen steder. Dette script tager dem i ét
 * hug. Protokollen tillader 10.000 URLer pr. kald, så begge sites går i én
 * omgang hver.
 *
 * Det erstatter Bings separate URL Submission API: IndexNow ER indsendelsen
 * til Bing, og kræver hverken konto eller nøgle ud over tekstfilen på domænet.
 *
 * Kør:  npx tsx pipeline/report/indexnow-backfill.ts            (kun tal)
 *       npx tsx pipeline/report/indexnow-backfill.ts --apply
 *       npx tsx pipeline/report/indexnow-backfill.ts --host studentathlete.dk
 */
import { INDEXNOW_MAX_URLS, buildPayload, pingIndexNow } from "../../src/lib/indexnow";

const HOSTS = ["studentathlete.dk", "student-athlete.co.uk"];

/** Træk <loc>-adresserne ud af et sitemap. Ingen XML-parser nødvendig. */
export function extractLocs(xml: string): string[] {
  const out: string[] = [];
  for (const chunk of xml.split("<loc>").slice(1)) {
    const end = chunk.indexOf("</loc>");
    if (end < 0) continue;
    const url = chunk.slice(0, end).trim();
    if (url.startsWith("http")) out.push(url);
  }
  return out;
}

async function fetchSitemap(host: string): Promise<string[]> {
  const res = await fetch(`https://${host}/sitemap.xml`, {
    headers: { "User-Agent": "studentathlete-indexnow-backfill" },
  });
  if (!res.ok) {
    console.log(`  ${host}: sitemap svarede ${res.status} — springer over`);
    return [];
  }
  return extractLocs(await res.text());
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const only = args.includes("--host") ? args[args.indexOf("--host") + 1] : null;
  const hosts = only ? [only] : HOSTS;

  for (const host of hosts) {
    const urls = await fetchSitemap(host);
    if (urls.length === 0) continue;

    // Sitemappet serveres pr. vært, men en fejlkonfiguration kunne blande dem.
    // buildPayload frasorterer fremmede værter — vi siger det højt hvis det sker.
    const payload = buildPayload(urls);
    const kept = payload?.urlList.length ?? 0;
    console.log(`${host}: ${urls.length} URLer i sitemappet`);
    if (kept !== urls.length) {
      console.log(`  ⚠ ${urls.length - kept} URLer hørte ikke til ${host} eller ramte loftet på ${INDEXNOW_MAX_URLS}`);
    }

    if (!apply) {
      console.log(`  (tørløb — intet sendt. Første tre: ${urls.slice(0, 3).join(", ")})`);
      continue;
    }
    const okSent = await pingIndexNow(urls);
    console.log(okSent ? `  ✓ ${kept} URLer indsendt` : "  ✗ indsendelsen fejlede");
  }

  if (!apply) console.log("\nKør med --apply for at sende.");
}

if (process.argv[1] && process.argv[1].endsWith("indexnow-backfill.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
