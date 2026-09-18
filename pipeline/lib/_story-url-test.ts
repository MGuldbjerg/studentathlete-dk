/**
 * Test af historie-nøglen. Sagen er ægte: Nathan Hopley stod to gange i køen,
 * fordi den ene kilde-URL var http og den anden https.
 */
import { normalizeSourceUrl, storyHash } from "./story-url";

let passed = 0, failed = 0;
function ok(cond: boolean, name: string) { if (cond) passed++; else { failed++; console.error(`✗ ${name}`); } }
function eq(a: unknown, b: unknown, name: string) {
  if (a === b) passed++; else { failed++; console.error(`✗ ${name}\n    fik: ${JSON.stringify(a)}  forventet: ${JSON.stringify(b)}`); }
}

const A = "http://kingtornado.com/news/2026/9/15/mens-golf-final-day.aspx";
const B = "https://kingtornado.com/news/2026/9/15/mens-golf-final-day.aspx";
eq(storyHash(42, A), storyHash(42, B), "http og https er samme historie");
eq(storyHash(42, B), storyHash(42, B + "/"), "afsluttende skråstreg betyder intet");
eq(storyHash(42, B), storyHash(42, "https://WWW.KingTornado.com/news/2026/9/15/mens-golf-final-day.aspx"),
   "www og store bogstaver i værten betyder intet");

ok(storyHash(42, B) !== storyHash(43, B), "to atleter deler ikke nøgle på samme artikel");
ok(storyHash(42, B) !== storyHash(42, "https://kingtornado.com/news/2026/9/16/anden-artikel.aspx"),
   "to artikler er to historier");
ok(storyHash(42, B) !== storyHash(42, "https://kingtornado.com/news/2026/9/15/mens-golf-final-day.aspx?page=2"),
   "query-strengen bevares — den kan være hele artiklen");

eq(normalizeSourceUrl("https://www.Example.com/Sti/"), "example.com/Sti", "stien beholder store bogstaver");
eq(normalizeSourceUrl("ikke en url"), "ikke en url", "uparselbar adresse bliver sin egen nøgle");

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
