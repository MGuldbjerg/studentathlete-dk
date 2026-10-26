/**
 * Which pages may be indexed (PLAN-content-floor-uk.md, step 6): every public
 * profile and school page counted with the page's own text builders
 * (src/lib/profile-prose.ts, src/lib/school-season.ts), stored so the page,
 * the sitemap and the listings read one number.
 * ===========================================================================
 *
 * Runs daily after the stats fill (stats-daily.yml). A page's words grow and
 * shrink with the data (a goal, an award, a new article), so a page comes back
 * into the index on its own when it crosses CountryProfile.indexMinWords.
 *
 * The count reproduces site-check's floor rule on the page as rendered — the
 * title, headings, labels, school-mates, source lines, articles — and was
 * checked against a site-check log: 1,076 of 1,076 UK profiles exact
 * (2026-10-26). `--calibrate <log>` repeats that check for profiles and schools.
 *
 * Articles are not counted here: a new article must already pass the
 * publish floor (standaloneMinWords). The old short ones get their measured
 * words once from a site-check log (`--articles-from <log>`).
 *
 *   npx tsx pipeline/report/index-words.ts [--dry-run]
 *   npx tsx pipeline/report/index-words.ts --calibrate logs/site-check-uk-<date>.json
 *   npx tsx pipeline/report/index-words.ts --articles-from logs/site-check-uk-<date>.json
 */
import { readFileSync } from "node:fs";
import { createD1Client } from "../lib/d1-client";
import { siteCountryCodes, countryProfile } from "../../src/lib/countries";
import { seasonFromDate, type AthleteEventRow } from "../../src/lib/athlete-events";
import { recordsOf } from "../../src/lib/athlete-hub";
import { buildProfileProse, profilePageWords } from "../../src/lib/profile-prose";
import { buildTimeline } from "../../src/lib/profile-timeline";
import { schoolFactsParagraph, schoolPageWords, schoolStatsParagraph, schoolTeamParagraphs, type SchoolPlayer } from "../../src/lib/school-season";
import type { SeasonStatsRow } from "../../src/lib/db";
import type { CareerSeason } from "../../src/lib/career";

const args = process.argv.slice(2);
const val = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] ?? null : null; };
type DB = ReturnType<typeof createD1Client>;

interface A {
  id: number; name: string; slug: string; sport: string; gender: string | null; position: string | null; university: string; active: number; class_year: string | null;
  bio_url: string | null; bio_facts: string | null; previous_school: string | null; profile_summary: string | null; index_words: number | null;
}
interface S { id: number; name: string; slug: string; common_name: string | null; nickname: string | null; city: string | null; state: string | null; division: string; conference: string | null }

export interface Counts {
  profiles: Map<number, { slug: string; words: number; was: number | null }>;
  schools: Map<number, { slug: string; words: number }>;
}

export async function countPages(db: DB, country: string): Promise<Counts> {
  const season = seasonFromDate(null);
  const site = countryProfile(country);
  const lang = site.language;
  const floor = site.indexMinWords ?? 0;
  const athletes = (await db.query<A>(
    `SELECT id, name, slug, sport, gender, position, university, active, class_year, bio_url, bio_facts, previous_school, profile_summary, index_words
       FROM athletes WHERE home_country = ?`, [country])).results;
  const stats = new Map<number, SeasonStatsRow>();
  for (const r of (await db.query<SeasonStatsRow & { athlete_id: number }>(
    `SELECT st.athlete_id, st.kind, st.games, st.cells, st.line, st.school, st.source_url, st.fetched_on, st.team, st.standing
       FROM athlete_season_stats st JOIN athletes a ON a.id = st.athlete_id
      WHERE st.season = ? AND st.games > 0 AND a.home_country = ?`, [season, country])).results) stats.set(r.athlete_id, r);
  const career = new Map<number, CareerSeason[]>();
  for (const r of (await db.query<{ athlete_id: number; season: string; kind: "outfield" | "keeper"; games: number; cells: string; school: string; team: string | null }>(
    `SELECT st.athlete_id, st.season, st.kind, st.games, st.cells, st.school, st.team
       FROM athlete_season_stats st JOIN athletes a ON a.id = st.athlete_id
      WHERE st.season < ? AND st.games > 0 AND st.kind IN ('outfield', 'keeper') AND a.home_country = ?`, [season, country])).results) {
    let cells = {}, record = null;
    try { cells = JSON.parse(r.cells); } catch { /* none */ }
    try { record = r.team ? JSON.parse(r.team)?.record ?? null : null; } catch { /* none */ }
    career.set(r.athlete_id, [...(career.get(r.athlete_id) ?? []), { season: r.season, kind: r.kind, games: r.games, cells, school: r.school, record }]);
  }
  const events = new Map<number, AthleteEventRow[]>();
  for (const r of (await db.query<AthleteEventRow & { athlete_id: number }>(
    `SELECT e.athlete_id, e.id, e.season, e.kind, e.award_name, e.summary, e.significance, e.source_url, e.occurred_on, e.article_id
       FROM athlete_events e JOIN athletes a ON a.id = e.athlete_id WHERE a.home_country = ?`, [country])).results) {
    events.set(r.athlete_id, [...(events.get(r.athlete_id) ?? []), r]);
  }
  // Our articles on each profile (about the athlete or naming them), newest first — as the page lists them.
  const arts = (await db.query<{ id: number; title: string; article_type: string; athlete_id: number | null; published_at: string; fact_sheet: string | null }>(
    `SELECT a.id, a.title, a.article_type, a.athlete_id, a.published_at, CASE WHEN s.fact_sheet LIKE '%"records"%' THEN s.fact_sheet END AS fact_sheet
       FROM articles a LEFT JOIN stories s ON s.id = a.story_id WHERE a.published = 1 AND a.country = ?`, [country])).results;
  const named = (await db.query<{ article_id: number; athlete_id: number }>(
    `SELECT aa.article_id, aa.athlete_id FROM article_athletes aa JOIN articles a ON a.id = aa.article_id WHERE a.published = 1 AND a.country = ?`, [country])).results;
  const byAthlete = new Map<number, typeof arts>();
  const byId = new Map(arts.map((a) => [a.id, a]));
  for (const a of arts) if (a.athlete_id != null) byAthlete.set(a.athlete_id, [...(byAthlete.get(a.athlete_id) ?? []), a]);
  for (const n of named) {
    const a = byId.get(n.article_id);
    if (a && a.athlete_id !== n.athlete_id) byAthlete.set(n.athlete_id, [...(byAthlete.get(n.athlete_id) ?? []), a]);
  }
  const newest = (xs: typeof arts) => [...xs].sort((x, y) => y.published_at.localeCompare(x.published_at));

  // Public = an article on the site or this season's stats (publicAthleteClause, UK). School-mates: active and public.
  const isPublic = (a: A) => site.profilePublicMinArticles <= 0 || byAthlete.has(a.id) || stats.has(a.id);
  const bySchool = new Map<string, A[]>();
  for (const a of athletes.filter((x) => x.active === 1 && isPublic(x)).sort((x, y) => x.name.localeCompare(y.name))) {
    bySchool.set(a.university, [...(bySchool.get(a.university) ?? []), a]);
  }

  const profiles: Counts["profiles"] = new Map();
  for (const a of athletes.filter(isPublic)) {
    const mine = newest(byAthlete.get(a.id) ?? []);
    const own = mine.filter((x) => x.athlete_id === a.id);
    const records = recordsOf(own.find((x) => x.fact_sheet)?.fact_sheet ?? null);
    const st = stats.get(a.id) ?? null;
    const past = (career.get(a.id) ?? []).sort((x, y) => y.season.localeCompare(x.season));
    const ev = events.get(a.id) ?? [];
    const listed = mine.slice(0, 10);
    const prose = buildProfileProse({ athlete: a, seasonStats: st, career: past, events: ev, records, lang });
    const timeline = buildTimeline(ev, listed, a.name, lang, () => "");
    const words = profilePageWords(prose, {
      name: a.name, sport: a.sport, university: a.university, hasBioUrl: !!a.bio_url, summary: a.profile_summary,
      statsSchool: st?.school ?? null, statsDate: st?.fetched_on ?? null, careerSchool: past[0]?.school ?? null,
      schoolmates: (bySchool.get(a.university) ?? []).slice(0, 6).filter((m) => m.id !== a.id).slice(0, 5),
      articles: listed, timelineTexts: timeline.map((r) => r.text),
    }, lang);
    profiles.set(a.id, { slug: a.slug, words, was: a.index_words });
  }

  // School pages: the roster lists only profiles that meet the floor (getAthletesByUniversity { listed }).
  const listedOk = (a: A) => floor <= 0 || (profiles.get(a.id)?.words ?? floor) >= floor;
  const schools = (await db.query<S>(
    `SELECT id, name, slug, common_name, nickname, city, state, division, conference FROM schools
      WHERE name IN (SELECT university FROM athletes WHERE home_country = ? AND active = 1)`, [country])).results;
  const out: Counts["schools"] = new Map();
  for (const s of schools) {
    const publicHere = bySchool.get(s.name) ?? [];
    if (!publicHere.length) continue;     // a 404 on this site
    const all = athletes.filter((a) => a.active === 1 && a.university === s.name);
    const roster = publicHere.filter(listedOk).slice(0, 20);
    const facts = { name: s.name, short: s.common_name?.split("/")[0].trim() || s.name, nickname: s.nickname, city: s.city, state: s.state, division: s.division, conference: s.conference };
    const players: SchoolPlayer[] = all
      .filter((a) => stats.has(a.id) && stats.get(a.id)!.kind !== "tennis")
      .sort((x, y) => x.name.localeCompare(y.name))
      .map((a) => {
        const st = stats.get(a.id)!;
        let cells = {};
        try { cells = JSON.parse(st.cells); } catch { /* none */ }
        return { name: a.name, slug: a.slug, sport: a.sport, gender: a.gender, kind: st.kind as "outfield" | "keeper", games: st.games, cells, team: st.team };
      });
    const news = newest(arts.filter((x) => x.athlete_id != null && athletes.find((a) => a.id === x.athlete_id)?.university === s.name)).slice(0, 6);
    const words = schoolPageWords({
      name: s.name, brand: site.brand,
      factsText: schoolFactsParagraph(facts, all.map((a) => ({ sport: a.sport, class_year: a.class_year })), site.demonym, lang),
      statsText: schoolStatsParagraph(players, facts, site.demonym, lang),
      teamTexts: schoolTeamParagraphs(players, facts, lang),
      roster: roster.map((a) => ({ name: a.name, sport: a.sport, position: a.position })),
      more: Math.max(all.length, roster.length) - roster.length,
      articles: news,
    }, lang);
    out.set(s.id, { slug: s.slug, words });
  }
  return { profiles, schools: out };
}

function measuredFrom(log: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of JSON.parse(readFileSync(log, "utf8")) as Array<{ url: string; status: number; words: number }>) {
    if (r.status === 200) m.set(r.url, r.words);
  }
  return m;
}

async function calibrate(db: DB, log: string): Promise<void> {
  const measured = measuredFrom(log);
  const { profiles, schools } = await countPages(db, "UK");
  for (const [kind, rows] of [["profiles", [...profiles.values()].map((p) => ({ url: `/athletes/${p.slug}`, est: p.words }))],
                              ["schools", [...schools.values()].map((s) => ({ url: `/schools/${s.slug}`, est: s.words }))]] as const) {
    const d = rows.filter((r) => measured.has(r.url)).map((r) => ({ ...r, got: measured.get(r.url)!, diff: measured.get(r.url)! - r.est }));
    const off = d.filter((x) => x.diff !== 0);
    const wrong = d.filter((x) => (x.est >= 200) !== (x.got >= 200));
    console.log(`${kind}: ${d.length} matched, ${off.length} off by any amount, ${wrong.length} on the wrong side of 200`);
    for (const x of off.slice(0, 8)) console.log(`   ${x.url} counted ${x.est}, measured ${x.got}`);
  }
}

async function main(): Promise<void> {
  const db = createD1Client();
  const DRY = args.includes("--dry-run");
  const calib = val("--calibrate");
  if (calib) return calibrate(db, calib);

  const fromLog = val("--articles-from");
  if (fromLog) {
    // One-time: the old articles' measured words (new ones pass the publish floor).
    const measured = measuredFrom(fromLog);
    const arts = (await db.query<{ id: number; slug: string; sport: string | null }>(
      `SELECT a.id, a.slug, at.sport FROM articles a LEFT JOIN athletes at ON at.id = a.athlete_id WHERE a.published = 1 AND a.country = 'UK'`)).results;
    const writes = [];
    for (const a of arts) {
      const hit = [...measured].find(([url]) => url.endsWith(`/${a.slug}`));
      if (hit) writes.push({ sql: `UPDATE articles SET index_words = ? WHERE id = ?`, params: [hit[1], a.id] });
    }
    console.log(`articles: ${writes.length} counted from ${fromLog}; under 200: ${writes.filter((w) => (w.params[0] as number) < 200).length}`);
    if (!DRY) for (let i = 0; i < writes.length; i += 50) await db.batch(writes.slice(i, i + 50));
    return;
  }

  for (const country of siteCountryCodes()) {
    const floor = countryProfile(country).indexMinWords ?? 0;
    const { profiles, schools } = await countPages(db, country);
    const changed = [...profiles].filter(([, p]) => p.was !== p.words);
    const under = [...profiles.values()].filter((p) => floor > 0 && p.words < floor).length;
    const schoolsUnder = [...schools.values()].filter((s) => floor > 0 && s.words < floor).length;
    console.log(`${country}: ${profiles.size} profiles (${under} under ${floor || "no floor"}), ${changed.length} changed; ${schools.size} schools (${schoolsUnder} under)`);
    if (DRY) continue;
    const writes: Array<{ sql: string; params: unknown[] }> = changed.map(([id, p]) => ({ sql: `UPDATE athletes SET index_words = ? WHERE id = ?`, params: [p.words, id] }));
    for (const [id, s] of schools) {
      writes.push({
        sql: `INSERT INTO school_index (country, school_id, words, computed_at) VALUES (?, ?, ?, datetime('now'))
              ON CONFLICT(country, school_id) DO UPDATE SET words = excluded.words, computed_at = excluded.computed_at`,
        params: [country, id, s.words],
      });
    }
    for (let i = 0; i < writes.length; i += 50) await db.batch(writes.slice(i, i + 50));
  }
}

if (/index-words\.ts$/.test(process.argv[1] ?? "")) main().catch((e) => { console.error(e); process.exit(1); });
