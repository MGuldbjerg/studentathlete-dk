/** Tests for access_check. Run: npx tsx mcp/_access-check-test.ts */
import { type Deps, accessCheck, classifyCloudflare, formatChecks, missingSecrets, parseGhScopes } from "./access-check";

let pass = 0, fail = 0;
function expect(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  if (!ok) console.log(`✗ ${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`);
}

// Cloudflare answers
expect("200 success", classifyCloudflare(200, '{"success":true,"errors":[]}', "x").verdict, "yes");
expect("403 is no", classifyCloudflare(403, '{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}', "x").verdict, "no");
expect("R2 not enabled says so", classifyCloudflare(403, '{"success":false,"errors":[{"code":10042,"message":"enable R2"}]}', "x").detail.includes("not enabled"), true);
expect("a 500 is unknown, not no", classifyCloudflare(500, "oops", "x").verdict, "unknown");

// gh scopes
expect("scopes parsed", parseGhScopes("HTTP/2.0 200 OK\nx-oauth-scopes: repo, workflow, read:org\n"), ["repo", "workflow", "read:org"]);
expect("fine-grained token sends none", parseGhScopes("HTTP/2.0 200 OK\n"), null);
expect("missing secrets", missingSecrets(["ADMIN_TOKEN", "MCP_TOKEN"]), ["ANALYTICS_SALT", "GITHUB_TOKEN"]);

// The whole run, with a fake network: R2 refuses, Brevo key missing, one throw — and nothing leaks.
const SECRET = "sekret-token-value";
const deps: Deps = {
  env: { CLOUDFLARE_API_TOKEN: SECRET, CLOUDFLARE_ACCOUNT_ID: "acc", CLOUDFLARE_D1_DATABASE_ID: "db" },
  fetch: async (url) => {
    const ok = { status: 200, text: async () => '{"success":true,"errors":[]}' };
    if (url.includes("/r2/")) return { status: 403, text: async () => '{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}' };
    if (url.includes("properties/557937554")) return { status: 403, text: async () => "" };
    return ok;
  },
  exec: async (cmd) => {
    if (cmd === "gh") return "HTTP/2.0 200 OK\nx-oauth-scopes: repo, workflow\n";
    throw new Error(`wrangler failed with ${SECRET}`.replace(SECRET, "[hidden]"));
  },
  googleToken: async () => "gtoken",
};
async function main() {
const checks = await accessCheck(deps);
const by = (s: string) => checks.find((c) => c.service.startsWith(s));
expect("D1 reachable", by("Cloudflare D1")?.verdict, "yes");
expect("R2 refused", by("Cloudflare R2")?.verdict, "no");
expect("GA4 DK ok", by("GA4 Data API DK")?.verdict, "yes");
expect("GA4 UK refused", by("GA4 Data API UK")?.verdict, "no");
expect("gh scopes ok", by("GitHub")?.verdict, "yes");
expect("Brevo key missing is no", by("Brevo")?.verdict, "no");
expect("a throwing probe is unknown, not a crash", by("Worker secrets")?.verdict, "unknown");
const text = formatChecks(checks);
expect("report never contains the token", text.includes(SECRET), false);
expect("report counts", /\d+ can · \d+ cannot · \d+ unknown/.test(text), true);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
}
main();
