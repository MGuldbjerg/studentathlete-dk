/**
 * KRYDSTJEK: artiklens tal mod kampens faktiske forløb.
 *
 * Auditten 2026-08-30 målte 57 afviste kladder mod 43 udgivne artikler.
 * Resultatet var et NEGATIVT fund, og det er det vigtigste her:
 *
 *   overdrivelse i titel    afvist 12%   udgivet  5%
 *   fremtids-fyld           afvist 54%   udgivet 40%
 *   spekulativ vurdering    afvist 44%   udgivet 26%
 *   opfundet alder          afvist 18%   udgivet 16%
 *
 * Ingen af dem skiller. Forskellen på en god og en dårlig kladde ligger
 * ikke i SPROGET — den ligger i om tallene passer. `fabrication_risk`
 * fanger det heller ikke: 27 af 68 afvisninger var stemplet «low».
 *
 * Derfor sammenlignes her mod `match-facts` — kildens egen scoringsoversigt
 * og holdstatistik. Det er den eneste kontrol der kan se forskel på
 * «scorede i det 87.» og «scorede i det 80.».
 *
 * ⚠️ Kun MODSIGELSER rapporteres, aldrig manglende omtale. En artikel må
 * gerne udelade fire af fem mål; den må ikke placere det femte forkert.
 */
import type { MatchFacts } from "./match-facts";

export interface Contradiction {
  kind: "minute" | "scorer" | "team-stat";
  /** Det artiklen påstår. */
  claim: string;
  /** Det kilden siger. */
  source: string;
}

/** "07:16" → 8 (kilden tæller fra 0, referater fra 1). */
export function minuteOf(time: string): number | null {
  const m = /^(\d{1,3}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  return Number(m[1]) + 1;
}

/** Minuttal artiklen nævner: «in the 87th minute», «i det 39. minut». */
export function citedMinutes(text: string): number[] {
  const out = new Set<number>();
  for (const m of text.matchAll(/\b(\d{1,3})(?:st|nd|rd|th)\s+minute\b/gi)) out.add(Number(m[1]));
  for (const m of text.matchAll(/\bi\s+det\s+(\d{1,3})\.?\s*minut\b/gi)) out.add(Number(m[1]));
  for (const m of text.matchAll(/\b(\d{1,3})\.\s*minut\b/gi)) out.add(Number(m[1]));
  return [...out].filter((n) => n >= 1 && n <= 130);
}

/**
 * Et minuttal er i orden hvis det ligger inden for ±1 af et registreret mål.
 * Kilderne selv runder forskelligt: 07:16 omtales som «8th minute», 62:26 som
 * «63rd». Spændet er derfor bevidst, ikke slaphed.
 */
const MINUTE_SLACK = 1;

/** Ord der gør et minuttal til en påstand om et MÅL. */
const GOAL_WORDS =
  /\b(goal|scored?|scoring|slotted|finished|found the net|converted|struck|header|equalis|winner|nettede|scorede|udlignede|m[åa]l)\b/i;

/**
 * Minuttal med kontekst: handler sætningen omkring tallet om et mål?
 * Konteksten er ±120 tegn — nok til en sætning, ikke nok til at samle to op.
 */
export function citedMinuteContexts(text: string): Array<{ minute: number; aboutGoal: boolean }> {
  const out: Array<{ minute: number; aboutGoal: boolean }> = [];
  const seen = new Set<number>();
  const re = /\b(\d{1,3})(?:st|nd|rd|th)\s+minute\b|\bi\s+det\s+(\d{1,3})\.?\s*minut\b|\b(\d{1,3})\.\s*minut\b/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const minute = Number(m[1] ?? m[2] ?? m[3]);
    if (!(minute >= 1 && minute <= 130) || seen.has(minute)) continue;
    seen.add(minute);
    const around = text.slice(Math.max(0, m.index - 120), m.index + 120);
    out.push({ minute, aboutGoal: GOAL_WORDS.test(around) });
  }
  return out;
}

export function crossCheck(articleText: string, match: MatchFacts | null | undefined): Contradiction[] {
  const out: Contradiction[] = [];
  if (!match || !match.goals.length) return out;

  const goalMinutes = match.goals
    .map((g) => minuteOf(g.time))
    .filter((n): n is number => n !== null);
  if (!goalMinutes.length) return out;

  const earliest = Math.min(...goalMinutes);
  const latest = Math.max(...goalMinutes);

  for (const { minute: cited, aboutGoal } of citedMinuteContexts(articleText)) {
    // Knytter artiklen minuttet til et MÅL, tjekkes det altid: påstanden er
    // så præcis nok til at kunne modsiges. Ellers kun inden for kampens
    // scorings-vindue, for et løsrevet tal kan være en indskiftning eller en
    // redning — og dem kender vi ikke.
    //
    // Uden det slap #178 igennem: «his driven cross found Leitner … in the
    // 12th minute», hvor målene faldt i 45., 59. og 61. Tallet lå uden for
    // vinduet, men sætningen handlede utvetydigt om et mål.
    if (!aboutGoal && (cited < earliest - 5 || cited > latest + 5)) continue;
    const hit = goalMinutes.some((g) => Math.abs(g - cited) <= MINUTE_SLACK);
    if (!hit) {
      out.push({
        kind: "minute",
        claim: `${cited}. minut`,
        source: `mål registreret i: ${goalMinutes.join(", ")}`,
      });
    }
  }

  // Holdstatistik: nævner artiklen et redningstal kilden modsiger?
  const saves = match.teamStats?.rows.find((r) => r.label === "Saves");
  if (saves) {
    for (const m of articleText.matchAll(/\b(\d{1,3})\s+(?:saves|redninger)\b/gi)) {
      const n = Number(m[1]);
      if (!saves.values.includes(n)) {
        out.push({
          kind: "team-stat",
          claim: `${n} redninger`,
          source: `kilden: ${saves.values.join(" / ")}`,
        });
      }
    }
  }

  return out;
}
