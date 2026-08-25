/**
 * Fjern kildens FREMADRETTEDE afsnit, før faktaarket bygges.
 *
 * Mikkel, 2026-08-25: en kladde skrevet i dag om en kamp den 20. henviste til
 * «næste kamp» — som blev spillet i går. Kilden er et Sidearm-referat, og de
 * slutter alle med:
 *
 *     UP NEXT
 *     The Bonnies remain on the road as they travel to take on
 *     No. 23 West Virginia Monday, Aug. 24.
 *
 * Sætningen var sand da referatet blev skrevet. Den er det ikke, når vi
 * genererer fem dage senere — og modellen kan ikke selv se det. Vi har allerede
 * checkEventTiming(), som spærrer for at OMTALE en kamp der ikke er spillet;
 * dette er samme fejl vendt om: et referat der slæber en forældet kommende kamp
 * med sig.
 *
 * Vi retter det MEKANISK ved at fjerne materialet, ikke ved at bede modellen
 * lade være. Den lære står allerede i projekt-status: gratis-modeller følger
 * ikke pålidelige negative instrukser, og fejlklassen kræver spærrer frem for
 * promptformuleringer.
 *
 * Kun overskrifter der står ALENE på en linje tæller — så en sætning der
 * tilfældigt indeholder ordene ikke kapper artiklen midt over.
 */

const HEADINGS: ReadonlySet<string> = new Set([
  "UP NEXT",
  "NEXT UP",
  "WHAT'S NEXT",
  "WHATS NEXT",
  "UPCOMING",
  "UPCOMING EVENT",
  "UPCOMING EVENTS",
  "NÆSTE KAMP",
  "KOMMENDE KAMPE",
]);

/** Linjen uden punktum/kolon/blanktegn, i versaler. */
function normalizeHeading(line: string): string {
  let t = line.trim().toUpperCase();
  while (t.endsWith(":") || t.endsWith(".") || t.endsWith("—") || t.endsWith("-")) {
    t = t.slice(0, -1).trim();
  }
  return t;
}

/**
 * Returnerer teksten uden det afsluttende «UP NEXT»-afsnit (og alt derefter —
 * i Sidearm-referater er resten sociale-medier-boilerplate). Findes ingen
 * overskrift, returneres teksten uændret.
 */
export function stripForwardLooking(text: string): string {
  if (!text) return text;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (HEADINGS.has(normalizeHeading(lines[i]))) {
      // Er overskriften det allerførste, er der intet referat at bevare —
      // så er teksten ikke et referat, og vi rører den ikke.
      if (i === 0) return text;
      return lines.slice(0, i).join("\n").trimEnd();
    }
  }
  return text;
}
