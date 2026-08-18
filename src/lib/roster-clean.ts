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
