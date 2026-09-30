/**
 * Genererings-side af karriere-tidslinjen (slice 2): byg kontinuitets-kontekst
 * fra atletens athlete_events, så artikler kan referere til tidligere
 * kildebelagte begivenheder ("anden sæson i træk som All-American").
 * recall: honor = sidste ~2 sæsoner (med "N. år i træk"-derivation); notable = denne sæson.
 */
export interface AthleteEvent {
  season: string | null;
  award_name: string | null;
  significance: "routine" | "notable" | "honor";
  summary: string;
}

function startYear(season: string | null): number {
  return season ? parseInt(season.slice(0, 4), 10) || 0 : 0;
}
function seasonLabel(y: number): string {
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
}

/** Aktuel akademisk sæson som startår (US college, aug–jul). */
export function currentSeasonStart(): number {
  const d = new Date();
  return d.getUTCMonth() + 1 >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
}

const LABELS = {
  da: { streak: (n: number) => `${n}. år i træk`, thisSeason: (n: number) => n > 1 ? `${n} gange i denne sæson, før denne historie` : "én gang i denne sæson, før denne historie" },
  en: { streak: (n: number) => `${n} years running`, thisSeason: (n: number) => n > 1 ? `${n} times so far this season, before this story` : "once so far this season, before this story" },
} as const;

/**
 * Compact context lines for the writer: honours with streaks, and this
 * season's weekly awards WITH COUNTS (2026-09-30 — the count is what makes
 * "her third Rookie of the Week award this season" possible; it used to be
 * deduplicated to one line per award). Labels follow the SITE's language.
 */
export function timelineForGeneration(events: AthleteEvent[], curStart: number, lang: "da" | "en"): string[] {
  const L = LABELS[lang];
  const lines: string[] = [];

  const honors = events.filter((e) => e.significance === "honor" && e.award_name);
  const byAward = new Map<string, number[]>();
  for (const e of honors) {
    const arr = byAward.get(e.award_name!) ?? [];
    arr.push(startYear(e.season));
    byAward.set(e.award_name!, arr);
  }
  for (const [award, raw] of byAward) {
    const years = [...new Set(raw)].sort((a, b) => b - a);
    if (curStart - years[0] > 2) continue; // too old for a natural callback
    let streak = 1;
    for (let i = 1; i < years.length; i++) {
      if (years[i] === years[i - 1] - 1) streak++;
      else break;
    }
    const seasons = years.slice(0, streak).reverse().map(seasonLabel).join(", ");
    lines.push(streak >= 2 ? `${award} (${L.streak(streak)}: ${seasons})` : `${award} (${seasons})`);
  }

  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.significance === "notable" && e.award_name && startYear(e.season) === curStart) {
      counts.set(e.award_name, (counts.get(e.award_name) ?? 0) + 1);
    }
  }
  for (const [award, n] of counts) lines.push(`${award} (${L.thisSeason(n)})`);
  return lines;
}
