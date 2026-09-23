/**
 * Test of the static OG paths.
 *
 * The case that matters most: a static-layer miss must reach /api/og with the
 * query string intact. If it did not, every article published since the last
 * deploy would lose its image.
 */
import { cardAssetPath, dynamicFallbackUrl, genericAssetPath, genericQuery } from "./og-static";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

ok(cardAssetPath(253, 9) === "/og/cards/card-253-v9.webp", "card path carries id and version");

const a = { title: "Gemma Tolputt", subtitle: "Valparaiso · Football", sport: "football", type: "athlete" as const, version: 1 };
const pa = genericAssetPath(a);
ok(/^\/og\/g\/[0-9a-f]{16}\.webp$/.test(pa), "generic path is a 16-hex file name");
ok(genericAssetPath({ ...a }) === pa, "same parameters give the same file");
ok(genericAssetPath({ ...a, subtitle: "Oakland · Football" }) !== pa, "changed subtitle gives a new file");
ok(genericAssetPath({ ...a, version: 2 }) !== pa, "design version bump gives a new file");
ok(genericAssetPath({ ...a, title: "Æblegrød Ø" }) !== pa, "non-ASCII titles hash without error");

const q = genericQuery(a);
ok(q.get("title") === "Gemma Tolputt" && q.get("type") === "athlete" && q.get("sport") === "football", "query carries what /api/og reads");
ok(!genericQuery({ title: "X", version: 1 }).has("subtitle"), "absent fields are left out");

const miss = dynamicFallbackUrl(new URL("https://studentathlete.dk/og/cards/card-9-v9.webp?type=card&article=9&v=9"));
ok(miss?.pathname === "/api/og", "a miss is routed to /api/og");
ok(miss?.search === "?type=card&article=9&v=9", "…with the query string intact");
ok(miss?.host === "studentathlete.dk", "…on the same host");
ok(dynamicFallbackUrl(new URL("https://studentathlete.dk/athletes/x")) === null, "non-OG paths are left alone");
ok(dynamicFallbackUrl(new URL("https://studentathlete.dk/ogling")) === null, "prefix match needs the slash");

console.log(`og-static: ${pass} ok, ${fail} failed`);
if (fail > 0) process.exit(1);
