import { getDB, getEnv } from "./db";
import type { Article } from "./types";

const ARTICLE_SELECT = `
  a.id, a.title, a.slug, a.summary, a.content, a.article_type,
  a.author, a.cover_image_url, a.published, a.published_at,
  a.created_at, a.updated_at, a.athlete_id,
  at.name as athlete_name, at.sport, at.slug as athlete_slug
`;

// ─── Token-validering ───────────────────────────────────────────────────────

export async function validateAdminToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  try {
    const env = await getEnv();
    const expected = env.ADMIN_TOKEN;
    if (!expected) return false;
    return token === expected;
  } catch {
    return false;
  }
}

// ─── DB-queries til admin ───────────────────────────────────────────────────

export async function getDraftArticles(): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.published = 0
         ORDER BY a.created_at DESC`
      )
      .all();
    return (r.results ?? []) as Article[];
  } catch {
    return [];
  }
}

export async function getDraftArticleById(id: number): Promise<Article | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.id = ? AND a.published = 0`
      )
      .bind(id)
      .first();
    return (r as Article) ?? null;
  } catch {
    return null;
  }
}

export async function publishArticle(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db
    .prepare(
      `UPDATE articles SET published = 1, published_at = datetime('now') WHERE id = ?`
    )
    .bind(id)
    .run();
}

export async function deleteArticle(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
}
