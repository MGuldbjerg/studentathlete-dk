/**
 * A weekly award becomes a section on the match report it honours.
 * ===============================================================
 *
 * The rule (Mikkel, 2026-10-07): a single match is never held back for an
 * award that may come; when the award comes, it is added to the report
 * instead of written as a second, thinner article about the same weekend.
 * Today #555 (Martin, RMAC Goalkeeper of the Week) re-told #536's match.
 *
 * Which report: same athlete, same site, the last 10 days, and the award's
 * source must NAME the report's opponent or tournament — decided in code,
 * never by the model. No match → the award is its own article, as before.
 *
 * The model writes 1–3 sentences with the report as ALREADY TOLD. Its numbers
 * must all be in the award's fact sheet or the report; otherwise the section
 * is dropped and the award is written as its own article.
 *
 * Applying it is src/lib/article-addition.ts.
 */
import type { FactSheet } from "./build-factsheet";

/** Weekly honours. Preseason teams and watch lists are lists — step 2c. */
const WEEKLY_AWARD = /\b(of the week|weekly (award|honou?r)s?|honou?r roll)\b/i;
const NOT_WEEKLY = /\b(preseason|watch list|all-america|all-conference|all-tournament)\b/i;

export function isWeeklyAward(headline: string | null): boolean {
  const h = headline ?? "";
  return WEEKLY_AWARD.test(h) && !NOT_WEEKLY.test(h);
}

/** How far back a report the award can be added to is looked for. */
export const PARENT_DAYS = 10;

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ");
}

/**
 * The part of an opponent or tournament name a release will actually write:
 * «Colorado Mesa University» → «colorado mesa», «No. 14 Miami (Ohio)» →
 * «miami». Too short to be a name (under 4 letters) → null.
 */
export function nameCore(name: unknown): string | null {
  if (typeof name !== "string") return null;
  // A venue after « at » is not the name: «Argent Financial Classic at Squire Creek».
  const core = norm(name)
    .split(/\s+at\s+/)[0]
    .replace(/\(.*?\)/g, " ")
    .replace(/(no\.?\s*|#)\d+\b/g, " ")
    .replace(/\b(the|university|college|of)\b/g, " ")
    .replace(/[^a-z0-9' &-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return core.replace(/[^a-z]/g, "").length >= 4 ? core : null;
}

/**
 * The full core and, when the name has one, the part before «University» or
 * «College»: «Queens University of Charlotte» is «Queens» in a release
 * («JU's 1-1 draw at Queens», #553).
 */
export function nameCores(name: unknown): string[] {
  const full = nameCore(name);
  if (!full || typeof name !== "string") return full ? [full] : [];
  const lead = nameCore(norm(name).split(/\b(university|college)\b/)[0]);
  return lead && lead !== full ? [full, lead] : [full];
}

export interface ParentCandidate {
  id: number;
  title: string;
  published: number;
  articleType: string | null;
  factSheet: FactSheet | null;
}

/**
 * The report this award honours: the newest candidate whose opponent or
 * tournament the award's source names. Awards and additions never qualify.
 * `candidates` come newest first.
 */
export function findParent(awardText: string, candidates: ParentCandidate[]): ParentCandidate | null {
  const hay = norm(awardText);
  for (const c of candidates) {
    if (c.articleType === "addition" || isWeeklyAward(c.title)) continue;
    const ev = c.factSheet?.event;
    const opponents = Array.isArray(ev?.opponent) ? (ev?.opponent as unknown[]) : [ev?.opponent];
    const names = [...opponents, ev?.competition].flatMap(nameCores);
    if (names.some((n) => hay.includes(n))) return c;
  }
  return null;
}

const RULES = {
  en:
    "Write 1-3 sentences in British English that report the award and only facts that are NEW compared " +
    "with the article. Past tense. Refer to the athlete by surname. No praise or evaluative words of our " +
    "own, no headline, no heading, no markdown. Use only the NEW FACTS. Return only the sentences.",
  da:
    "Skriv 1-3 sætninger på dansk, der fortæller om kåringen og kun fakta der er NYE i forhold til " +
    "artiklen. Datid. Omtal atleten ved efternavn. Ingen ros eller vurderende ord fra vores side, ingen " +
    "overskrift, ingen markdown. Brug kun DE NYE FAKTA. Returnér kun sætningerne.",
} as const;

export function sectionPrompt(lang: "da" | "en", articleSoFar: string, newFacts: string): { system: string; prompt: string } {
  const system =
    lang === "da"
      ? "Du tilføjer et kort afsnit til en artikel, der allerede er skrevet. Du opfinder intet."
      : "You add a short paragraph to an article that is already written. You invent nothing.";
  const prompt = [
    lang === "da" ? "ARTIKLEN (allerede fortalt — gentag den ikke):" : "THE ARTICLE (already told — do not repeat it):",
    articleSoFar.trim(),
    "",
    lang === "da" ? "DE NYE FAKTA (den eneste kilde du må bruge):" : "THE NEW FACTS (the only source you may use):",
    newFacts.trim(),
    "",
    RULES[lang],
  ].join("\n");
  return { system, prompt };
}

/**
 * The model's answer as a plain paragraph, or null when it is not one: empty,
 * a heading, JSON, or longer than three sentences can be.
 */
export function cleanSection(raw: string): string | null {
  const t = raw
    .trim()
    .replace(/^```[a-z]*\s*|\s*```$/g, "")
    .replace(/^["“]|["”]$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.startsWith("{") || t.startsWith("#") || t.length > 700) return null;
  return t;
}
