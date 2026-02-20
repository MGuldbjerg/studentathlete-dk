import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Article, Athlete, School } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDB(): Promise<any | null> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (ctx.env as any).DB ?? null;
  } catch {
    return null;
  }
}

const ARTICLE_SELECT = `
  a.id, a.title, a.slug, a.summary, a.content, a.article_type,
  a.author, a.cover_image_url, a.published, a.published_at,
  a.created_at, a.updated_at, a.athlete_id,
  at.name as athlete_name, at.sport
`;

// ─── Artikler ────────────────────────────────────────────────────────────────

export async function getLatestArticles(limit = 5): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
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

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = await getDB();
  if (!db) return null;
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
  if (!db) return [];
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
  if (!db) return [];
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
  if (!db) return [];
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
  if (!db) return null;
  try {
    const r = await db
      .prepare("SELECT * FROM athletes WHERE slug = ?")
      .bind(slug)
      .first();
    return (r as Athlete) ?? null;
  } catch { return null; }
}

export async function getAthletesByUniversity(
  university: string, limit = 20
): Promise<Athlete[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        "SELECT * FROM athletes WHERE university = ? AND active = 1 ORDER BY name LIMIT ?"
      )
      .bind(university, limit)
      .all();
    return (r.results ?? []) as Athlete[];
  } catch { return []; }
}

// ─── Skoler ──────────────────────────────────────────────────────────────────

export async function getSchoolBySlug(slug: string): Promise<School | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare("SELECT * FROM schools WHERE slug = ?")
      .bind(slug)
      .first();
    return (r as School) ?? null;
  } catch { return null; }
}
