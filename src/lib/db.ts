import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DEFAULT_COUNTRY } from "./countries";
import type { Article, Athlete, School } from "./types";
import type { AthleteEventRow } from "./athlete-events";
import { MOCK_ARTICLES, MOCK_ATHLETES, MOCK_SCHOOLS } from "./mock-data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDB(): Promise<any | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (ctx.env as any).DB ?? null;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEnv(): Promise<Record<string, any>> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ctx.env as any;
  } catch {
    return {};
  }
}

/**
 * Hvilket sites indhold hentes der? Nationalitet er DATA nu (migration 034), så
 * listerne filtrerer eksplicit i stedet for at antage at "alle rækker" er danske.
 *
 * Med ét site er værdien altid "DK", og filtrene ændrer intet. Pointen er at
 * site nummer to ikke kræver en gennemgang af hver eneste query — kun at
 * kaldere begynder at sende deres egen landekode med.
 */
export function siteCountry(country?: string): string {
  return (country ?? DEFAULT_COUNTRY).toUpperCase();
}

export const ARTICLE_SELECT = `
  a.id, a.title, a.slug, a.summary, a.content, a.article_type,
  a.author, a.author_role, a.cover_image_url, a.published, a.published_at,
  a.created_at, a.updated_at, a.athlete_id, a.source_url,
  a.model_used, a.llm_provider, a.original_content, a.featured,
  a.correction_note, a.corrected_at,
  a.fabrication_risk, a.fact_flags, a.story_id,
  at.name as athlete_name, at.sport, at.slug as athlete_slug
`;

// ─── Artikler ────────────────────────────────────────────────────────────────

export async function getLatestArticles(limit = 5): Promise<Article[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_ARTICLES
      .filter((a) => a.published === 1)
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .slice(0, limit);
  }
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.published = 1
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .bind(limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

/** Fastgjorte artikler til forsidens karrusel (nyeste først). */
export async function getFeaturedArticles(limit = 5): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.published = 1 AND a.featured = 1
         ORDER BY a.published_at DESC LIMIT ?`,
      )
      .bind(limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch {
    return [];
  }
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = await getDB();
  if (!db) {
    return MOCK_ARTICLES.find((a) => a.slug === slug && a.published === 1) ?? null;
  }
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.slug = ? AND a.published = 1`
      )
      .bind(slug)
      .first();
    return (r as Article) ?? null;
  } catch { return null; }
}

export async function getArticles({
  q = "", sport = "", limit = 18, offset = 0,
}: { q?: string; sport?: string; limit?: number; offset?: number } = {}): Promise<Article[]> {
  const db = await getDB();
  if (!db) {
    let filtered = MOCK_ARTICLES.filter((a) => a.published === 1);
    if (q) {
      const lq = q.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(lq) ||
          (a.summary ?? "").toLowerCase().includes(lq) ||
          (a.athlete_name ?? "").toLowerCase().includes(lq),
      );
    }
    if (sport) {
      filtered = filtered.filter((a) => a.sport === sport);
    }
    return filtered
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .slice(offset, offset + limit);
  }
  try {
    const conditions: string[] = ["a.published = 1"];
    const params: (string | number)[] = [];
    if (q) {
      conditions.push("(a.title LIKE ? OR a.summary LIKE ? OR at.name LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (sport) { conditions.push("at.sport = ?"); params.push(sport); }
    params.push(limit, offset);
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE ${conditions.join(" AND ")}
         ORDER BY a.published_at DESC LIMIT ? OFFSET ?`
      )
      .bind(...params)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

export async function getArticlesByAthleteId(
  athleteId: number, limit = 6
): Promise<Article[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_ARTICLES
      .filter((a) => a.athlete_id === athleteId && a.published === 1)
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .slice(0, limit);
  }
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.athlete_id = ? AND a.published = 1
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .bind(athleteId, limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

export async function getArticlesByUniversity(
  university: string, limit = 4
): Promise<Article[]> {
  const db = await getDB();
  if (!db) {
    const athleteIds = MOCK_ATHLETES
      .filter((a) => a.university === university)
      .map((a) => a.id);
    return MOCK_ARTICLES
      .filter((a) => a.athlete_id !== null && athleteIds.includes(a.athlete_id) && a.published === 1)
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .slice(0, limit);
  }
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE at.university = ? AND a.published = 1
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .bind(university, limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

// ─── Atleter ─────────────────────────────────────────────────────────────────

export async function getAthleteBySlug(slug: string): Promise<Athlete | null> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES.find((a) => a.slug === slug) ?? null;
  }
  try {
    const r = await db
      .prepare("SELECT * FROM athletes WHERE slug = ?")
      .bind(slug)
      .first();
    return (r as Athlete) ?? null;
  } catch { return null; }
}

/**
 * Slår en NEDLAGT atlet-slug op → atletens nuværende slug (301-mål).
 *
 * Slugs dør på to måder: skolen ændrer atletens navn, eller to rækker viser sig
 * at være samme person og flettes. Begge dele efterlader en URL der kan være
 * delt, linket fra en artikel eller indekseret — athlete_aliases holder den i live.
 * Slås kun op når `athletes` ikke selv har slug'en, så en levende atlet altid
 * vinder over et gammelt alias (ingen redirect-løkke).
 */
export async function getAthleteSlugByAlias(slug: string): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare(
        `SELECT a.slug FROM athlete_aliases al
         JOIN athletes a ON a.id = al.athlete_id
         WHERE al.slug = ?`,
      )
      .bind(slug)
      .first();
    return (r as { slug: string } | null)?.slug ?? null;
  } catch (err) {
    // Tavs fejl her = døde links uden spor. Logges, så `wrangler tail` viser den.
    console.error("getAthleteSlugByAlias fejlede:", err);
    return null;
  }
}

export async function getAthletesByUniversity(
  university: string, limit = 20, country?: string
): Promise<Athlete[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES
      .filter((a) => a.university === university && a.active === 1)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }
  try {
    const r = await db
      .prepare(
        "SELECT * FROM athletes WHERE university = ? AND home_country = ? AND active = 1 ORDER BY name LIMIT ?"
      )
      .bind(university, siteCountry(country), limit)
      .all();
    return (r.results ?? []) as Athlete[];
  } catch { return []; }
}

export async function getAllAthletes(country?: string): Promise<Athlete[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES
      .filter((a) => a.active === 1)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  try {
    const r = await db
      .prepare("SELECT * FROM athletes WHERE home_country = ? AND active = 1 ORDER BY sport, name")
      .bind(siteCountry(country))
      .all();
    return (r.results ?? []) as Athlete[];
  } catch { return []; }
}

export async function getAlumniAthletes(country?: string): Promise<Athlete[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES
      .filter((a) => a.active === 0)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  try {
    const r = await db
      .prepare("SELECT * FROM athletes WHERE home_country = ? AND active = 0 ORDER BY sport, name")
      .bind(siteCountry(country))
      .all();
    return (r.results ?? []) as Athlete[];
  } catch { return []; }
}

export async function getAthletesBySport(
  sport: string, limit = 50, country?: string
): Promise<Athlete[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES
      .filter((a) => a.sport.toLowerCase() === sport.toLowerCase() && a.active === 1)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  }
  try {
    const r = await db
      .prepare("SELECT * FROM athletes WHERE sport = ? AND home_country = ? AND active = 1 ORDER BY name LIMIT ?")
      .bind(sport, siteCountry(country), limit)
      .all();
    return (r.results ?? []) as Athlete[];
  } catch { return []; }
}

export async function getArticlesBySport(
  sport: string, limit = 12, country?: string
): Promise<Article[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_ARTICLES
      .filter((a) => a.sport?.toLowerCase() === sport.toLowerCase() && a.published === 1)
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .slice(0, limit);
  }
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE at.sport = ? AND a.country = ? AND a.published = 1
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .bind(sport, siteCountry(country), limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

export async function countAthletesBySport(sport: string, country?: string): Promise<{ active: number; alumni: number }> {
  const db = await getDB();
  if (!db) {
    const active = MOCK_ATHLETES.filter((a) => a.sport.toLowerCase() === sport.toLowerCase() && a.active === 1).length;
    const alumni = MOCK_ATHLETES.filter((a) => a.sport.toLowerCase() === sport.toLowerCase() && a.active === 0).length;
    return { active, alumni };
  }
  try {
    const r = await db
      .prepare("SELECT active, COUNT(*) as cnt FROM athletes WHERE sport = ? AND home_country = ? GROUP BY active")
      .bind(sport, siteCountry(country))
      .all();
    let active = 0, alumni = 0;
    for (const row of (r.results ?? []) as { active: number; cnt: number }[]) {
      if (row.active === 1) active = row.cnt;
      else alumni = row.cnt;
    }
    return { active, alumni };
  } catch { return { active: 0, alumni: 0 }; }
}

// ─── Skoler ──────────────────────────────────────────────────────────────────

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const db = await getDB();
  if (!db) {
    return MOCK_SCHOOLS.find((s) => s.slug === slug) ?? null;
  }
  try {
    const r = await db
      .prepare("SELECT * FROM schools WHERE slug = ?")
      .bind(slug)
      .first();
    return (r as School) ?? null;
  } catch { return null; }
}

/** Skoler der har mindst én aktiv dansk atlet, med antal — til /skoler-hubben. */
export async function getSchoolsWithAthletes(): Promise<
  (School & { athlete_count: number })[]
> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT s.*, COUNT(a.id) AS athlete_count
         FROM schools s
         JOIN athletes a ON a.university = s.name AND a.active = 1
         GROUP BY s.id
         HAVING athlete_count > 0
         ORDER BY s.division ASC, athlete_count DESC, s.name ASC`,
      )
      .all();
    return (r.results ?? []) as (School & { athlete_count: number })[];
  } catch {
    return [];
  }
}

/** Karriere-tidslinje for én atlet (æresbevisninger først, nyeste sæson først). */
export async function getAthleteEvents(athleteId: number): Promise<AthleteEventRow[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT id, season, kind, award_name, summary, significance, source_url, occurred_on
         FROM athlete_events WHERE athlete_id = ?
         ORDER BY CASE significance WHEN 'honor' THEN 0 WHEN 'notable' THEN 1 ELSE 2 END, season DESC, id DESC`,
      )
      .bind(athleteId)
      .all();
    return (r.results ?? []) as AthleteEventRow[];
  } catch {
    return [];
  }
}

// ─── Sitemap / Feed hjælpere ────────────────────────────────────────────────

export async function getAllArticleSlugs(): Promise<
  { slug: string; sport: string | null; updated_at: string }[]
> {
  const db = await getDB();
  if (!db) {
    return MOCK_ARTICLES
      .filter((a) => a.published === 1)
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .map((a) => ({ slug: a.slug, sport: a.sport ?? null, updated_at: a.updated_at }));
  }
  try {
    const r = await db
      .prepare(
        `SELECT a.slug, at.sport, a.updated_at
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.published = 1
         ORDER BY a.published_at DESC`
      )
      .all();
    return (r.results ?? []) as { slug: string; sport: string | null; updated_at: string }[];
  } catch { return []; }
}

export async function getAllAthleteSlugs(country?: string): Promise<
  { slug: string; updated_at: string }[]
> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({ slug: a.slug, updated_at: a.updated_at }));
  }
  try {
    const r = await db
      .prepare("SELECT slug, updated_at FROM athletes WHERE home_country = ? ORDER BY name")
      .bind(siteCountry(country))
      .all();
    return (r.results ?? []) as { slug: string; updated_at: string }[];
  } catch { return []; }
}

export async function getAllSchoolSlugs(): Promise<{ slug: string }[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_SCHOOLS
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ slug: s.slug }));
  }
  try {
    const r = await db
      .prepare("SELECT slug FROM schools ORDER BY name")
      .all();
    return (r.results ?? []) as { slug: string }[];
  } catch { return []; }
}
