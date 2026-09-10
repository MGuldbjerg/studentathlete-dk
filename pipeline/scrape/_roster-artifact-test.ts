/**
 * Tests for the guard that stops a table heading becoming an athlete.
 *
 * The two real cases are Louisville's track roster, which minted #803
 * "Distance" (an event group used as a section header) and #2836 "R-So." (the
 * class-year column landing in the name cell). A factsheet was then built for
 * "Distance" from a coach-hire announcement about a real person who is not in
 * our database — fiction attached to fiction.
 *
 * The other half of these cases matters more: the guard must never drop a real
 * athlete. Single-word names are real, hyphens and apostrophes and non-ASCII
 * letters are real, and a name that merely CONTAINS an artifact word is real.
 */
import { isRosterArtifact } from "../../src/lib/roster-clean";
import { isClassYearToken } from "../lib/class-year";

let passed = 0;
let failed = 0;

const isClassYear = isClassYearToken;

function rejected(name: string | null | undefined, why: string) {
  if (isRosterArtifact(name, isClassYear)) {
    passed++;
    console.log(`  ✓ rejected: ${JSON.stringify(name)} — ${why}`);
  } else {
    failed++;
    console.error(`✗ ${JSON.stringify(name)} SHOULD have been rejected (${why})`);
  }
}

function kept(name: string, why: string) {
  if (!isRosterArtifact(name, isClassYear)) {
    passed++;
    console.log(`  ✓ kept: ${JSON.stringify(name)} — ${why}`);
  } else {
    failed++;
    console.error(`✗ ${JSON.stringify(name)} is a real athlete but was rejected (${why})`);
  }
}

// ── The two that actually happened ───────────────────────────────────────────
rejected("Distance", "Louisville #803, an event group");
rejected("R-So.", "Louisville #2836, a class year");

// ── The rest of the vocabulary ───────────────────────────────────────────────
rejected("Sprints", "event group");
rejected("Pole Vault", "event group, two words");
rejected("distance", "lower case");
rejected("  Throws  ", "padded");
rejected("Hometown", "table header");
rejected("TBA", "placeholder");
rejected("Fr.", "class year");
rejected("Graduate", "class year, spelled out");
rejected("Redshirt Freshman", "class year, spelled out");
rejected("", "empty");
rejected(null, "missing");
rejected("   ", "whitespace");
rejected("--", "punctuation only");
rejected("12", "digits only");

// ── Real athletes the guard must not touch ───────────────────────────────────
// A false positive here silently deletes a person from the site.
kept("Rodrigo", "single-name athletes are real");
kept("Mikkel Guldbjerg", "ordinary name");
kept("Camille Lund Rasmussen", "three parts");
kept("Søren Ærtebjerg", "non-ASCII letters");
kept("Mary-Kate O'Brien", "hyphen and apostrophe");
kept("John Smith Jr.", "a class-year token as a SUFFIX is part of a real name");
kept("Distance Johnson", "an artifact word inside a real name");
kept("Sprint Adams", "likewise");
kept("Grace Fields", "'Fields' is a surname, 'field' is the artifact");
kept("Track Robinson", "unusual, but a person");
kept("Miles Sprinter", "both words evoke the table; neither matches it");

console.log(`\n${passed} bestået, ${failed} fejlet`);
if (failed > 0) process.exit(1);
