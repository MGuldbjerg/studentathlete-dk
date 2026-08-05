/**
 * Test af webhook-opslaget pr. land. Offline — der sendes intet.
 *
 * Det eneste der kan gå galt her, er at et lands beskeder ender i det forkerte
 * rum, eller forsvinder helt fordi et secret mangler. Begge dele er dækket.
 */
import { webhookFor, adminLink } from "./notify";

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ${name}\n  fik:      ${actual}\n  forventet: ${expected}`);
  }
}

const saved = { ...process.env };
function setEnv(env: Record<string, string | undefined>) {
  delete process.env.DISCORD_WEBHOOK_URL;
  delete process.env.DISCORD_WEBHOOK_DK;
  delete process.env.DISCORD_WEBHOOK_UK;
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
}

// 1. Landets egen kanal vinder over fælleskanalen.
setEnv({ DISCORD_WEBHOOK_URL: "fælles", DISCORD_WEBHOOK_DK: "dansk", DISCORD_WEBHOOK_UK: "britisk" });
eq(webhookFor("DK"), "dansk", "DK → dansk kanal");
eq(webhookFor("UK"), "britisk", "UK → britisk kanal");
eq(webhookFor("uk"), "britisk", "landekode er ikke versalfølsom");
eq(webhookFor(), "fælles", "uden land → fælleskanalen");

// 2. Mangler landets kanal, falder beskeden tilbage — den må ALDRIG forsvinde.
setEnv({ DISCORD_WEBHOOK_URL: "fælles" });
eq(webhookFor("UK"), "fælles", "manglende landekanal → fælleskanalen");

// 3. Et ukendt land må heller ikke tabe beskeden.
eq(webhookFor("XX"), "fælles", "ukendt land → fælleskanalen");

// 4. Uden nogen webhooks er svaret null (kalderen logger og går videre).
setEnv({});
eq(webhookFor("DK"), null, "ingen webhooks → null");

// 5. Admin-linket peger på standardsitet OG sætter landet.
setEnv({ DISCORD_WEBHOOK_URL: "fælles" });
eq(
  adminLink("UK"),
  "https://studentathlete.dk/api/admin/land?code=UK&next=%2Fadmin",
  "admin-link sætter land og går til admin",
);
eq(
  adminLink("DK", "/admin/fotos"),
  "https://studentathlete.dk/api/admin/land?code=DK&next=%2Fadmin%2Ffotos",
  "admin-link kan pege på en underside",
);

process.env = saved;

console.log(`notify: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
