/**
 * DIVISIONER: ét sted der oversætter et kommandolinje-argument til et
 * LIKE-mønster, og ét sted der siger hvilke sportsgrene vi overhovedet
 * registrerer for en division.
 *
 * Begge dele lå spredt før. `scrape-rosters.ts` skrev `NCAA ${division}` som
 * en konstant, mens `find-athletics-site.ts` havde lært at forstå NJCAA og
 * NAIA — så opdagelsen kunne finde junior colleges, men scraperen kunne
 * aldrig VÆLGE dem. Ugekørslen bad om "NCAA D1|D2|D3", og en NJCAA-række blev
 * derfor aldrig hentet, uanset hvor korrekt den stod i basen.
 */

/** Alle divisioner vi kender navnene på. Rækkefølgen er kun kosmetisk. */
export const DIVISION_PREFIXES = ["NCAA", "NJCAA", "NAIA"] as const;

/**
 * Argument → SQL-LIKE-mønster.
 *
 *   "D1"        → "NCAA D1"    (bagudkompatibelt: ugekørslens matrix siger D1/D2/D3)
 *   "NJCAA"     → "NJCAA%"     (hele tieren i ét job)
 *   "NJCAA D2"  → "NJCAA D2"
 *   null        → "%"          (alt)
 */
export function divisionPattern(division: string | null | undefined): string {
  if (!division || !division.trim()) return "%";
  const d = division.trim();
  const prefixed = DIVISION_PREFIXES.some((p) => d.toUpperCase().startsWith(p));
  if (!prefixed) return `NCAA ${d}`;
  // "NJCAA" alene dækker D1/D2/D3 — ellers ville man skulle køre tre jobs for
  // en tier hvor selv det største hold-antal er en brøkdel af NCAA's.
  return /\s/.test(d) ? d : `${d}%`;
}

/**
 * Hvilke sportsgrene registrerer vi for en division?
 *
 * `null` = alle. Junior colleges er tre gange NCAA D1 i antal skoler, men
 * bærer i dag én atlet i basen; at inventere alle 28 NJCAA-sportsgrene ville
 * lægge ~9.000 hold-rækker oven i de ~23.600 vi har, og de skal alle hentes
 * inden for det samme ugentlige budget.
 *
 * Målingen der satte listen (31/8): af fem stikprøvede Monroe-rosters lå ALLE
 * otte britiske atleter på herrefodbold — 0 i kvindefodbold, herrebasketball,
 * baseball og volleyball. Fodbold og basketball er JUCO-rekrutteringens
 * hovedveje, og amerikansk fodbold er hvorfor vi overhovedet kiggede
 * (Sebastian Tirsgaard Larsen, Monroe).
 *
 * Listen er en START, ikke en dom: udvid den når tallene siger noget andet.
 */
export function sportsForDivision(division: string | null | undefined): string[] | null {
  if (division && division.toUpperCase().startsWith("NJCAA")) {
    return ["soccer", "basketball", "football"];
  }
  return null;
}
