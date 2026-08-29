/**
 * Danske navne der har mistet deres æ, ø og å.
 *
 * Mikkel, 2026-08-29: «make it a thing you check regularly — the actual
 * spelling of Danish names.»
 *
 * Amerikanske rosters skriver ASCII. «Marcus Jørgensen» står derfor som
 * «Marcus Jorgensen» i `athletes.name`, og det er dét navn der ender i
 * sidens overskrift, i delekortet og i JSON-LD. Et forkert stavet navn er
 * den mest personlige fejl sitet kan lave.
 *
 * TO TIERS, og forskellen er vigtig:
 *
 *  1. **Bevis** — den rigtige stavemåde står ALLEREDE i vores egen godkendte
 *     profiltekst, fordi et menneske skrev den ind dér. Rettelsen findes; den
 *     ligger bare i den forkerte kolonne. Høj tillid, kan foreslås ordret.
 *
 *  2. **Mønster** — navnet indeholder et led hvor dansk aldrig bruger bart
 *     «o»: Jorgensen, Sorensen, Moller, Ostergaard, Sondergaard, Norgaard,
 *     Bjorn, Gron-. Flag til gennemsyn, ingen automatisk rettelse.
 *
 * ⚠️ «aa» og «ae» er IKKE med i tier 2. Aagaard, Kjaergaard og Baagøe er
 * lovlige danske stavemåder som mange bærer i deres dåbsattest — at «rette»
 * dem ville være at omdøbe et menneske. Kun bevis-tieren rører dem.
 */

/** Fold dansk til ASCII, så to stavemåder af samme navn kan sammenlignes. */
export function foldDanish(s: string): string {
  return s
    .replace(/ø/g, "o").replace(/Ø/g, "O")
    .replace(/æ/g, "ae").replace(/Æ/g, "Ae")
    .replace(/å/g, "aa").replace(/Å/g, "Aa")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tier 1: står den rigtige stavemåde i vores egen tekst?
 *
 * Leder efter en navnelignende ordfølge der folder til det samme som
 * `name`, men som FAKTISK har æ/ø/å. Findes den, er den beviset.
 */
export function correctionFromText(
  name: string,
  text: string | null | undefined,
): string | null {
  const base = (name ?? "").trim();
  const body = (text ?? "").trim();
  if (!base || !body) return null;

  const folded = foldDanish(base);
  const candidates = body.match(
    /[A-ZÆØÅ][\wÆØÅæøå'’-]*(?: [A-ZÆØÅ][\wÆØÅæøå'’-]*){0,3}/g,
  );
  if (!candidates) return null;

  for (const cand of candidates) {
    if (cand === base) continue;
    if (!/[ÆØÅæøå]/.test(cand)) continue;
    if (foldDanish(cand) === folded) return cand;
  }
  return null;
}

/**
 * Tier 2: led hvor dansk aldrig skriver bart «o». Returnerer de fundne led,
 * så rapporten kan vise HVAD der ser forkert ud — ikke bare at noget gør.
 */
const O_ELEMENTS: Array<[RegExp, string]> = [
  [/\bjorgensen\b/i, "Jørgensen"],
  [/\bsorensen\b/i, "Sørensen"],
  [/\bmoller\b/i, "Møller"],
  [/\bostergaard\b/i, "Østergaard"],
  [/\bsondergaard\b/i, "Søndergaard"],
  [/\bnorgaard\b/i, "Nørgaard"],
  [/\bbjorn/i, "Bjørn"],
  [/\bgron(borg|dahl|lund|kjaer)\b/i, "Grøn-"],
  [/\bkobenhavn\b/i, "København"],
];

export function looksTransliterated(name: string): string[] {
  const n = (name ?? "").trim();
  if (!n) return [];
  return O_ELEMENTS.filter(([re]) => re.test(n)).map(([, suggestion]) => suggestion);
}
