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

  // OG-billede-URLs er kun til meta-tags — bruges IKKE som synligt cover.
  // Atletfotos (headshots) stamples bevidst IKKE som cover: lister/karrusel
  // bruger altid det genererede 16:9 kampkort (se getArticleCoverUrl).
  const rawCover = article?.cover_image_url ?? null;
  const coverUrl: string | null =
    rawCover && !rawCover.includes("/api/og") ? rawCover : null;

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
  // Læringsloop (migration-017)
  status?: string;
  rule_type?: string;
  evidence_count?: number;
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

/**
 * Pipeline-minede forslag der afventer redaktøren (mine-edits.ts).
 * Støjværn: enkeltords-swaps er for kontekstafhængige til at vise ved første
 * sigtning — de surfaces først ved evidence_count >= 3 (data bevares og tæller
 * videre i baggrunden). Flerords-fraser og husregler vises straks. Top 25.
 */
export async function getStyleSuggestions(): Promise<StyleCorrection[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT * FROM style_corrections
         WHERE status = 'suggested'
           AND (rule_type = 'house_rule'
                OR wrong_phrase LIKE '% %'
                OR correct_phrase LIKE '% %'
                OR evidence_count >= 3)
         ORDER BY evidence_count DESC, created_at ASC
         LIMIT 25`
      )
      .all();
    return (r.results ?? []) as StyleCorrection[];
  } catch {
    return [];
  }
}

/** Godkend (→ aktiv i prompten) eller afvis (genforeslås aldrig) et stilforslag. */
export async function decideStyleSuggestion(
  id: number,
  action: "approve" | "reject",
): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;
  const r = await db
    .prepare(
      `UPDATE style_corrections
       SET status = ?, active = ?
       WHERE id = ? AND status = 'suggested'`
    )
    .bind(action === "approve" ? "active" : "rejected", action === "approve" ? 1 : 0, id)
    .run();
  return ((r as { meta?: { changes?: number } })?.meta?.changes ?? 0) > 0;
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
  // status='rejected' så mine-edits aldrig genforeslår en slettet rettelse
  await db
    .prepare("UPDATE style_corrections SET active = 0, status = 'rejected' WHERE id = ?")
    .bind(id)
    .run();
}

// ─── Side-queries til admin ─────────────────────────────────────────────────

export interface PageRow {
  slug: string;
  title: string;
  content: string;
  meta_description: string | null;
  published: number;
}

export async function getAllPages(): Promise<Array<Omit<PageRow, "content"> & { updated_at: string | null }>> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare("SELECT slug, title, meta_description, published, updated_at FROM pages ORDER BY title ASC")
      .all();
    return (r.results ?? []) as Array<Omit<PageRow, "content"> & { updated_at: string | null }>;
  } catch {
    return [];
  }
}

export async function getPageBySlug(slug: string): Promise<PageRow | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const r = await db
      .prepare("SELECT slug, title, content, meta_description, published FROM pages WHERE slug = ?")
      .bind(slug)
      .first();
    return (r as PageRow) ?? null;
  } catch {
    return null;
  }
}

/** Offentlig variant — kladder (published=0) findes ikke udenfor admin. */
export async function getPublishedPageBySlug(slug: string): Promise<PageRow | null> {
  const page = await getPageBySlug(slug);
  return page && page.published === 1 ? page : null;
}

export async function upsertPage(
  slug: string,
  title: string,
  content: string,
  metaDescription: string | null,
  published?: number,
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  // published udeladt → bevar eksisterende værdi (0 for nye rækker)
  const pub = published ?? null;
  await db
    .prepare(
      `INSERT INTO pages (slug, title, content, meta_description, published, updated_at)
       VALUES (?, ?, ?, ?, COALESCE(?, 0), datetime('now'))
       ON CONFLICT(slug) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         meta_description = excluded.meta_description,
         published = COALESCE(?, pages.published),
         updated_at = datetime('now')`
    )
    .bind(slug, title, content, metaDescription, pub, pub)
    .run();
}

// ─── Skole-queries til admin (kampkort-farver) ──────────────────────────────

export interface AdminSchool {
  id: number;
  name: string;
  division: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  athlete_count: number;
}

/** Skoler med aktive danske atleter — dem hvis farver betyder noget for kampkort. */
export async function getSchoolsWithAthletes(): Promise<AdminSchool[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT s.id, s.name, s.division, s.primary_color, s.secondary_color,
                COUNT(a.id) as athlete_count
         FROM schools s
         JOIN athletes a ON a.university = s.name AND a.active = 1
         GROUP BY s.id
         ORDER BY s.name ASC`
      )
      .all();
    return (r.results ?? []) as AdminSchool[];
  } catch {
    return [];
  }
}

export async function updateSchoolColors(
  id: number,
  primaryColor: string | null,
  secondaryColor: string | null,
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db
    .prepare("UPDATE schools SET primary_color = ?, secondary_color = ? WHERE id = ?")
    .bind(primaryColor, secondaryColor, id)
    .run();
}

// ─── Foto-forslag (photo_suggestions, migration-016) ─────────────────────────

export interface PhotoSuggestion {
  id: number;
  athlete_id: number;
  image_url: string;
  credit: string;
  source_url: string;
  status: string;
  created_at: string;
  athlete_name: string;
  university: string;
  sport: string;
}

export async function getPendingPhotoSuggestions(): Promise<PhotoSuggestion[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT ps.id, ps.athlete_id, ps.image_url, ps.credit, ps.source_url,
                ps.status, ps.created_at,
                a.name as athlete_name, a.university, a.sport
         FROM photo_suggestions ps
         JOIN athletes a ON ps.athlete_id = a.id
         WHERE ps.status = 'pending'
         ORDER BY ps.created_at ASC`
      )
      .all();
    return (r.results ?? []) as PhotoSuggestion[];
  } catch {
    return [];
  }
}

export async function getPendingPhotoSuggestionCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  try {
    const r = await db
      .prepare("SELECT COUNT(*) as cnt FROM photo_suggestions WHERE status = 'pending'")
      .first();
    return (r as { cnt: number })?.cnt ?? 0;
  } catch {
    return 0;
  }
}

/** Godkend (→ athletes.photo_url/photo_credit) eller afvis et foto-forslag. */
export async function decidePhotoSuggestion(
  id: number,
  action: "approve" | "reject",
  credit?: string,
): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;

  const suggestion = await db
    .prepare("SELECT athlete_id, image_url, credit FROM photo_suggestions WHERE id = ? AND status = 'pending'")
    .bind(id)
    .first() as { athlete_id: number; image_url: string; credit: string } | null;
  if (!suggestion) return false;

  if (action === "approve") {
    await db
      .prepare(
        "UPDATE athletes SET photo_url = ?, photo_credit = ?, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(suggestion.image_url, credit?.trim() || suggestion.credit, suggestion.athlete_id)
      .run();
  }
  await db
    .prepare(
      "UPDATE photo_suggestions SET status = ?, decided_at = datetime('now') WHERE id = ?"
    )
    .bind(action === "approve" ? "approved" : "rejected", id)
    .run();
  return true;
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
