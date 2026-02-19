import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Article } from "./types";

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

export async function getLatestArticles(limit = 5): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const result = await db
      .prepare(
        `SELECT a.*, at.name as athlete_name, at.sport
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.published = 1
         ORDER BY a.published_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all();
    return (result.results ?? []) as Article[];
  } catch {
    return [];
  }
}

export async function getArticles({
  q = "",
  sport = "",
  limit = 18,
  offset = 0,
}: {
  q?: string;
  sport?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const conditions: string[] = ["a.published = 1"];
    const params: (string | number)[] = [];

    if (q) {
      conditions.push(
        "(a.title LIKE ? OR a.summary LIKE ? OR at.name LIKE ?)"
      );
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (sport) {
      conditions.push("at.sport = ?");
      params.push(sport);
    }

    const where = conditions.join(" AND ");
    params.push(limit, offset);

    const result = await db
      .prepare(
        `SELECT a.*, at.name as athlete_name, at.sport
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE ${where}
         ORDER BY a.published_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...params)
      .all();
    return (result.results ?? []) as Article[];
  } catch {
    return [];
  }
}
