/**
 * The credit line next to a photo (src/lib/photo-credit.ts, rendered by
 * src/components/ui/PhotoCredit.tsx). Run: npx tsx src/lib/_photo-credit-test.ts
 *
 * Holds the wording the permission email promises: photographer when known,
 * "{School} Athletics", a Source link — on both sites.
 */
import { photoCreditParts, photoCreditText, safeSourceUrl } from "./photo-credit";

let passed = 0;
let failed = 0;
function eq(actual: unknown, expected: unknown, name: string): void {
  if (JSON.stringify(actual) === JSON.stringify(expected)) passed++;
  else { failed++; console.error(`  ✗ ${name}\n    got:      ${JSON.stringify(actual)}\n    expected: ${JSON.stringify(expected)}`); }
}

const url = "https://goduke.com/sports/mens-soccer/roster/jane-doe/123";

// Full line
eq(photoCreditText({ photographer: "Jane Doe", schoolName: "Duke", sourceUrl: url, lang: "da" }),
  "Foto: Jane Doe · Duke Athletics · Kilde", "da: photographer · school · Kilde");
eq(photoCreditText({ photographer: "Jane Doe", schoolName: "Duke", sourceUrl: url, lang: "en" }),
  "Photo: Jane Doe · Duke Athletics · Source", "en: photographer · school · Source");

// Without photographer / without URL
eq(photoCreditText({ schoolName: "Duke", sourceUrl: url, lang: "en" }), "Photo: Duke Athletics · Source", "no photographer");
eq(photoCreditParts({ photographer: "Jane Doe", schoolName: "Duke", lang: "da" }),
  { text: "Foto: Jane Doe · Duke Athletics", link: null }, "no URL → no link");
eq(photoCreditParts({ sourceUrl: url, lang: "en" }), { text: "", link: { href: url, label: "Source" } }, "only a URL → the link alone");
eq(photoCreditParts({ lang: "en" }), { text: "", link: null }, "nothing known → nothing");

// The link itself
eq(photoCreditParts({ schoolName: "Duke", sourceUrl: url, lang: "da" }).link, { href: url, label: "Kilde" }, "link href and label");
eq(safeSourceUrl("javascript:alert(1)"), null, "javascript: is never linked");
eq(safeSourceUrl("/relative/path"), null, "a relative path is never linked");
eq(safeSourceUrl("  " + url + " "), url, "spaces trimmed");

// Legacy rows (before migration 080): only photo_credit
eq(photoCreditText({ creditLine: "Foto: NC State Athletics", lang: "da" }), "Foto: NC State Athletics", "legacy da as stored");
eq(photoCreditText({ creditLine: "Foto: NC State Athletics", lang: "en" }), "Photo: NC State Athletics", "legacy en: Foto → Photo");
eq(photoCreditText({ creditLine: "Photo: NC State Athletics", lang: "da" }), "Foto: NC State Athletics", "legacy da: Photo → Foto");

// The default credit suggest-photos.ts writes says the same as the structured line
eq(photoCreditText({ schoolName: "Duke", creditLine: "Foto: Duke Athletics", sourceUrl: url, lang: "en" }),
  "Photo: Duke Athletics · Source", "default stored credit = structured line");
// A school's preferred line wins, and its photographer is not repeated
eq(photoCreditText({ photographer: "Jane Doe", schoolName: "Duke", creditLine: "Jane Doe/Duke Athletics Communications", sourceUrl: url, lang: "en" }),
  "Photo: Jane Doe/Duke Athletics Communications · Source", "preferred credit line wins, no repeat");

console.log(`\nphoto-credit: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
