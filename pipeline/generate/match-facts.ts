/**
 * KAMPEN SELV — scoringsoversigt og holdstatistik, uden LLM.
 *
 * Baggrund (2026-08-29): ti kampreferat-kladder i træk blev afvist, og
 * fejlene var de samme hver gang — forkert målrækkefølge, forkerte
 * redningstal, opfundne oplæg. Årsagen var ikke generatoren: faktaarket
 * fangede pålideligt ATLETENS egen linje (mål, minutter, skud), men ikke
 * kampen omkring den. Bedt om at skrive et referat ud fra det, fylder
 * modellen hullerne.
 *
 * Oplysningerne står i kilden i forvejen, struktureret. De skal bare hentes —
 * regelbaseret, ikke gættet, og uden et LLM-kald (jf. token-effektivitets-
 * reglen: script før LLM).
 *
 * ⚠️ TO MARKUP-VARIANTER, og de vender tiden HVER SIN VEJ:
 *
 *   A «Scoring Summary»  →  Score at 07:16  Jack Steel (1) Assisted By: … GOAL by SBU …
 *   B «Scoring Plays»    →  Oliver Corris (1) Assisted By: … GOAL by UST …  30:25
 *
 * En regex bygget på A's rækkefølge parrede B's tider med den FORKERTE
 * scorer — Corris' mål blev tilskrevet Radeke. Derfor skæres teksten i
 * bidder pr. variant, og feltene læses inde i bidden.
 */

/** Ét mål, som kilden selv har registreret det. */
export interface Goal {
  /** "07:16" — kildens eget format, ikke omregnet til minuttal. */
  time: string;
  scorer: string;
  /** Navne i kildens rækkefølge; tom når målet var uassisteret. */
  assists: string[];
  /** Holdkoden kilden bruger ("SBU", "UWGB") — null når den ikke er angivet. */
  team: string | null;
  /** Straffespark? Kilden skriver det eksplicit. */
  penalty: boolean;
}

/** Holdstatistik: nøgletal for begge hold, i kildens egen rækkefølge. */
export interface TeamStats {
  /** Fx "Shots" → [11, 7]. Første tal er det hold der står først i kilden. */
  rows: Array<{ label: string; values: number[] }>;
  /** Holdkoderne, hvis de kunne læses: ["UWGB", "UST"]. */
  teams: string[];
}

export interface MatchFacts {
  goals: Goal[];
  teamStats: TeamStats | null;
}

/** Alt hvad der ikke er tekst, ud — begge varianter renderer til samme prosa. */
export function plainText(html: string): string {
  const noScript = html.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ");
  const noTags = noScript.replace(/<[^>]+>/g, " ");
  return decodeEntities(noTags).replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)));
}

/** Hvor slutter scoringsafsnittet? Det der kommer efter er andre tabeller. */
const SECTION_END = /\b(Game Leaders|Team Statistics|Players Mentioned|Related|Box Score|Goals\s+[A-Z]{2,})/;

function sectionAfter(text: string, heading: string): string | null {
  const i = text.indexOf(heading);
  if (i === -1) return null;
  const rest = text.slice(i + heading.length);
  const end = SECTION_END.exec(rest);
  return end ? rest.slice(0, end.index) : rest.slice(0, 3000);
}

const TIME = /\b(\d{1,3}:\d{2})\b/;

/**
 * Læs ét mål ud af én bid tekst. Bidden indeholder ikke tiden — den er
 * skåret fra af kalderen, fordi de to varianter placerer den forskelligt.
 */
function parsePlay(play: string, time: string): Goal | null {
  const text = play.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // Scoreren står forrest, evt. med sæsontotal i parentes: "Jack Steel (1)".
  //
  // ⚠️ Et navneord er «Stort forbogstav + småt» — IKKE en holdkode i versaler.
  // Straffesparks-formen har ingen parentes at stoppe ved: «Iesha Rollins NSU
  // Iesha Rollins PENALTY KICK GOAL», og en grådig navneregex slugte både
  // koden og gentagelsen («Iesha Rollins NSU Iesha»).
  const NAME_TOKEN = /^[A-Z][a-z'’.\-]/;
  const words = text.split(/\s+/);
  const nameWords: string[] = [];
  for (const w of words.slice(0, 4)) {
    if (!NAME_TOKEN.test(w)) break;
    nameWords.push(w.replace(/[(),.]+$/, ""));
  }
  if (!nameWords.length) return null;
  const scorer = nameWords.join(" ").trim();

  const assistMatch = /Assisted By:\s*([^]*?)(?=\s*GOAL by|\s*$)/i.exec(text);
  const assists = assistMatch
    ? assistMatch[1]
        .split(/\s*,\s*|\s+and\s+/)
        .map((a) => a.trim())
        .filter((a) => a.length > 1 && /^[A-Z]/.test(a))
    : [];

  const teamMatch = /GOAL by\s+([A-Za-z&.'-]+)/.exec(text);
  // Straffespark skrives uden "GOAL by": "… NSU Iesha Rollins PENALTY KICK GOAL."
  const penalty = /PENALTY KICK GOAL/i.test(text);
  // Ved straffespark står holdkoden lige efter navnet: «… NSU Iesha Rollins …»
  // Sæsontotalen kan stå imellem: «Miku Kurihara (3) UL Miku Kurihara …»
  const pkTeam = penalty
    ? /^\s*(?:\(\d+\)\s*)?([A-Z]{2,6})\b/.exec(text.slice(scorer.length))
    : null;

  return {
    time,
    scorer,
    assists,
    team: teamMatch ? teamMatch[1] : pkTeam ? pkTeam[1] : null,
    penalty,
  };
}

/**
 * Variant A: «Scoring Summary», tiden står FØRST i hver post.
 * Bidderne skæres på "Score at ".
 */
function parseVariantA(section: string): Goal[] {
  const goals: Goal[] = [];
  const parts = section.split(/Score at\s+/).slice(1);
  for (const part of parts) {
    const t = TIME.exec(part);
    if (!t || t.index > 2) continue; // tiden skal stå forrest i bidden
    const play = part.slice(t.index + t[0].length);
    const goal = parsePlay(play, t[1]);
    if (goal) goals.push(goal);
  }
  return goals;
}

/**
 * Variant B: «Scoring Plays», tiden står SIDST i hver post. Bidderne skæres
 * derfor EFTER tiden, og teksten før den er selve målet.
 */
function parseVariantB(section: string): Goal[] {
  const goals: Goal[] = [];
  const re = /([^]*?)\b(\d{1,3}:\d{2})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(section)) !== null) {
    const goal = parsePlay(m[1], m[2]);
    if (goal) goals.push(goal);
  }
  return goals;
}

/** Scoringsoversigten fra en kildeside. Tom liste når siden ikke har en. */
export function parseScoringSummary(html: string): Goal[] {
  const text = plainText(html);
  const a = sectionAfter(text, "Scoring Summary");
  if (a) {
    const goals = parseVariantA(a);
    if (goals.length) return goals;
  }
  const b = sectionAfter(text, "Scoring Plays");
  if (b) return parseVariantB(b);
  return [];
}

const STAT_LABELS = [
  "Goals", "Shots", "Shots on Goal", "Saves", "Corners", "Corner Kicks",
  "Offsides", "Fouls", "Penalty Corners", "Green Cards", "Yellow Cards", "Red Cards",
];

/**
 * Holdstatistik. To skrivemåder:
 *   A  "Goals NSU 1 UL 4 Shots NSU 6 UL 12 …"   (holdkode foran hvert tal)
 *   B  "UWGB UST Goals 1 1 Shots 11 7 …"        (koderne i en overskrift)
 */
export function parseTeamStats(html: string): TeamStats | null {
  const text = plainText(html);
  const rows: TeamStats["rows"] = [];
  const teams = new Set<string>();

  // Længste etiket først, så "Shots on Goal" ikke læses som "Shots".
  const labels = [...STAT_LABELS].sort((a, b) => b.length - a.length);
  for (const label of labels) {
    if (rows.some((r) => r.label === label)) continue;
    const withCodes = new RegExp(`\\b${label}\\s+([A-Z]{2,8})\\s+(\\d+)\\s+([A-Z]{2,8})\\s+(\\d+)\\b`).exec(text);
    if (withCodes) {
      teams.add(withCodes[1]); teams.add(withCodes[3]);
      rows.push({ label, values: [Number(withCodes[2]), Number(withCodes[4])] });
      continue;
    }
    const bare = new RegExp(`\\b${label}\\s+(\\d+)\\s+(\\d+)\\b`).exec(text);
    if (bare) rows.push({ label, values: [Number(bare[1]), Number(bare[2])] });
  }

  if (!rows.length) return null;
  return { rows, teams: [...teams] };
}

/** Hele kampen, som kilden har registreret den. */
export function parseMatchFacts(html: string): MatchFacts {
  return { goals: parseScoringSummary(html), teamStats: parseTeamStats(html) };
}
