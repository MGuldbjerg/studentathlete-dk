/**
 * The school page's own text (PLAN-content-floor-uk.md, S1–S3): who of ours
 * is there, what they have done this season, and how their teams are doing.
 * ===========================================================================
 *
 * S2 facts: the school's place, conference and division with one line on what
 *    the division means, and our athletes there by sport and how many are new.
 * S1 stats: this season's numbers of our players with stats, summed in a
 *    sentence (the table beside it does not count towards the floor).
 * S3 teams: each team with one of ours — its record and latest game, from the
 *    team context the daily fill stores (team-context.ts).
 * Every sentence is a number or a fact we hold; a paragraph with nothing to
 * say is left out. The site's demonym («UK», «danske») names our athletes.
 */
import { sportLabel, t, articleTypeLabel } from "./i18n";
import { formatDateShort } from "./seo";
import { words } from "./profile-prose";
import { readTeamContext, teamSummary } from "./team-context";
import { seasonsBack } from "./career";

export interface SchoolPlayer {
  name: string;
  slug: string;
  sport: string;
  gender: string | null;
  kind: "outfield" | "keeper";
  games: number;
  cells: Record<string, string>;
  team: string | null;
}

export interface SchoolFacts {
  name: string;
  short: string;           // «Drexel»
  nickname: string | null;
  city: string | null;
  state: string | null;
  division: string;        // «NCAA D1», «NAIA» …
  conference: string | null;
}

const n = (v: string | undefined) => (v && /^\d+$/.test(v.trim()) ? Number(v) : 0);
const count = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
const sho = (c: Record<string, string>) => n((c["sho"] ?? c["sho/cbo"] ?? "").split(/[-/]/)[0]);

function list(items: string[], lang: string): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} ${lang === "da" ? "og" : "and"} ${items[items.length - 1]}`;
}

function groupName(sport: string, gender: string | null, lang: string): string {
  const s = sportLabel(sport, lang).toLowerCase();
  if (lang === "da") return gender === "m" ? `herrernes ${s}` : gender === "f" ? `damernes ${s}` : s;
  return gender === "m" ? `men's ${s}` : gender === "f" ? `women's ${s}` : s;
}

/** One line on what the division means. Plain facts about the governing bodies. */
function divisionLine(division: string, lang: string): string {
  const d = division.toUpperCase();
  if (lang === "da") {
    if (/D1\b|DIVISION I\b/.test(d)) return "Division I er NCAA's øverste niveau, hvor skolerne må give atletikstipendier.";
    if (/D2\b|DIVISION II\b/.test(d)) return "I Division II må skolerne give atletikstipendier, ofte som delstipendier.";
    if (/D3\b|DIVISION III\b/.test(d)) return "Division III-skoler giver ingen atletikstipendier; støtte gives på akademisk eller økonomisk grundlag.";
    if (/NAIA/.test(d)) return "NAIA er et selvstændigt forbund uden for NCAA, hvis skoler må give atletikstipendier.";
    if (/NJCAA|JUCO/.test(d)) return "NJCAA samler de toårige junior colleges.";
    return "";
  }
  if (/D1\b|DIVISION I\b/.test(d)) return "Division I is the NCAA's top level, where schools may offer athletic scholarships.";
  if (/D2\b|DIVISION II\b/.test(d)) return "Division II schools may offer athletic scholarships, often as partial awards.";
  if (/D3\b|DIVISION III\b/.test(d)) return "Division III schools offer no athletic scholarships; aid is academic or need-based.";
  if (/NAIA/.test(d)) return "The NAIA is a governing body separate from the NCAA, whose schools may offer athletic scholarships.";
  if (/NJCAA|JUCO/.test(d)) return "The NJCAA governs two-year junior colleges.";
  return "";
}

/** «NCAA D1» → «NCAA Division I». */
function divisionName(division: string): string {
  return division.replace(/\bD([123])\b/i, (_, k: string) => `Division ${["", "I", "II", "III"][Number(k)]}`);
}

const isFreshman = (classYear: string | null) => !!classYear && seasonsBack(classYear) === 0 && /^(r-)?(fr|fy|1st|first)/i.test(classYear.trim());

/** S2: the school, its division, and our athletes there by sport. */
export function schoolFactsParagraph(s: SchoolFacts, mix: Array<{ sport: string; class_year: string | null }>, demonym: string, lang: string): string {
  const da = lang === "da";
  const out: string[] = [];
  const where = [s.city, s.state].filter(Boolean).join(", ");
  const nick = s.nickname ? (da ? ` (${s.nickname})` : ` (the ${s.nickname})`) : "";
  const conf = s.conference ? (da ? ` og spiller i ${s.conference}` : ` and plays in the ${s.conference}`) : "";
  out.push(da
    ? `${s.name}${nick} ligger${where ? ` i ${where}` : " i USA"}${conf}, ${divisionName(s.division)}.`
    : `${s.name}${nick} is${where ? ` in ${where}` : " in the United States"}${conf}, ${divisionName(s.division)}.`);
  const line = divisionLine(s.division, lang);
  if (line) out.push(line);
  if (mix.length) {
    const bySport = new Map<string, number>();
    for (const m of mix) bySport.set(m.sport, (bySport.get(m.sport) ?? 0) + 1);
    const parts = [...bySport].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([sport, k]) => `${k} ${da ? "i" : "in"} ${sportLabel(sport, lang).toLowerCase()}`);
    out.push(da
      ? `Vi følger ${count(mix.length, `${demonym} atlet`, `${demonym} atleter`)} på ${s.short}: ${list(parts, lang)}.`
      : `We follow ${count(mix.length, `${demonym} athlete`, `${demonym} athletes`)} at ${s.short}: ${list(parts, lang)}.`);
    const fresh = mix.filter((m) => isFreshman(m.class_year)).length;
    if (fresh) out.push(da
      ? `${fresh === mix.length ? (fresh === 1 ? "Atleten er" : "Alle er") : `${fresh} af dem er`} førsteårsstuderende i denne sæson.`
      : `${fresh === mix.length ? (fresh === 1 ? "That athlete is" : "All of them are") : `${fresh} of them ${fresh === 1 ? "is a" : "are"}`} ${fresh === 1 ? "freshman" : "freshmen"} this season.`);
  }
  return out.join(" ");
}

/** S1: this season's numbers of our players at the school, in one or two sentences. */
export function schoolStatsParagraph(players: SchoolPlayer[], s: SchoolFacts, demonym: string, lang: string): string {
  if (!players.length) return "";
  const da = lang === "da";
  const games = players.reduce((t, p) => t + p.games, 0);
  const outfield = players.filter((p) => p.kind === "outfield");
  const goals = outfield.reduce((t, p) => t + n(p.cells["g"]), 0);
  const assists = outfield.reduce((t, p) => t + n(p.cells["a"]), 0);
  const out: string[] = [];
  const scoring = goals || assists
    ? (da ? ` med ${count(goals, "mål", "mål")} og ${count(assists, "assist", "assists")}` : ` with ${count(goals, "goal", "goals")} and ${count(assists, "assist", "assists")}`)
    : "";
  if (players.length === 1) {
    const p = players[0];
    out.push(da
      ? `I denne sæson har ${p.name}, den eneste ${demonym} spiller på ${s.short} med tal hos os, spillet ${count(p.games, "kamp", "kampe")}${scoring}.`
      : `This season ${p.name}, the one ${demonym} player at ${s.short} with stats on file, has played ${count(p.games, "game", "games")}${scoring}.`);
  } else {
    out.push(da
      ? `I denne sæson har de ${players.length} ${demonym} spillere på ${s.short} med tal hos os spillet ${games} kampe tilsammen${scoring}.`
      : `This season the ${players.length} ${demonym} players at ${s.short} with stats on file have played ${games} games between them${scoring}.`);
    const top = [...outfield].sort((a, b) => n(b.cells["g"]) - n(a.cells["g"]))[0];
    if (top && n(top.cells["g"]) > 0 && outfield.filter((p) => n(p.cells["g"]) === n(top.cells["g"])).length === 1) {
      out.push(da ? `${top.name} er den mest scorende med ${count(n(top.cells["g"]), "mål", "mål")}.` : `${top.name} leads them with ${count(n(top.cells["g"]), "goal", "goals")}.`);
    }
  }
  for (const k of players.filter((p) => p.kind === "keeper" && sho(p.cells) > 0)) {
    out.push(da ? `Målmand ${k.name} har holdt buret rent ${count(sho(k.cells), "gang", "gange")}.` : `Goalkeeper ${k.name} has kept ${count(sho(k.cells), "clean sheet", "clean sheets")}.`);
  }
  return out.join(" ");
}

/** S3: one paragraph per team with one of ours, from the stored team context. */
export function schoolTeamParagraphs(players: SchoolPlayer[], s: SchoolFacts, lang: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of players) {
    const key = `${p.sport}|${p.gender ?? ""}`;
    if (seen.has(key)) continue;
    const ctx = readTeamContext(p.team);
    if (!ctx) continue;
    seen.add(key);
    const label = lang === "da" ? `${s.short}s hold i ${groupName(p.sport, p.gender, lang)}` : `${s.short}'s ${groupName(p.sport, p.gender, lang)} team`;
    const text = teamSummary({ ...ctx, team: label }, lang);
    if (text) out.push(text.charAt(0).toUpperCase() + text.slice(1));
  }
  return out;
}

export interface SchoolPageFacts {
  name: string;
  brand: string;
  factsText: string;
  statsText: string;
  teamTexts: string[];
  roster: Array<{ name: string; sport: string; position: string | null }>;
  more: number;            // athletes of ours at the school not on the roster
  articles: Array<{ title: string; article_type: string; published_at: string | null }>;
}

/**
 * Every word site-check counts on a school page (step 6): the title, the
 * three paragraphs and their headings, the roster («Name» and «Sport ·
 * Position»), the «plus N more» line, the latest news with type and date.
 * Built from the page's own labels; checked against site-check.
 */
export function schoolPageWords(f: SchoolPageFacts, lang: string): number {
  let n = words(`${f.name} | ${f.brand}`) + words(f.factsText);
  if (f.statsText) n += words(t("school.season_heading", lang)) + words(f.statsText);
  if (f.teamTexts.length) n += words(t("school.teams_heading", lang)) + f.teamTexts.reduce((s, x) => s + words(x), 0);
  n += words(t("school.athletes_heading", lang, { school: f.name }));
  if (f.roster.length) {
    n += f.roster.reduce((s, a) => s + words(a.name) + words([sportLabel(a.sport, lang), a.position].filter(Boolean).join(" · ")), 0);
    if (f.more > 0) n += words(f.more === 1 ? t("school.more_athletes_one", lang, { school: f.name }) : t("school.more_athletes", lang, { n: String(f.more), school: f.name }));
  } else {
    n += words(t("school.no_athletes", lang));
  }
  if (f.articles.length) {
    n += words(t("news.latest", lang));
    n += f.articles.reduce((s, a) => s + words(articleTypeLabel(a.article_type, lang)) + words(a.title) + words(formatDateShort(a.published_at, lang)), 0);
  }
  return n;
}
