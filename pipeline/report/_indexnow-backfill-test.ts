/** Test af sitemap-udtrækket. */
import { extractLocs } from "./indexnow-backfill";

let pass = 0, fail = 0;
function ok(cond: boolean, label: string): void {
  if (cond) pass++;
  else { fail++; console.log(`  ✗ ${label}`); }
}

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  "<url><loc>https://studentathlete.dk/</loc><lastmod>2026-08-27</lastmod></url>",
  "<url><loc>https://studentathlete.dk/atleter/daniel-helle</loc></url>",
  "</urlset>",
].join("\n");

const locs = extractLocs(xml);
ok(locs.length === 2, "to adresser fundet");
ok(locs[0] === "https://studentathlete.dk/", "første adresse");
ok(locs[1] === "https://studentathlete.dk/atleter/daniel-helle", "anden adresse");
ok(extractLocs("").length === 0, "tom streng");
ok(extractLocs("<urlset></urlset>").length === 0, "sitemap uden adresser");
ok(extractLocs("<loc>ikke-en-url</loc>").length === 0, "ikke-http frasorteres");
ok(extractLocs("<loc>https://x.dk/a").length === 0, "uafsluttet tag ignoreres");

console.log(`\nextractLocs: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
