import { getDB, getEnv, ARTICLE_SELECT } from "./db";
import { generateSlug } from "./slug";
import type { Article, Athlete } from "./types";

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
         ORDER BY CASE a.fabrication_risk
           WHEN 'low' THEN 0
           WHEN 'medium' THEN 2
           WHEN 'high' THEN 3
           ELSE 1
         END ASC, a.created_at ASC`
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

/**
 * Faktaark for artiklens story (fase 1-output) — vises ved siden af kladden i
 * rediger-visningen, så et review ikke kræver at kilden åbnes.
 */
export async function getFactSheetForArticle(articleId: number): Promise<{
  fact_sheet: string | null;
  fact_status: string | null;
  source_url: string | null;
  headline: string | null;
} | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare(
        `SELECT s.fact_sheet, s.fact_status, s.source_url, s.headline
         FROM articles a
         JOIN stories s ON a.story_id = s.id
         WHERE a.id = ?`
      )
      .bind(articleId)
      .first();
    return (r as {
      fact_sheet: string | null;
      fact_status: string | null;
      source_url: string | null;
      headline: string | null;
    }) ?? null;
  } catch {
    return null;
  }
}

export async function publishArticle(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;

  // Stamp cover_image_url at publish time so it's frozen forever
  const article = await db
    .prepare(
      `SELECT a.cover_image_url, a.title, a.article_type,
              at.photo_url, at.sport
       FROM articles a
       LEFT JOIN athletes at ON a.athlete_id = at.id
       WHERE a.id = ?`
    )
    .bind(id)
    .first() as {
      cover_image_url: string | null;
      title: string;
      article_type: string;
      photo_url: string | null;
      sport: string | null;
    } | null;

  // OG-billede-URLs er kun til meta-tags — bruges IKKE som synligt cover
  const rawCover = article?.cover_image_url ?? null;
  let coverUrl: string | null =
    rawCover && !rawCover.includes("/api/og") ? rawCover : null;

  if (!coverUrl && article) {
    coverUrl = article.photo_url ?? null;
  }

  await db
    .prepare(
      `UPDATE articles
       SET published = 1, published_at = datetime('now'), cover_image_url = ?
       WHERE id = ?`
    )
    .bind(coverUrl, id)
    .run();
}

export async function deleteArticle(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.prepare("DELETE FROM articles WHERE id = ?").bind(id).run();
}

export async function getArticleById(id: number): Promise<Article | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.id = ?`
      )
      .bind(id)
      .first();
    return (r as Article) ?? null;
  } catch {
    return null;
  }
}

export async function getAllArticles(): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         ORDER BY a.updated_at DESC`
      )
      .all();
    return (r.results ?? []) as Article[];
  } catch {
    return [];
  }
}

export async function updateArticle(
  id: number,
  fields: {
    title?: string;
    summary?: string;
    content?: string;
    article_type?: string;
    author?: string;
    athlete_id?: number | null;
  },
): Promise<void> {
  const db = await getDB();
  if (!db) return;

  const sets: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      params.push(value);
    }
  }
  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  // Regenerer slug hvis title ændres
  if (fields.title) {
    sets.push("slug = ?");
    params.push(generateSlug(fields.title));
  }

  params.push(id);
  await db
    .prepare(`UPDATE articles SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...params)
    .run();
}

export async function createArticle(fields: {
  title: string;
  summary: string;
  content: string;
  article_type: string;
  author: string;
  athlete_id: number | null;
}): Promise<number> {
  const db = await getDB();
  if (!db) throw new Error("Ingen database");

  const slug = generateSlug(fields.title);

  await db
    .prepare(
      `INSERT INTO articles (title, slug, summary, content, article_type, author, athlete_id, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(fields.title, slug, fields.summary, fields.content, fields.article_type, fields.author, fields.athlete_id)
    .run();

  // Hent ID på den nye artikel
  const r = await db
    .prepare("SELECT id FROM articles WHERE slug = ? ORDER BY id DESC LIMIT 1")
    .bind(slug)
    .first();
  return (r as { id: number })?.id ?? 0;
}

// ─── Stilguide (style_corrections) ──────────────────────────────────────────

export interface StyleCorrection {
  id: number;
  wrong_phrase: string;
  correct_phrase: string;
  category: string;
  note: string | null;
  active: number;
  created_at: string;
}

export async function getStyleCorrections(): Promise<StyleCorrection[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        "SELECT * FROM style_corrections WHERE active = 1 ORDER BY category, created_at DESC"
      )
      .all();
    return (r.results ?? []) as StyleCorrection[];
  } catch {
    return [];
  }
}

export async function createStyleCorrection(fields: {
  wrong_phrase: string;
  correct_phrase: string;
  category: string;
  note: string | null;
}): Promise<number> {
  const db = await getDB();
  if (!db) throw new Error("Ingen database");
  await db
    .prepare(
      `INSERT INTO style_corrections (wrong_phrase, correct_phrase, category, note)
       VALUES (?, ?, ?, ?)`
    )
    .bind(fields.wrong_phrase, fields.correct_phrase, fields.category, fields.note)
    .run();
  const r = await db
    .prepare("SELECT id FROM style_corrections ORDER BY id DESC LIMIT 1")
    .first();
  return (r as { id: number })?.id ?? 0;
}

export async function deleteStyleCorrection(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db
    .prepare("UPDATE style_corrections SET active = 0 WHERE id = ?")
    .bind(id)
    .run();
}

// ─── Side-queries til admin ─────────────────────────────────────────────────

export async function getAllPages(): Promise<Array<{ slug: string; title: string; meta_description: string | null; updated_at: string | null }>> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare("SELECT slug, title, meta_description, updated_at FROM pages ORDER BY title ASC")
      .all();
    return (r.results ?? []) as Array<{ slug: string; title: string; meta_description: string | null; updated_at: string | null }>;
  } catch {
    return [];
  }
}

export async function getPageBySlug(slug: string): Promise<{ slug: string; title: string; content: string; meta_description: string | null } | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare("SELECT slug, title, content, meta_description FROM pages WHERE slug = ?")
      .bind(slug)
      .first();
    return (r as { slug: string; title: string; content: string; meta_description: string | null }) ?? null;
  } catch {
    return null;
  }
}

export async function upsertPage(
  slug: string,
  title: string,
  content: string,
  metaDescription: string | null,
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db
    .prepare(
      `INSERT OR REPLACE INTO pages (slug, title, content, meta_description, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .bind(slug, title, content, metaDescription)
    .run();
}

// ─── Atlet-queries til admin ─────────────────────────────────────────────────

export async function createAthlete(fields: {
  name: string;
  sport: string;
  university: string;
  position?: string | null;
  hometown?: string | null;
  division?: string;
  year_enrolled?: number | null;
}): Promise<number> {
  const db = await getDB();
  if (!db) throw new Error("Ingen database");

  const slug = generateSlug(fields.name, 80);

  await db
    .prepare(
      `INSERT INTO athletes (name, slug, sport, university, position, hometown, division, year_enrolled, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(
      fields.name,
      slug,
      fields.sport,
      fields.university,
      fields.position ?? null,
      fields.hometown ?? null,
      fields.division ?? "NCAA D1",
      fields.year_enrolled ?? null,
    )
    .run();

  const r = await db
    .prepare("SELECT id FROM athletes WHERE slug = ? ORDER BY id DESC LIMIT 1")
    .bind(slug)
    .first();
  return (r as { id: number })?.id ?? 0;
}

export async function getAthleteById(id: number): Promise<Athlete | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare("SELECT * FROM athletes WHERE id = ?")
      .bind(id)
      .first();
    return (r as Athlete) ?? null;
  } catch {
    return null;
  }
}

export async function updateAthlete(
  id: number,
  fields: {
    photo_url?: string | null;
    photo_credit?: string | null;
    preferred_name?: string | null;
  },
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db
    .prepare(
      `UPDATE athletes SET photo_url = ?, photo_credit = ?, preferred_name = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(
      fields.photo_url ?? null,
      fields.photo_credit ?? null,
      fields.preferred_name ?? null,
      id,
    )
    .run();
}

// ─── Pipeline-statistik til admin ────────────────────────────────────────────

export interface PipelineStats {
  schools: { total: number; withUrl: number; byDivision: Array<{ key: string; count: number }> };
  rosterChecks: { total: number; pending: number; byStatus: Array<{ key: string; count: number }> };
  athletes: { total: number; active: number; bySport: Array<{ key: string; count: number }> };
  sources: { total: number };
  stories: { total: number; byStatus: Array<{ key: string; count: number }> };
  recentRuns: Array<{
    run_type: string;
    started_at: string;
    status: string;
    items_processed: number;
    items_found: number;
  }>;
}

export async function getPipelineStats(): Promise<PipelineStats | null> {
  const db = await getDB();
  if (!db) return null;

  try {
    const [
      schoolsTotal,
      schoolsWithUrl,
      schoolsByDiv,
      rcTotal,
      rcPending,
      rcByStatus,
      athletesTotal,
      athletesActive,
      athletesBySport,
      sourcesTotal,
      storiesTotal,
      storiesByStatus,
      recentRuns,
    ] = await db.batch([
      db.prepare("SELECT COUNT(*) as c FROM schools"),
      db.prepare("SELECT COUNT(*) as c FROM schools WHERE website IS NOT NULL"),
      db.prepare("SELECT division as k, COUNT(*) as c FROM schools GROUP BY division ORDER BY c DESC"),
      db.prepare("SELECT COUNT(*) as c FROM roster_checks"),
      db.prepare("SELECT COUNT(*) as c FROM roster_checks WHERE status = 'pending'"),
      db.prepare("SELECT status as k, COUNT(*) as c FROM roster_checks GROUP BY status ORDER BY c DESC"),
      db.prepare("SELECT COUNT(*) as c FROM athletes"),
      db.prepare("SELECT COUNT(*) as c FROM athletes WHERE active = 1"),
      db.prepare("SELECT sport as k, COUNT(*) as c FROM athletes GROUP BY sport ORDER BY c DESC"),
      db.prepare("SELECT COUNT(*) as c FROM sources WHERE active = 1"),
      db.prepare("SELECT COUNT(*) as c FROM stories"),
      db.prepare("SELECT status as k, COUNT(*) as c FROM stories GROUP BY status ORDER BY c DESC"),
      db.prepare("SELECT run_type, started_at, status, items_processed, items_found FROM pipeline_runs ORDER BY id DESC LIMIT 10"),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = (r: any) => (r.results?.[0] as Record<string, number>) ?? { c: 0 };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (r: any) => (r.results ?? []) as Array<Record<string, string | number>>;

    return {
      schools: {
        total: row(schoolsTotal).c,
        withUrl: row(schoolsWithUrl).c,
        byDivision: rows(schoolsByDiv).map((r) => ({ key: r.k as string, count: r.c as number })),
      },
      rosterChecks: {
        total: row(rcTotal).c,
        pending: row(rcPending).c,
        byStatus: rows(rcByStatus).map((r) => ({ key: r.k as string, count: r.c as number })),
      },
      athletes: {
        total: row(athletesTotal).c,
        active: row(athletesActive).c,
        bySport: rows(athletesBySport).map((r) => ({ key: r.k as string, count: r.c as number })),
      },
      sources: { total: row(sourcesTotal).c },
      stories: {
        total: row(storiesTotal).c,
        byStatus: rows(storiesByStatus).map((r) => ({ key: r.k as string, count: r.c as number })),
      },
      recentRuns: rows(recentRuns) as PipelineStats["recentRuns"],
    };
  } catch {
    return null;
  }
}
