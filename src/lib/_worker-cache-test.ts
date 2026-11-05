/**
 * Test of the edge-cache rules in front of OpenNext (workers/entry.ts).
 *
 * The case that matters most: `isProbe` must never match a reader page or a
 * real route — a false match turns a live page into a plain-text 404.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { KNOWN_API_ROUTES, NOT_FOUND_EDGE_TTL, edgeTtl, isCacheable, isProbe, probeResponse } from "./worker-cache";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

// Real paths — never probes.
for (const p of [
  "/", "/artikler", "/articles", "/golf", "/athletes", "/atleter/kalle-rahbek",
  "/athletes/allegra-o-sullivan", "/fodbold/kalle-rahbek-scorer-sejrsmaalet-og-sender-ucsb-til-big-west-championship",
  "/football/dillon-rajkovic-scores-chowan-s-equaliser-in-2-1-quarterfinal-defeat",
  "/field-hockey/anouk-bosket-scores-in-smith-s-2-0-win-over-wpi-to-end-regular-season",
  "/feed.xml", "/sitemap.xml", "/robots.txt", "/ads.txt", "/icon.png", "/og/cards/card-253-v9.webp",
  "/.well-known/security.txt", "/api/track", "/api/og", "/api/mcp", "/api/admin/land", "/api/digest/subscribe",
  "/admin", "/admin/tjek/12", "/statistik", "/viden/spil-i-usa", "/skoler/elon-university",
  "/athletes/o-brien-%C3%A6", "/privatliv",
]) ok(!isProbe(p), `real path is not a probe: ${p}`);

// Probes seen in the logs 2026-11-03/04.
for (const p of [
  "/.env", "/.env.staging", "/.git/config", "/.npmrc", "/backend/.env", "/v2/.env", "/static../.env",
  "/local.settings.json", "/vendor/composer/installed.json", "/composer.json", "/web.config",
  "/beta/phpinfo.php", "/settings.php", "/.aws/credentials.bak", "/pnpm-workspace.yaml", "/.dockerenv",
  "/actuator", "/wp-admin/install.php", "/wp-login.php", "/cgi-bin/luci", "/config.js.bak",
  "/api/.env", "/api/actuator", "/api/stripe", "/api/graphql", "/api", "/api/", "/api/v1/validate/code",
]) ok(isProbe(p), `probe: ${p}`);

// Every routed folder under src/app/api must be in KNOWN_API_ROUTES, or its
// requests would be answered as probes.
const apiDir = join(__dirname, "..", "app", "api");
for (const d of readdirSync(apiDir, { withFileTypes: true })) {
  if (!d.isDirectory() || d.name.startsWith("_")) continue;
  ok((KNOWN_API_ROUTES as readonly string[]).includes(d.name), `api route /api/${d.name} is in KNOWN_API_ROUTES`);
}

// Probe answer.
const pr = probeResponse();
ok(pr.status === 404, "probe answers 404");

// 404s are cached despite Next's no-store, for NOT_FOUND_EDGE_TTL.
const nf = new Response("x", { status: 404, headers: { "cache-control": "private, no-cache, no-store, max-age=0, must-revalidate" } });
ok(isCacheable(nf), "404 with Next's no-store is cacheable");
ok(edgeTtl(nf) === NOT_FOUND_EDGE_TTL, "404 edge TTL");
ok(!isCacheable(new Response("x", { status: 404, headers: { "set-cookie": "a=b" } })), "404 with a cookie is not cacheable");
ok(!isCacheable(new Response("x", { status: 500 })), "500 is not cacheable");
ok(!isCacheable(new Response("x", { status: 200, headers: { "cache-control": "no-store" } })), "200 no-store stays uncached");

// The page's own longer s-maxage wins (articles ask for an hour).
ok(edgeTtl(new Response("x", { headers: { "cache-control": "public, max-age=0, s-maxage=3600" } })) === 3600, "article TTL passes through");
ok(edgeTtl(new Response("x", { headers: { "cache-control": "public, max-age=0, s-maxage=300" } })) === 300, "reader TTL stays 5 min");

console.log(`worker-cache: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
