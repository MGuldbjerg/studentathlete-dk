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
