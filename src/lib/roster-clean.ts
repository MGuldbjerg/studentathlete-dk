/**
 * Hygiejne for scrapede roster-felter. Sidearm-tabelceller kan indeholde
 * flere linjer ("Midfielder\n\t\t…\nM" — lang form + kortkode): behold KUN
 * første linje og kollaps whitespace. Bruges både ved INSERT i
 * scrape-rosters og defensivt i profil-tekstbyggeren.
 */
export function cleanPosition(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const firstLine = raw.split(/[\r\n]/)[0].replace(/\s+/g, " ").trim();
  return firstLine || null;
}

/**
 * Navnets hygiejne. Samme problem som positionen, men værre konsekvenser.
 *
 * Skolerne skriver navne med dobbelt mellemrum, hårde mellemrum (U+00A0) og
 * linjeskift ("Mikkel  Johansson", "Camille  Lund Rasmussen"). Uden normalisering
 * er "Mikkel Johansson" og "Mikkel  Johansson" to forskellige strenge, og
 * scraperen konkluderer derfor at SKOLEN har omdøbt atleten — hver eneste kørsel.
 * Set i praksis 2026-08-17: to falske navneskift på én kørsel, og teksten med
 * dobbelt mellemrum blev skrevet til det navn der vises på sitet.
 *
 * Kaldes ÉT sted (scrape-rosters, når rækken læses), så alle parsere er dækket.
 */
export function cleanRosterName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/[\u00a0\u2007\u202f\u2009\u200a]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || null;
}

/**
 * Er "navnet" i virkeligheden en tabel-artefakt frem for et menneske?
 *
 * Louisville's track roster minted two athletes that do not exist: #803
 * "Distance" (an event group used as a section header) and #2836 "R-So." (a
 * class year read as a name). Nothing published came of it, but a factsheet was
 * built for the phantom — a coach-hire announcement about a real person who is
 * not in our database, attached to the word "Distance". The identity guard
 * downstream cannot save us here, because the athlete record itself is fiction.
 *
 * The list is deliberately a VOCABULARY, not a heuristic. A false positive
 * silently drops a real athlete, and single-word names are real (a Brazilian
 * footballer may be listed as "Rodrigo"), so nothing is rejected for its shape —
 * only for being a word we know belongs to a table, not a person.
 */
const ROSTER_ARTIFACTS = new Set(
  [
    // Event and position groups used as roster section headings
    "distance", "mid-distance", "middle distance", "sprints", "sprint",
    "throws", "throw", "jumps", "jump", "hurdles", "relays", "multis",
    "multi-events", "combined events", "pole vault", "high jump", "long jump",
    "triple jump", "shot put", "discus", "javelin", "hammer", "heptathlon",
    "decathlon", "cross country", "field", "track", "diving", "swimming",
    "distance runners", "sprinters", "throwers", "jumpers",
    // Table headers and placeholders
    "name", "athlete", "athletes", "roster", "position", "pos", "height",
    "weight", "hometown", "high school", "class", "year", "number", "no",
    "total", "coach", "coaches", "staff", "tba", "tbd", "n/a", "na", "unknown",
  ].map((s) => s.toLowerCase()),
);

export function isRosterArtifact(
  name: string | null | undefined,
  /**
   * Injected so this module stays free of a pipeline import. Required, not
   * defaulted: a no-op default would silently drop the class-year half of the
   * guard. Pass `isClassYearToken` from pipeline/lib/class-year — NOT
   * `resolveClassYear(...).classYear !== null`, which is true for every string.
   */
  isClassYear: (s: string) => boolean,
): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  if (!n) return true;
  // Punctuation or digits alone is never a person.
  if (!/\p{L}/u.test(n)) return true;
  if (ROSTER_ARTIFACTS.has(n)) return true;
  // "R-So.", "Fr.", "Graduate" — the class-year column landed in the name cell.
  return isClassYear(name.trim());
}
