/**
 * Fjern et opslag der ikke skulle have været sendt.
 *
 *   npx tsx pipeline/social/delete-post.ts 33 36        # kø-rækkernes id'er
 *   npx tsx pipeline/social/delete-post.ts --country=UK # alt postet for ét land
 *   … --dry-run                                        # vis kun hvad der ville ske
 *
 * Skrevet 2026-08-05, efter at den danske Facebook-side og Bluesky-konto
 * postede en britisk artikel under UK-sitets dark launch. Fortrydelsen skal
 * være lige så scriptbar som udsendelsen — ellers står man med et opslag ude i
 * verden og en manuel oprydning.
 *
 * Rækken markeres `deleted` (ikke slettet): sporet efter hvad der var ude, og
 * hvornår det blev fjernet, er selv en del af dokumentationen.
 */
import { createD1Client } from "../lib/d1-client";

const PDS = "https://bsky.social";
const GRAPH = "https://graph.facebook.com/v26.0";

interface Row {
  id: number;
  channel: string;
  post_url: string | null;
  title: string;
  country: string;
}

/** Bluesky-URL → rkey. `…/profile/<handle>/post/<rkey>` */
function rkeyFromUrl(url: string): string | null {
  return /\/post\/([^/?#]+)/.exec(url)?.[1] ?? null;
}

async function deleteBluesky(url: string): Promise<void> {
  const handle = process.env.BLUESKY_HANDLE;
  const password = process.env.BLUESKY_APP_PASSWORD;
  if (!handle || !password) throw new Error("Mangler BLUESKY_HANDLE / BLUESKY_APP_PASSWORD");
  const rkey = rkeyFromUrl(url);
  if (!rkey) throw new Error(`Kunne ikke læse rkey ud af ${url}`);

  const sesRes = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password }),
  });
  if (!sesRes.ok) throw new Error(`Bluesky login fejlede (${sesRes.status}): ${await sesRes.text()}`);
  const session = (await sesRes.json()) as { accessJwt: string; did: string };

  const res = await fetch(`${PDS}/xrpc/com.atproto.repo.deleteRecord`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.accessJwt}`,
    },
    body: JSON.stringify({
      repo: session.did,
      collection: "app.bsky.feed.post",
      rkey,
    }),
  });
  if (!res.ok) throw new Error(`Bluesky sletning fejlede (${res.status}): ${await res.text()}`);
}

async function deleteFacebook(url: string): Promise<void> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("Mangler FB_PAGE_ACCESS_TOKEN");
  // post_url: https://www.facebook.com/<pageId>_<postId>
  const id = url.split("/").pop();
  if (!id) throw new Error(`Kunne ikke læse opslags-id ud af ${url}`);

  const res = await fetch(`${GRAPH}/${id}?access_token=${encodeURIComponent(token)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Facebook sletning fejlede (${res.status}): ${await res.text()}`);
}

/**
 * Hvad ER det for et token vi har? Facebook svarer med samme fejl (100/33)
 * både når objektet ikke findes, og når tokenet mangler rettigheder — så det
 * spørgsmål skal stilles direkte i stedet for at gætte.
 */
async function diagnoseFacebook(postUrl: string | null): Promise<void> {
  const token = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!token) return console.log("  FB: intet token i miljøet");
  const t = encodeURIComponent(token);

  const me = await fetch(`${GRAPH}/me?fields=id,name&access_token=${t}`);
  console.log(`  FB /me → ${me.status} ${(await me.text()).slice(0, 200)}`);

  const perms = await fetch(`${GRAPH}/me/permissions?access_token=${t}`);
  console.log(`  FB /me/permissions → ${(await perms.text()).slice(0, 400)}`);

  if (postUrl) {
    const id = postUrl.split("/").pop();
    const obj = await fetch(`${GRAPH}/${id}?fields=id,created_time,permalink_url&access_token=${t}`);
    console.log(`  FB GET opslag → ${obj.status} ${(await obj.text()).slice(0, 300)}`);
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const diagnose = process.argv.includes("--diagnose");
  const countryArg = process.argv.find((a) => a.startsWith("--country="))?.split("=")[1]?.toUpperCase();
  const ids = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);

  if (!countryArg && ids.length === 0) {
    console.error("Angiv kø-række-id'er eller --country=XX. Se social_posts.");
    process.exit(1);
  }

  const db = createD1Client();
  const where = countryArg
    ? "a.country = ? AND sp.status = 'posted'"
    : `sp.id IN (${ids.map(() => "?").join(",")}) AND sp.status = 'posted'`;
  const params: (string | number)[] = countryArg ? [countryArg] : ids;

  const rows = await db.query<Row>(
    `SELECT sp.id, sp.channel, sp.post_url, a.title, a.country
     FROM social_posts sp JOIN articles a ON a.id = sp.article_id
     WHERE ${where}`,
    params,
  );

  if (rows.results.length === 0) {
    console.log("Ingen postede opslag matcher.");
    return;
  }

  if (diagnose) {
    const fb = rows.results.find((r) => r.channel === "facebook");
    await diagnoseFacebook(fb?.post_url ?? null);
    return;
  }

  for (const row of rows.results) {
    const label = `#${row.id} ${row.channel} (${row.country}) "${row.title.slice(0, 50)}" → ${row.post_url}`;
    if (!row.post_url) {
      console.log(`  ⊘ ${label} — ingen URL gemt, kan ikke slettes automatisk`);
      continue;
    }
    if (dryRun) {
      console.log(`  [dry-run] ville slette ${label}`);
      continue;
    }
    try {
      if (row.channel === "bluesky") await deleteBluesky(row.post_url);
      else if (row.channel === "facebook") await deleteFacebook(row.post_url);
      else {
        console.log(`  ⊘ ${label} — kanalen har ingen sletning implementeret`);
        continue;
      }
      await db.execute(
        "UPDATE social_posts SET status = 'deleted', deleted_at = datetime('now') WHERE id = ?",
        [row.id],
      );
      console.log(`  ✓ slettet ${label}`);
    } catch (err) {
      console.error(`  ✗ ${label}\n     ${err}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
