/**
 * Unit-tests for de rene dele af Search Console-rapporten.
 *
 * Selve API-kaldene testes ikke (de kræver en nøgle og et netværk), men de tre
 * ting der KAN gå galt uden at nogen opdager det, gør:
 *
 *   1. Property-navnet. Search Console skelner `sc-domain:vært` fra
 *      `https://vært/`, og et forkert navn giver 403 — som ligner et
 *      rettighedsproblem, ikke en stavefejl.
 *   2. Datovinduet. Data halter 2-3 dage; slutter vinduet i DAG, ser hver
 *      kørsel ud som om trafikken faldt.
 *   3. Argumenterne. `--site=uk` skal vælge UK og intet andet.
 *
 * Kør: npx tsx pipeline/report/_search-console-test.ts
 */
import {
  isOpportunity,
  pathOf,
  groupByPage,
  type Opportunity,
  propertyCandidates,
  propertyMatchesHost,
  dateRange,
  parseArgs,
  formatRows,
  pct,
  type Row,
} from "./search-console";

let passed = 0;
let failed = 0;

function expect(label: string, got: unknown, want: unknown): void {
  const g = JSON.stringify(got);
  const w = JSON.stringify(want);
  if (g === w) passed++;
  else {
    failed++;
    console.error(`  ✗ ${label}: fik ${g}, forventede ${w}`);
  }
}

// ── Property-navne ──────────────────────────────────────────────────────────
expect(
  "kandidater: domæne-property først",
  propertyCandidates("student-athlete.co.uk")[0],
  "sc-domain:student-athlete.co.uk",
);
expect(
  "kandidater: URL-præfiks har afsluttende skråstreg",
  propertyCandidates("studentathlete.dk")[1],
  "https://studentathlete.dk/",
);
expect("match: domæne-property", propertyMatchesHost("sc-domain:studentathlete.dk", "studentathlete.dk"), true);
expect("match: URL-præfiks", propertyMatchesHost("https://studentathlete.dk/", "studentathlete.dk"), true);
expect("match: www regnes med", propertyMatchesHost("https://www.studentathlete.dk/", "studentathlete.dk"), true);
// Det farlige: de to sites må ALDRIG forveksles, heller ikke selvom navnene ligner.
expect("match: .dk er ikke .co.uk", propertyMatchesHost("sc-domain:studentathlete.dk", "student-athlete.co.uk"), false);
expect("match: co.uk er ikke .dk", propertyMatchesHost("https://student-athlete.co.uk/", "studentathlete.dk"), false);
expect("match: vrøvl giver false", propertyMatchesHost("ikke en url", "studentathlete.dk"), false);

// ── Datovindue ──────────────────────────────────────────────────────────────
const range = dateRange(28, new Date("2026-08-21T09:00:00Z"));
expect("vinduet slutter i GÅR (data halter)", range.end, "2026-08-20");
expect("28 dage inklusive begge ender", range.start, "2026-07-24");
const week = dateRange(7, new Date("2026-08-21T09:00:00Z"));
expect("7 dage: start", week.start, "2026-08-14");
expect("7 dage: slut", week.end, "2026-08-20");
// Månedsskifte må ikke give en ugyldig dato.
expect("hen over månedsskifte", dateRange(3, new Date("2026-03-02T09:00:00Z")).start, "2026-02-27");

// ── Argumenter ──────────────────────────────────────────────────────────────
expect("standard: begge sites", parseArgs([]).sites.sort(), ["DK", "UK"]);
expect("--site=uk vælger kun UK", parseArgs(["--site=uk"]).sites, ["UK"]);
expect("--site=DK vælger kun DK", parseArgs(["--site=DK"]).sites, ["DK"]);
expect("ukendt land vælges fra", parseArgs(["--site=zz"]).sites, []);
expect("standardvindue er 28 dage", parseArgs([]).days, 28);
expect("--days=7", parseArgs(["--days=7"]).days, 7);
expect("ugyldigt --days falder tilbage", parseArgs(["--days=abc"]).days, 28);
expect("--dimension=page", parseArgs(["--dimension=page"]).dimension, "page");
expect("--submit-sitemap", parseArgs(["--submit-sitemap"]).submit, true);
expect("--json", parseArgs(["--json"]).json, true);
expect("--inspect med lighedstegn", parseArgs(["--inspect=https://x/y"]).inspectUrl, "https://x/y");
expect("--inspect med mellemrum", parseArgs(["--inspect", "https://x/y"]).inspectUrl, "https://x/y");

// ── Formatering ─────────────────────────────────────────────────────────────
expect("CTR vises som procent", pct(0.0432), "4.3%");
const rows: Row[] = [
  { keys: ["british athletes ncaa"], clicks: 12, impressions: 340, ctr: 0.0353, position: 8.4 },
];
const lines = formatRows(rows, "query");
expect("tabellen har hoved + én række", lines.length, 2);
expect("nøglen står i rækken", lines[1].includes("british athletes ncaa"), true);
// En tom property er normalt de første dage — det skal SIGES, ikke vises som nul.
expect("tom liste forklarer sig selv", formatRows([], "query")[0].includes("ingen query"), true);

// ── Fredagsgennemgangen ────────────────────────────────────────────────────
const row = (position: number, impressions = 50): Row => ({
  keys: ["x"],
  clicks: 0,
  impressions,
  ctr: 0,
  position,
});
const band = { min: 5, max: 15, minImpressions: 10 };

expect("position 11 på en guide er en mulighed", isOpportunity(row(11), "guide", band), true);
expect("position 2 er der allerede", isOpportunity(row(2), "guide", band), false);
expect("position 30 er en anden slags problem", isOpportunity(row(30), "guide", band), false);
expect("grænserne er inklusive (5)", isOpportunity(row(5), "sport", band), true);
expect("grænserne er inklusive (15)", isOpportunity(row(15), "sport", band), true);
expect("for få visninger er støj", isOpportunity(row(9, 3), "guide", band), false);

// Mikkels afgrænsning: gennemgangen gælder statiske sider, ikke artikler.
expect("ARTIKLER er ude", isOpportunity(row(9), "article", band), false);
expect("atletprofiler er ude", isOpportunity(row(9), "athlete", band), false);
expect("skoleprofiler er ude", isOpportunity(row(9), "school", band), false);
expect("forsiden er med", isOpportunity(row(9), "home", band), true);
expect("arkivet er med", isOpportunity(row(9), "archive", band), true);
expect("sportslandingsside er med", isOpportunity(row(9), "sport", band), true);

expect("pathOf trimmer værten", pathOf("https://student-athlete.co.uk/guides/what-is-the-ncaa"), "/guides/what-is-the-ncaa");
expect("pathOf tåler vrøvl", pathOf("ikke en url"), "ikke en url");

const opps: Opportunity[] = [
  { page: "https://x/a", pageType: "guide", query: "q1", clicks: 0, impressions: 10, ctr: 0, position: 9 },
  { page: "https://x/b", pageType: "sport", query: "q2", clicks: 0, impressions: 90, ctr: 0, position: 7 },
  { page: "https://x/a", pageType: "guide", query: "q3", clicks: 0, impressions: 40, ctr: 0, position: 6 },
];
const grouped = groupByPage(opps);
expect("grupperet pr. side", grouped.length, 2);
expect("siden med flest visninger først", grouped[0].page, "https://x/b");
expect("visninger lægges sammen pr. side", grouped[1].impressions, 50);
expect("søgeord sorteret inden for siden", grouped[1].rows[0].query, "q3");

console.log(`\nsearch-console: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
