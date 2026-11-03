/**
 * Unit tests for the email digest. Run: npx tsx src/lib/_digest-test.ts
 */
import { buildConfirmEmail, buildDigestEmail, digestLinks, groupBySport, isToken, newToken, normalizeEmail, parseSports, sectionsFor, sportList } from "./digest";
import { COUNTRIES } from "./countries";

let failed = 0;
function ok(cond: boolean, msg: string) {
  if (!cond) { console.error("FAIL:", msg); failed++; }
}
function eq(a: unknown, b: unknown, msg: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`);
}

const uk = COUNTRIES.UK;
const dk = COUNTRIES.DK;

// Input
eq(normalizeEmail("  Anna@Example.COM "), "anna@example.com", "email trimmed and lower-cased");
eq(normalizeEmail("not an email"), null, "garbage rejected");
eq(normalizeEmail(42), null, "non-string rejected");
eq(parseSports(["golf", "nope", "golf", "field-hockey"]), ["golf", "field-hockey"], "unknown and duplicate sports dropped");
eq(parseSports("soccer,rowing"), ["soccer", "rowing"], "comma string accepted");
eq(parseSports(null), [], "nothing → empty");

const tok = newToken();
ok(isToken(tok), "new token has the token shape");
ok(newToken() !== tok, "tokens differ");
ok(!isToken("abc"), "short string is not a token");

// Links stay on the site's own domain
ok(digestLinks(uk, tok).confirm.startsWith(`https://${uk.host}/api/digest/confirm?t=`), "UK confirm link on the UK host");
ok(digestLinks(dk, tok).unsubscribe.startsWith(`https://${dk.host}/api/digest/unsubscribe?t=`), "DK unsubscribe link on the DK host");

// Sport lists read as language
eq(sportList(["golf"], "en"), "golf", "one sport");
eq(sportList(["golf", "rowing", "tennis"], "en"), "golf, rowing and tennis", "English list");
ok(sportList(["golf", "tennis"], "da").includes(" og "), "Danish list uses «og»");

// Sections: only chosen sports with stories, in the subscriber's order
const week = groupBySport([
  { title: "A", summary: null, slug: "a", sport: "golf" },
  { title: "B", summary: "b", slug: "b", sport: "soccer" },
  { title: "C", summary: null, slug: "c", sport: "golf" },
]);
eq(week.map((s) => [s.sport, s.articles.length]), [["golf", 2], ["soccer", 1]], "grouped by sport");
eq(sectionsFor(["soccer", "rowing", "golf"], week).map((s) => s.sport), ["soccer", "golf"], "chosen order, empty sport skipped");
eq(sectionsFor(["rowing"], week), [], "nothing this week → no sections");

// The digest email
const mail = buildDigestEmail(uk, sectionsFor(["golf"], week), tok, "source");
ok(mail.subject.includes(uk.brand), "subject names the site");
ok(mail.html.includes(`https://${uk.host}/golf/a?source=digest`), "article link on the UK host, tagged source=digest");
ok(!mail.html.includes("studentathlete.dk"), "no Danish host in a UK email");
ok(mail.html.includes(digestLinks(uk, tok).unsubscribe), "unsubscribe link in the HTML");
ok(mail.text.includes(digestLinks(uk, tok).manage), "manage link in the text part");
ok(!mail.html.includes("<script"), "no script in email");

const evil = buildDigestEmail(uk, [{ sport: "golf", articles: [{ title: "<b>x</b>", summary: null, slug: "x", sport: "golf" }] }], tok, "source");
ok(evil.html.includes("&lt;b&gt;x&lt;/b&gt;"), "titles are escaped");

const confirm = buildConfirmEmail(dk, ["golf"], tok);
ok(confirm.html.includes(digestLinks(dk, tok).confirm), "confirm email carries the confirm link");
ok(confirm.html.includes('lang="da"'), "Danish confirm email is marked Danish");

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("digest: all tests passed");
