/**
 * Karriere-tidslinje pr. atlet (slice 1: udtrækning).
 * Konservativ, regelbaseret udtrækning af kildebelagte priser/æresbevisninger
 * fra en artikels tekst (titel + ingress + brødtekst + faktaark). Engelsk
 * (faktaark) + dansk (artikel). Kun klare match → resten kan kurateres i admin.
 *
 * significance styrer recall-vinduet i genereringen:
 *   honor   → år/karriere (All-American, Player of the Year, mesterskab, draftet)
 *   notable → ~en sæson   (ugens spiller, rekord)
 *   routine → uger        (almindelige resultater — udtrækkes ikke her endnu)
 */
export type Significance = "routine" | "notable" | "honor";

export interface ExtractedEvent {
  kind: string; // award | championship | record | transfer
  award_name: string; // kanonisk
  significance: Significance;
  summary: string;
}

interface Pattern {
  re: RegExp;
  kind: string;
  award: string;
  significance: Significance;
}

/**
 * Konference-forkortelser, som «All-ACC» og «All-SoCon» bygges af.
 *
 * Skolerne skriver næsten aldrig «All-Conference». De skriver forkortelsen, og
 * mønstret herunder fangede den ikke: NC State-bioen siger «Tabbed to All-ACC
 * Team for the second consecutive year», og udtrækket gav nul (17. september
 * 2026). Listen er EKSPLICIT frem for `All-[A-Z]{2,}`, fordi den generelle form
 * også ville tage «All-Time», «All-Access» og «All-Star».
 */
const CONFERENCES =
  "ACC|SEC|Big Ten|Big 12|Pac-12|Big East|Big Sky|Big South|SoCon|MAC|CUSA|C-USA|MVC|CAA|WCC|SSC|GSC|GLIAC|GLVC|ECC|NEC|OVC|Sun Belt|AAC|Ivy|Patriot|Horizon|Summit|WAC|MEAC|SWAC|America East|ASUN|Southland|SLC|NE-10|PSAC|RMAC|SIAC|MIAA|NSIC|GNAC|PacWest|Lone Star|MIAC|NCAC|NESCAC|SCIAC|UAA|Landmark|Empire 8";

const PATTERNS: Pattern[] = [
  // Academic All-America er en ANDEN pris end All-America og skal stå først;
  // den generelle form nedenfor ser bevidst bort fra den.
  {
    re: /\bacademic\s+all[-\s]?americ(a|an)\b/i,
    kind: "award",
    award: "Academic All-American",
    significance: "honor",
  },
  // «All-America Second Team» er den almindelige skrivemåde — uden n.
  {
    re: /(?<!academic\s)\ball[-\s]?americ(a|an)\b/i,
    kind: "award",
    award: "All-American",
    significance: "honor",
  },
  { re: /\ball[-\s]?conference\b/i, kind: "award", award: "All-Conference", significance: "honor" },
  {
    re: new RegExp(`\\ball[-\\s]?(${CONFERENCES})\\b`, "i"),
    kind: "award",
    award: "All-Conference",
    significance: "honor",
  },
  { re: /\ball[-\s]?(region|district)\b/i, kind: "award", award: "All-Region", significance: "honor" },
  {
    re: /\b(player|athlete|freshman|rookie|defensive player|offensive player|pitcher|golfer|swimmer|newcomer) of the year\b/i,
    kind: "award",
    award: "Player of the Year",
    significance: "honor",
  },
  { re: /\bårets (spiller|atlet|nykommer)\b/i, kind: "award", award: "Årets spiller", significance: "honor" },
  { re: /\b(player|athlete) of the week\b/i, kind: "award", award: "Player of the Week", significance: "notable" },
  { re: /\bugens (spiller|atlet)\b/i, kind: "award", award: "Ugens spiller", significance: "notable" },
  { re: /\b(rookie|freshman) of the (week|month)\b/i, kind: "award", award: "Rookie of the Week/Month", significance: "notable" },
  { re: /\bmvp\b|\bmost valuable player\b/i, kind: "award", award: "MVP", significance: "honor" },
  /**
   * AT DELTAGE ER IKKE AT VINDE.
   *
   * Mønstret var `(national|conference|ncaa)\s+champion(ship)?s?` og matchede
   * derfor «competed at the NCAA Championships» — altså en kvalifikation — som
   * et mesterskab. På en stikprøve 17. september 2026 var det den hyppigste
   * udmærkelse i høsten, og det ville have skrevet på navngivne menneskers
   * profiler, at de har vundet noget, de har deltaget i.
   *
   * Nu kræves enten et sejr-udsagnsord tæt på, eller ordet «champion» om
   * PERSONEN (uden -ship). Grænsen på 60 tegn holder sig inden for sætningen.
   */
  {
    re: /\b(won|winner of|claimed|captured|secured)\b[^.]{0,60}\bchampionship\b|\bchampionship\b[^.]{0,40}\b(title|winners?)\b|\b(national|conference|ncaa|league)\s+champions?\b(?!hip)|\bvandt\b[^.]{0,60}\bmesterskab\b|\b(danmarks|verdens|europa)mester\b/i,
    kind: "championship",
    award: "Mesterskab",
    significance: "honor",
  },
  { re: /\b(school|national|conference|meet|ncaa)\s+record\b|\brekord\b/i, kind: "record", award: "Rekord", significance: "notable" },
  { re: /\bdrafted\b|\bdraftet\b|\bdraft pick\b/i, kind: "transfer", award: "Draftet", significance: "honor" },
];

/** Udtræk distinkte begivenheder (max én pr. award_name) fra fritekst. */
export function extractEvents(text: string): ExtractedEvent[] {
  if (!text) return [];
  const seen = new Set<string>();
  const out: ExtractedEvent[] = [];
  for (const p of PATTERNS) {
    if (p.re.test(text) && !seen.has(p.award)) {
      seen.add(p.award);
      out.push({ kind: p.kind, award_name: p.award, significance: p.significance, summary: p.award });
    }
  }
  return out;
}

/** Akademisk sæson (US college, aug–jul) fra en ISO-dato (eller nu). */
export function seasonFromDate(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date();
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const start = m >= 7 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Lagret begivenhed (visning + admin). */
export interface AthleteEventRow {
  id: number;
  season: string | null;
  kind: string;
  award_name: string | null;
  summary: string;
  significance: Significance;
  source_url: string | null;
  occurred_on: string | null;
}
