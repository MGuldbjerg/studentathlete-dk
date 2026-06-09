/**
 * Unit-tests for isDanishHometown(). Kør: npx tsx pipeline/lib/_danish-cities-test.ts
 *
 * Dækker især de bekræftede false positives (juni 2026): Lake Elsinore-atleter
 * (Bollerer, Rogers, Criss, Clark) + Josh Frerk (Denmark, Wis.) — alle amerikanske,
 * fejlklassificeret pga. "Elsinore"-aliaset + en US-stat-guard der kun tjekkede sidste
 * komma-del med forkortelser. Sikrer samtidig at ægte danskere stadig genkendes.
 */
import { isDanishHometown } from "./danish-cities";

let passed = 0;
let failed = 0;

function expect(hometown: string | null, want: boolean, label: string): void {
  const got = isDanishHometown(hometown);
  if (got === want) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: isDanishHometown(${JSON.stringify(hometown)}) = ${got}, forventede ${want}`);
  }
}

// ── Skal være FALSE (amerikanske / ikke-danske) ──────────────────────────────
// De fem bekræftede false positives med deres faktiske hometown-strenge fra D1:
expect("Lake Elsinore, California", false, "Bollerer — fuldt statsnavn");
expect("Lake Elsinore, CA / Centennial HS", false, "Rogers — stat ikke sidste del");
expect("Lake Elsinore, Caiif.", false, "Criss — typo-stat, fanges af fjernet Elsinore-alias");
expect("Lake Elsinore, Calif. / Temescal Canyon", false, "Clark — stat før high school");
expect("Denmark, Wis. / Denmark", false, "Frerk — by ved navn Denmark i Wisconsin");
// Øvrige kendte US-mønstre:
expect("Denmark, SC", false, "Denmark, South Carolina");
expect("Denmark, WI", false, "Denmark, Wisconsin (forkortelse)");
expect("Denmark, Wisconsin", false, "Denmark, Wisconsin (fuldt navn)");
expect("Viborg, SD", false, "Viborg, South Dakota (dansk bynavn, US-stat)");
expect("Copenhagen, NY", false, "Copenhagen, New York");
expect("Denmark High School, GA", false, "Denmark High School (skole-mønster)");
expect("Elsinore, UT", false, "Elsinore, Utah");

// ── Skal være TRUE (ægte danske atleter) ─────────────────────────────────────
expect("Skovlunde, Denmark", true, "Marqus Marion — ægte dansker (Skovlunde)");
expect("Aarhus, Denmark", true, "Aarhus, Denmark");
expect("Copenhagen, Denmark", true, "Copenhagen, Denmark");
expect("København, Danmark", true, "København, Danmark");
expect("Odense, Denmark", true, "Odense, Denmark");
expect("Vejle, Denmark", true, "Vejle, Denmark");
expect("Helsingør", true, "Helsingør (dansk by, intet land-marker)");
expect("Denmark", true, "Denmark alene (kun land)");
expect("Aalborg", true, "Aalborg (dansk by uden land)");

// ── Edge cases ───────────────────────────────────────────────────────────────
expect(null, false, "null hometown");
expect("", false, "tom streng");

console.log(`\nisDanishHometown: ${passed} bestået, ${failed} fejlet.`);
if (failed > 0) process.exit(1);
