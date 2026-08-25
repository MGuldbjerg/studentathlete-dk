/** Test af sport-segment-udtrækket og den dansk-kun-slug-tabel. */
import { sportSegment, danishOnlySlugs } from "./localised-source-urls";

let pass = 0, fail = 0;
function eq(got: unknown, want: unknown, label: string): void {
  if (got === want) pass++;
  else { fail++; console.log(`  ✗ ${label}: fik ${JSON.stringify(got)}, ville ${JSON.stringify(want)}`); }
}

eq(sportSegment("https://gobonnies.com/sports/fodbold/news"), "fodbold", "simpel sti");
eq(sportSegment("https://x.com/sports/fodbold/news?feed=rss"), "fodbold", "query ignoreres");
eq(sportSegment("https://x.com/sports/mens-soccer/roster"), "mens-soccer", "engelsk slug");
eq(sportSegment("https://x.com/news/2026/8/20/recap.aspx"), null, "ingen /sports/");
eq(sportSegment(""), null, "tom streng");

const danish = danishOnlySlugs();
eq(danish.has("fodbold"), true, "fodbold er dansk-kun");
// REGRESSION: «football» er dansk slug for amerikansk fodbold, men også den
// engelske adresse for soccer — og den sti ENHVER amerikansk side bruger.
eq(danish.has("football"), false, "football maa ALDRIG flages");
eq(danish.has("atletik"), true, "atletik er dansk-kun");
// Ord der staves ens på begge sprog må ALDRIG flages — de er gyldige adresser.
eq(danish.has("basketball"), false, "basketball er ens på begge sprog");
eq(danish.has("golf"), false, "golf er ens på begge sprog");
eq(danish.has("tennis"), false, "tennis er ens på begge sprog");

console.log(`\nlocalised-source-urls: ${pass} bestået, ${fail} fejlet`);
if (fail > 0) process.exit(1);
