/**
 * FORHÅNDSOMTALE-VAGT: er begivenheden overhovedet sket endnu?
 *
 * Baggrund (2026-08-16, kladde #107): kilden var en kampannoncering — "Soccer
 * Hosts A&M-International on Sunday Night", skrevet dagen før kampen. Faktaarket
 * blev bygget korrekt: `event.date` = kampdagen, og INTET resultat, ingen stats,
 * ingen citater, fordi der endnu ikke var noget at rapportere. Modellen fik den
 * tomme mappe og skrev en kampreferat-artikel i datid — 16 timer før kickoff —
 * med opdigtet holdopstilling og opdigtet cheftræner.
 *
 * En model kan ikke selv se at fremtiden ikke er sket. Promptregler hjælper
 * ikke (regel 24+25 var i kraft da #107 blev skrevet). Kontrollen skal ske FØR
 * modellen kaldes, og den skal være mekanisk — samme lære som identitetsvagten.
 *
 * Vagten blokerer kun ved SAMMENFALD af to signaler:
 *   1. begivenhedens dato er ikke entydigt overstået, OG
 *   2. faktaarket har intet udfald at referere (ingen score, intet resultat,
 *      ingen placering, ingen tal).
 *
 * Begge dele skal gælde, fordi hver for sig rammer de forkerte:
 *   · En hædersbevisning ("named to Preseason Coaches' Team") er FÆRDIG i det
 *     øjeblik den offentliggøres — den har en dato i dag, men også en
 *     `placement`. Den skal skrives.
 *   · Et referat der lander samme dag som kampen har tal og score. Det skal
 *     også skrives.
 * Kun mappen der er både fremtidig OG tom er en forhåndsomtale.
 */

/** Kun de felter vagten læser — så den kan kaldes med et vilkårligt faktaark. */
export interface EventTimingSheet {
  event?: { type?: string | null; date?: string | null } | null;
  result?: { final_score?: string | null; outcome?: string | null; placement?: string | null } | null;
  stats?: Array<{ text: string }> | null;
}

export interface EventTimingInput {
  /** Faktaarket — objekt eller den rå JSON-streng fra stories.fact_sheet. */
  factSheet: EventTimingSheet | string | null | undefined;
  /** Tidspunktet artiklen skrives på. Injiceres så testene er deterministiske. */
  now: Date;
}

export type TimingVerdict =
  | { ok: true }
  | { ok: false; reason: string };

/** ISO-dag (UTC) som tal, fx 2026-08-16 → 20260816. Ingen tidszone-faldgruber. */
function isoDayNumber(y: number, m: number, d: number): number {
  return y * 10000 + m * 100 + d;
}

/** Læs "2026-08-16" (evt. med klokkeslæt efter). Alt andet → null. */
function parseIsoDay(raw: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y), month = Number(mo), day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return isoDayNumber(year, month, day);
}

function hasText(v: string | null | undefined): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Må vi skrive om denne begivenhed endnu?
 *
 * Bevidst konservativ, ligesom identitetsvagten: ukendt dato, ufortolkelig dato
 * eller manglende faktaark blokerer ALDRIG. Kun en dato der ikke er entydigt
 * overstået, kombineret med et faktaark uden udfald, stopper genereringen.
 */
export function checkEventTiming(input: EventTimingInput): TimingVerdict {
  let sheet: EventTimingSheet | null = null;
  if (typeof input.factSheet === "string") {
    try {
      sheet = JSON.parse(input.factSheet) as EventTimingSheet;
    } catch {
      return { ok: true }; // ulæseligt faktaark er ikke vagtens problem
    }
  } else {
    sheet = input.factSheet ?? null;
  }
  if (!sheet) return { ok: true };

  const rawDate = sheet.event?.date;
  if (!hasText(rawDate)) return { ok: true };
  const eventDay = parseIsoDay(rawDate as string);
  if (eventDay === null) return { ok: true };

  // "Overstået" = strengt før i dag (UTC). Dagen selv tæller som ikke-overstået:
  // amerikanske aftenkampe ligger typisk efter midnat UTC, så en kamp dateret
  // "i dag" kan sagtens ligge timer ude i fremtiden — præcis fælden i #107.
  const today = isoDayNumber(
    input.now.getUTCFullYear(),
    input.now.getUTCMonth() + 1,
    input.now.getUTCDate(),
  );
  if (eventDay < today) return { ok: true };

  const hasOutcome =
    hasText(sheet.result?.final_score) ||
    hasText(sheet.result?.outcome) ||
    hasText(sheet.result?.placement) ||
    (sheet.stats?.length ?? 0) > 0;
  if (hasOutcome) return { ok: true };

  const when = eventDay > today ? "ligger i fremtiden" : "er dateret i dag og kan endnu ikke være afsluttet";
  return {
    ok: false,
    reason: `begivenheden (${rawDate}) ${when}, og faktaarket har hverken resultat, placering eller tal — kilden er en forhåndsomtale, ikke et referat`,
  };
}
