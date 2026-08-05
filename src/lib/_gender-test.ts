/**
 * Test af kønsudledningen. Den ene fejl der ville koste mest er "womens"
 * læst som "mens" — den har sin egen test her, og den kom fra virkeligheden
 * (Almi Nerurkar, guhoyas.com/sports/womens-track-and-field/…).
 */
import { genderFromTeamUrl, pronounHint } from "./gender";

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error(`✗ ${name}\n  fik:       ${actual}\n  forventet: ${expected}`);
  }
}

// ── Damehold ────────────────────────────────────────────────────────────────
eq(
  genderFromTeamUrl("https://guhoyas.com/sports/womens-track-and-field/roster/almi-nerurkar/17465"),
  "f",
  "womens-track-and-field (den rigtige sag)",
);
eq(genderFromTeamUrl("https://x.edu/sports/womens-soccer/roster"), "f", "womens-soccer");
eq(genderFromTeamUrl("https://x.edu/sports/w-tennis/roster"), "f", "w-tennis");
eq(genderFromTeamUrl("https://x.edu/sports/wbball/roster"), "f", "wbball");
eq(genderFromTeamUrl("https://x.edu/womens-golf/roster"), "f", "womens-golf uden /sports/");
eq(genderFromTeamUrl("https://x.edu/sports/women-rowing/roster"), "f", "women-rowing");

// ── Herrehold ───────────────────────────────────────────────────────────────
eq(genderFromTeamUrl("https://x.edu/sports/mens-basketball/roster"), "m", "mens-basketball");
eq(genderFromTeamUrl("https://x.edu/sports/m-tennis/roster"), "m", "m-tennis");
eq(genderFromTeamUrl("https://x.edu/sports/msoc/roster"), "m", "msoc");
eq(
  genderFromTeamUrl("https://guhoyas.com/news/2026/7/20/mens-xc-track-track-field.aspx"),
  "m",
  "mens-xc i en nyheds-URL",
);

// ── Ukendt ──────────────────────────────────────────────────────────────────
eq(genderFromTeamUrl("https://x.edu/sports/football/roster"), null, "kønsneutral sti");
eq(genderFromTeamUrl(null, undefined, ""), null, "tomme værdier");
eq(genderFromTeamUrl("https://womensports.example.com/roster"), null, "domænet tæller ikke med");

// ── Rækkefølge: første URL der siger noget, vinder ───────────────────────────
eq(
  genderFromTeamUrl(
    "https://x.edu/sports/womens-track-and-field/roster/a/1", // bio-URL: atletens EGET hold
    "https://x.edu/sports/mens-track-and-field/roster", // roster-URL: forkert hold
  ),
  "f",
  "bio-URL vinder over roster-URL",
);
eq(
  genderFromTeamUrl(null, "https://x.edu/sports/womens-soccer/roster"),
  "f",
  "springer tomme værdier over",
);

// ── Stedord ─────────────────────────────────────────────────────────────────
eq(pronounHint("f", "en"), "she/her", "engelsk hunkøn");
eq(pronounHint("m", "en"), "he/him", "engelsk hankøn");
eq(pronounHint("f", "da"), "hun/hende", "dansk hunkøn");
eq(pronounHint(null, "en"), null, "ukendt køn → intet hint");
eq(pronounHint("x", "en"), null, "ugyldig værdi → intet hint");

console.log(`gender: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
