/**
 * One-time AdSense sign-in: turns Mikkel's consent into a refresh token that
 * scripts/adsense-report.ts uses from then on.
 *
 * The AdSense Management API does not accept service accounts, so the GA4 key
 * can't be reused; it needs a person's OAuth consent, read-only.
 *
 * Before running (once):
 *   1. console.cloud.google.com → project studentathlete-506216 → APIs & Services
 *      → Library → "AdSense Management API" → Enable.
 *   2. OAuth consent screen: External, app name "StudentAthlete reports",
 *      PUBLISH the app ("In production") — in Testing mode the token dies after
 *      7 days. Google will call the app unverified; that's fine for your own use.
 *   3. Credentials → Create credentials → OAuth client ID → Desktop app.
 *      Download the JSON and save it as ~/.config/gcloud/adsense-client.json
 *
 * Run (WSL):  cd ~/projekter/studentathlete-dk && npx tsx scripts/adsense-auth.ts
 * Open the printed link, choose the Google account that owns AdSense, accept.
 * The token is written to ~/.config/gcloud/adsense-token.json (chmod 600).
 */
import { createServer } from "node:http";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";

const CLIENT_FILE = `${homedir()}/.config/gcloud/adsense-client.json`;
const TOKEN_FILE = `${homedir()}/.config/gcloud/adsense-token.json`;
const PORT = 8765;
const REDIRECT = `http://127.0.0.1:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/adsense.readonly";

const raw = JSON.parse(readFileSync(CLIENT_FILE, "utf8"));
const client = (raw.installed ?? raw.web) as { client_id: string; client_secret: string };
if (!client?.client_id) throw new Error(`${CLIENT_FILE} is not an OAuth client file (Desktop app)`);

const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
url.search = new URLSearchParams({
  client_id: client.client_id,
  redirect_uri: REDIRECT,
  response_type: "code",
  scope: SCOPE,
  access_type: "offline",
  prompt: "consent",
}).toString();

const server = createServer(async (req, res) => {
  const code = new URL(req.url ?? "/", REDIRECT).searchParams.get("code");
  if (!code) { res.end("No code in the request."); return; }
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: client.client_id, client_secret: client.client_secret,
      redirect_uri: REDIRECT, grant_type: "authorization_code",
    }),
  });
  const body = (await tok.json()) as { refresh_token?: string; error?: string };
  if (!body.refresh_token) {
    res.end(`No refresh token: ${JSON.stringify(body)}`);
    console.error("No refresh token:", body);
  } else {
    writeFileSync(TOKEN_FILE, JSON.stringify({ refresh_token: body.refresh_token, created: new Date().toISOString() }, null, 2));
    chmodSync(TOKEN_FILE, 0o600);
    res.end("Done — AdSense access saved. You can close this tab.");
    console.log(`Saved ${TOKEN_FILE}`);
  }
  server.close();
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Open this link and accept:\n\n${url}\n`);
});
