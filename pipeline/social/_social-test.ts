/**
 * Unit-tests for social-modulets rene logik (pacing + copy).
 * Kør: npx tsx pipeline/social/_social-test.ts
 */
import { cardReadyClause, distributionAllowed } from "./post-social";
import { bluesky } from "./channels/bluesky";
import { facebook } from "./channels/facebook";
import {
  DEFAULT_PACING,
  computeGapMinutes,
  isExpired,
  parseUtc,
  shouldPostNow,
} from "./pacing";
import { buildPostText, truncate } from "./copy";
import { cardBlobKey } from "../../src/lib/seo";

let passed = 0;
let failed = 0;

function expect(label: string, got: unknown, want: unknown): void {
  if (Object.is(got, want)) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: fik ${JSON.stringify(got)}, forventede ${JSON.stringify(want)}`);
  }
}

// ── parseUtc ─────────────────────────────────────────────────────────────────
expect(
  "parseUtc: D1-format tolkes som UTC",
  parseUtc("2026-06-11 12:00:00").toISOString(),
  "2026-06-11T12:00:00.000Z",
);
expect(
  "parseUtc: ISO med Z passerer uændret",
  parseUtc("2026-06-11T12:00:00Z").toISOString(),
  "2026-06-11T12:00:00.000Z",
);

// ── computeGapMinutes (drainTarget 24t, clamp 60–180 min) ────────────────────
expect("gap: tom kø → max-gap", computeGapMinutes(0), 180);
expect("gap: 1 i kø → max-gap (24t/1 clamped til 180)", computeGapMinutes(1), 180);
expect("gap: 8 i kø → 24t/8 = 180", computeGapMinutes(8), 180);
expect("gap: 12 i kø → 120 min", computeGapMinutes(12), 120);
expect("gap: 24 i kø → 60 min", computeGapMinutes(24), 60);
expect("gap: 100 i kø → hård grænse 60 min", computeGapMinutes(100), 60);

// ── shouldPostNow ────────────────────────────────────────────────────────────
const now = new Date("2026-06-11T12:00:00Z");
expect("post: tom kø → nej", shouldPostNow(null, 0, now), false);
expect("post: aldrig postet før → ja", shouldPostNow(null, 3, now), true);
expect(
  "post: 2t siden sidst, lille kø (gap 180) → nej",
  shouldPostNow("2026-06-11 10:00:00", 3, now),
  false,
);
expect(
  "post: 3t siden sidst, lille kø (gap 180) → ja",
  shouldPostNow("2026-06-11 09:00:00", 3, now),
  true,
);
expect(
  "post: 1t siden sidst, dyb kø (gap 60) → ja",
  shouldPostNow("2026-06-11 11:00:00", 50, now),
  true,
);
expect(
  "post: 30 min siden sidst, dyb kø → nej (hård grænse)",
  shouldPostNow("2026-06-11 11:30:00", 50, now),
  false,
);

// ── isExpired (48t) ──────────────────────────────────────────────────────────
expect("expiry: 47t i kø → frisk", isExpired("2026-06-09 13:00:00", now), false);
expect("expiry: 49t i kø → udløbet", isExpired("2026-06-09 11:00:00", now), true);

// ── truncate ─────────────────────────────────────────────────────────────────
expect("truncate: kort tekst urørt", truncate("Hej verden", 50), "Hej verden");
const long = "a".repeat(10) + " " + "b".repeat(300);
expect("truncate: overholder max", [...truncate(long, 100)].length <= 100, true);
expect("truncate: ender med ellipse", truncate(long, 100).endsWith("…"), true);

// ── buildPostText ────────────────────────────────────────────────────────────
const input = {
  title: "Emma Hansen scorer hattrick i sæsonpremieren",
  summary: "Den danske angriber viste klassen fra start.",
  url: "https://studentathlete.dk/fodbold/emma-hansen-hattrick",
};
expect(
  "copy: bluesky = ren titel (link ligger i embed)",
  buildPostText(input, "bluesky"),
  input.title,
);
expect(
  "copy: x = titel + link",
  buildPostText(input, "x"),
  `${input.title}\n\n${input.url}`,
);
expect(
  "copy: facebook = titel + ingress (link sendes separat)",
  buildPostText(input, "facebook"),
  `${input.title}\n\n${input.summary}`,
);
expect(
  "copy: facebook uden ingress = kun titel",
  buildPostText({ ...input, summary: null }, "facebook"),
  input.title,
);
const longTitle = { ...input, title: "x".repeat(400) };
expect(
  "copy: bluesky-titel klippes til 300",
  [...buildPostText(longTitle, "bluesky")].length <= 300,
  true,
);
expect(
  "copy: x-titel klippes så titel+link holder sig under 280",
  [...buildPostText(longTitle, "x")].length <= 250 + 2 + longTitle.url.length,
  true,
);

// ── DEFAULT_PACING sanity ────────────────────────────────────────────────────
expect("config: hård grænse er 1/time", DEFAULT_PACING.minGapMinutes, 60);
expect("config: expiry 48t", DEFAULT_PACING.expiryMinutes, 48 * 60);


// ── Distribution pr. land (hændelsen 2026-08-05) ─────────────────────────────
// Den danske Facebook-side og Bluesky-konto postede en BRITISK artikel, midt i
// UK-sitets dark launch. To ting manglede: kanalen kendte ikke sit land, og
// dark launch spærrede kun for søgemaskiner — ikke for distribution.
expect("kanal: bluesky er en dansk konto", bluesky.country, "DK");
expect("kanal: facebook er en dansk konto", facebook.country, "DK");
expect("distribution: DK er tilladt", distributionAllowed("DK"), true);
expect("distribution: UK er dark launch → spærret", distributionAllowed("UK"), false);
expect("distribution: ukendt land falder tilbage på standardsitet", distributionAllowed("ZZ"), true);

// ── Kort før opslag (Amtrup 2026-08-18, #108 2026-08-20) ─────────────────────
// Begge opslag gik ud FØR artiklens 1200×630-kort var rendret, fik /api/og's
// 600×315-fallback i stedet — mens siden lovede 1200 — og endte uden billede på
// Facebook. Køen spørger nu efter kortet, og nøglen i SQL'en SKAL være den
// samme som `cardBlobKey()` bygger; ellers venter køen på et kort der aldrig
// findes, eller poster et der ikke er der.
expect(
  "kort-gate: SQL'ens nøgle matcher cardBlobKey",
  cardReadyClause("a").includes(`'${cardBlobKey(42).replace("42", "' || a.id || '")}'`),
  true,
);
expect(
  "kort-gate: alias bruges (så klausulen kan genbruges)",
  cardReadyClause("x").includes("x.id"),
  true,
);

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
