/**
 * IDENTITETSVAGT: handler kilden overhovedet om DEN atlet vi er ved at skrive om?
 *
 * Baggrund (2026-08-06, fundet ved gennemlæsning af de fem første britiske
 * kladder — to af dem handlede om det forkerte menneske):
 *
 *  · En Hall of Fame-artikel om Paul Grant, polostagspringer i 1970'erne, blev
 *    til en nyhed om førsteårsstuderende Iolo Grant — med en opfundet
 *    far-søn-relation.
 *  · En ansættelse af volleyballspilleren Bella Murray som træner blev til en
 *    nyhed om fodboldspilleren Josh Murray, komplet med hendes 3.135 assists
 *    og hendes træners citater om "Bella" og "hun".
 *
 * Begge slap igennem, fordi et EFTERNAVN var nok til at binde historie og
 * atlet sammen. Promptregler hjælper ikke her: modellen får en atlet-blok om
 * ét menneske og et faktaark om et andet, og gør præcis som den skal — den
 * fletter dem. Kontrollen skal ske FØR modellen kaldes, og den skal være
 * mekanisk.
 *
 * Vagten er bevidst konservativ: den blokerer kun når der er en KONKRET
 * modsigelse, ikke når noget blot mangler. Falsk blokering koster en artikel;
 * falsk godkendelse koster en påstand om et navngivent menneske.
 */
import { sportKeywords } from "../discover/extract-story";

export interface IdentityInput {
  /** Atletens fulde navn som det står i basen. */
  athleteName: string;
  /** "f" | "m" | null fra athletes.gender. */
  gender?: string | null;
  /** Kanonisk sports-slug fra athletes.sport. */
  sport?: string | null;
  /** Kildens tekst: overskrift + brødtekst + faktaark, samlet. */
  sourceText: string;
}

export type IdentityVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/** Hele-ord-match, Unicode-bevidst (samme regel som i discovery). */
function containsWord(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const re = new RegExp(
    `(^|[^\\p{L}])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^\\p{L}]|$)`,
    "iu",
  );
  return re.test(haystack);
}

function countMatches(text: string, words: string[]): number {
  let n = 0;
  for (const w of words) {
    const re = new RegExp(`(^|[^\\p{L}])${w}([^\\p{L}]|$)`, "giu");
    n += (text.match(re) ?? []).length;
  }
  return n;
}

const FEMALE_PRONOUNS = ["she", "her", "hers"];
const MALE_PRONOUNS = ["he", "him", "his"];

/**
 * Er kildeteksten om denne atlet?
 *
 * Tre spørgsmål, i den rækkefølge de er billigst at besvare:
 *  1. Står fornavnet der? Et efternavn alene identificerer ikke et menneske.
 *  2. Modsiger kildens stedord atletens køn ENTYDIGT? (Kun når teksten bruger
 *     ét køns stedord og intet af det andet — en artikel må gerne nævne andre.)
 *  3. Handler teksten entydigt om en ANDEN sportsgren?
 */
export function checkStoryIdentity(input: IdentityInput): IdentityVerdict {
  const text = input.sourceText ?? "";
  if (!text.trim()) return { ok: false, reason: "kilden har ingen tekst at kontrollere" };

  const parts = input.athleteName.trim().split(/\s+/);
  const firstName = parts.length > 1 ? parts[0] : "";
  const lastName = parts[parts.length - 1];

  // 1. Fornavn (eller fulde navn) skal stå i teksten.
  if (firstName && !containsWord(text, firstName)) {
    return {
      ok: false,
      reason: `kilden nævner aldrig fornavnet "${firstName}" — kun efternavnet "${lastName}" kan ikke identificere et menneske`,
    };
  }

  // 2. Entydigt modsatte stedord.
  const female = countMatches(text, FEMALE_PRONOUNS);
  const male = countMatches(text, MALE_PRONOUNS);
  if (input.gender === "m" && female >= 2 && male === 0) {
    return { ok: false, reason: `kilden bruger kun hunkønsstedord (${female}), men atleten er registreret som mand` };
  }
  if (input.gender === "f" && male >= 2 && female === 0) {
    return { ok: false, reason: `kilden bruger kun hankønsstedord (${male}), men atleten er registreret som kvinde` };
  }

  // 3. Entydigt en anden sportsgren.
  const own = sportKeywords(input.sport);
  if (own.length > 0) {
    const ownHits = countMatches(text, own);
    if (ownHits === 0) {
      const others: { sport: string; hits: number }[] = [];
      for (const other of ["soccer", "football", "basketball", "volleyball", "baseball", "tennis", "golf", "rowing", "track-and-field", "swimming-and-diving", "ice-hockey", "gymnastics"]) {
        if (other === (input.sport ?? "").toLowerCase()) continue;
        const hits = countMatches(text, sportKeywords(other));
        if (hits >= 2) others.push({ sport: other, hits });
      }
      if (others.length > 0) {
        const worst = others.sort((a, b) => b.hits - a.hits)[0];
        return {
          ok: false,
          reason: `kilden handler om ${worst.sport} (${worst.hits} omtaler) og nævner ikke atletens egen sport (${input.sport})`,
        };
      }
    }
  }

  return { ok: true };
}

/**
 * Har modellen opfundet et citat?
 *
 * Et citat i teksten, mens faktaarket ikke har ét eneste, er den alvorligste
 * fejltype sitet kan lave: ord lagt i munden på et navngivent menneske. Kladde
 * #99 (2026-08-06) tillagde en cheftræner to sætninger han aldrig har sagt, og
 * skrev "ifølge universitetets hjemmeside" ovenpå.
 *
 * Kun citater af en vis længde tæller — et enkelt ord i anførselstegn er et
 * udtryk, ikke et citat.
 */
export function hasUnsourcedQuote(articleText: string, factSheetQuoteCount: number): boolean {
  if (factSheetQuoteCount > 0) return false;
  return /["“”«»„][^"“”«»„\n]{25,}["“”«»„]/.test(articleText);
}
