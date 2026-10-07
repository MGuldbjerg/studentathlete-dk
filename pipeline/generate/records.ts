/**
 * Facts from our own records, computed in code (PLAN-richer-articles.md, step 3).
 * ==============================================================================
 *
 * Two things only StudentAthlete knows, stated as lines on the fact sheet's
 * `records` field — labelled as ours, never as the source's:
 *
 *   · the national angle: «one of four British players on Fort Lewis's men's
 *     soccer roster» — an indexed count of active athletes with that
 *     nationality at that school, sport and gender; only from two upwards;
 *   · our earlier articles: the headlines of OUR OWN published articles about
 *     the athlete since July, each a fact that has already been checked and
 *     published, with the event date from its own fact sheet.
 *
 * Not here: «the third British player to win an RMAC weekly award» — award
 * names are stored as categories («Player of the Week») without the
 * conference (checked 2026-10-07), so the count would be wrong.
 *
 * Pure functions; the two queries live in generate-articles.ts.
 */
import type { FactSheet } from "./build-factsheet";

export const NATIONALITY: Record<string, string> = { UK: "British", DK: "Danish" };

/** «women's soccer», «men's golf», «field hockey» — what a roster is called. */
export function rosterLabel(sport: string, gender: string | null): string {
  const s = sport.replace(/-/g, " ");
  if (gender === "f") return `women's ${s}`;
  if (gender === "m") return `men's ${s}`;
  return s;
}

/** The national-angle line, or null below two (one is just the athlete). */
export function rosterLine(
  name: string,
  count: number,
  country: string,
  university: string,
  sport: string,
  gender: string | null,
  asOf: Date,
): string | null {
  const nat = NATIONALITY[country];
  if (!nat || count < 2) return null;
  const date = asOf.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `${name} is one of ${count} ${nat} players on ${university}'s ${rosterLabel(sport, gender)} roster (as of ${date})`;
}

export interface PriorArticle {
  title: string;
  sourceUrl: string | null;
  factSheet: FactSheet | null;
}

/**
 * Up to three of our earlier published headlines this season, newest first,
 * without the one about this very event (same source page).
 */
export function earlierLines(prior: PriorArticle[], currentSourceUrl: string | null, max = 3): string[] {
  return prior
    .filter((p) => !currentSourceUrl || p.sourceUrl !== currentSourceUrl)
    .slice(0, max)
    .map((p) => {
      const date = typeof p.factSheet?.event?.date === "string" ? p.factSheet.event.date : null;
      // «Our earlier article», not «earlier this season»: the window starts in
      // July, and Whaley's U.S. Amateur final in August is not the college season.
      return `Our earlier article${date ? ` (event of ${date})` : ""}: «${p.title}»`;
    });
}

/** The sheet with our records attached. Kept apart from everything the source says. */
export function withRecords(fs: FactSheet, lines: string[]): FactSheet {
  if (!lines.length) return fs;
  return { ...fs, records: lines.map((text) => ({ text, source: "records" as const })) };
}
