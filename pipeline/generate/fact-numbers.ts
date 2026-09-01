/**
 * Tal i en kladde, holdt op mod de tal der er DÆKNING for.
 *
 * Ét sted, tre brugere: backtest-scorecardet, kladdetjekket og selve
 * genereringen. Der lå to implementeringer i en periode — scorecardets
 * `fabricatedNumbers` og checks/draft-numbers.ts — og de var ikke enige:
 * kun den ene kendte skrevne tal. To faktatjek der svarer forskelligt er
 * værre end ét, for så ved man ikke hvilket der gælder.
 *
 * Reglen er bevidst simpel og uden skøn: står tallet i faktaarket, kilden
 * eller atletens profil, er der dækning. Ellers ikke. En model kan ikke
 * regne, men den kan lyde overbevisende — og et opdigtet minuttal ligner
 * et ægte til forveksling.
 */

/**
 * Skrevne tal dækker det tilsvarende ciffer.
 * Kilden skriver «struck first in the fourth minute»; kladden skriver «4.
 * minut». Uden den her tabel meldes 4-tallet som udækket — og en falsk alarm
 * i et faktatjek er dyr: den lærer læseren at ignorere det.
 */
const WRITTEN_NUMBERS: Record<string, string> = {
  first: "1", second: "2", third: "3", fourth: "4", fifth: "5",
  sixth: "6", seventh: "7", eighth: "8", ninth: "9", tenth: "10",
  eleventh: "11", twelfth: "12",
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
};

/** Alle heltal i en tekst, som strenge. */
export function numbersIn(text: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") cur += ch;
    else {
      if (cur) out.push(cur);
      cur = "";
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Cifrene som en tekst udtrykker med bogstaver. */
export function digitsFromWords(text: string): string[] {
  const lower = text.toLowerCase();
  const out: string[] = [];
  for (const [word, digit] of Object.entries(WRITTEN_NUMBERS)) {
    if (lower.includes(word)) out.push(digit);
  }
  return out;
}

/**
 * Tal der ALDRIG tælles som påstande.
 *
 * Målt mod korpusset af menneskeredigerede artikler var det her de falske
 * alarmer sad (se backtest/checker-precision.ts):
 *
 * · 45 og 90 er en halvleg og en kamp i fodbold. «de sidste 45 minutter» er
 *   sprogbrug, ikke en statistik nogen kan have opfundet.
 * · Årstal er kalender, ikke resultat. Faktaarket skriver sjældent sæsonåret
 *   ud, selv om begivenhedsdatoen indeholder det.
 *
 * FORBEHOLD: kalibreret på 15 advarsler i alt. Det er få, og listen skal ikke
 * vokse hver gang et tal driller — så tilpasser vi tjekket til støjen i stedet
 * for til virkeligheden. Nye undtagelser kræver et større korpus.
 */
function isStructural(n: string): boolean {
  if (n === "45" || n === "90") return true;
  if (n.length === 4) {
    const y = Number(n);
    if (y >= 1900 && y <= 2100) return true;
  }
  return false;
}

/** Tal i teksten som hverken faktaark, kilde eller profil kender. */
export function unsupportedNumbers(articleText: string, factText: string): string[] {
  const known = new Set(numbersIn(factText));
  for (const d of digitsFromWords(factText)) known.add(d);
  const seen = new Set<string>();
  const bad: string[] = [];
  for (const n of numbersIn(articleText)) {
    if (seen.has(n)) continue;
    seen.add(n);
    if (isStructural(n)) continue;
    if (!known.has(n)) bad.push(n);
  }
  return bad;
}
