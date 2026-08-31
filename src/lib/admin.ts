import { getDB, ARTICLE_SELECT } from "./db";
import { pingIndexNow } from "./indexnow";
import { getArticleUrl } from "./seo";
import { currentBaseUrl, currentLanguage } from "./site-server";
import { generateSlug } from "./slug";
import { buildMergeStatements } from "./athlete-merge";
import type { Article, Athlete } from "./types";
import { siteDefaults, SETTING_KEYS, settingScope, GLOBAL_SCOPE } from "./site-content";
import { contentCountry } from "./site-server";
import { extractEvents, seasonFromDate } from "./athlete-events";

// ─── DB-queries til admin ───────────────────────────────────────────────────

/**
 * Kladdekøen for det land landevælgeren peger på (`contentCountry()`).
 *
 * Admin bor kun på standardsitet, men redigerer ét land ad gangen — ellers
 * ville britiske og danske kladder ligge i samme kø og skulle skelnes i hovedet.
 */
export async function getDraftArticles(): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    // s.sensitive: presseetik-flag (FØLSOM-badge) — flagede kladder øverst,
    // så de aldrig godkendes i forbifarten.
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}, s.sensitive
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         LEFT JOIN stories s ON a.story_id = s.id
         WHERE a.published = 0 AND a.country = ?
         ORDER BY CASE WHEN s.sensitive IS NOT NULL THEN 0 ELSE 1 END ASC,
         CASE a.fabrication_risk
           WHEN 'low' THEN 0
           WHEN 'medium' THEN 2
           WHEN 'high' THEN 3
           ELSE 1
         END ASC, a.created_at ASC`
      )
      .bind(await contentCountry())
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
      `SELECT a.cover_image_url, a.title, a.article_type, a.summary, a.content,
              a.athlete_id, a.source_url, a.original_content, a.fabrication_risk,
              s.fact_sheet, s.sensitive,
              at.photo_url, at.sport
       FROM articles a
       LEFT JOIN athletes at ON a.athlete_id = at.id
       LEFT JOIN stories s ON a.story_id = s.id
       WHERE a.id = ?`
    )
    .bind(id)
    .first() as {
      cover_image_url: string | null;
      title: string;
      article_type: string;
      summary: string | null;
      content: string | null;
      athlete_id: number | null;
      source_url: string | null;
      original_content: string | null;
      fabrication_risk: string | null;
      fact_sheet: string | null;
      sensitive: string | null;
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

  // Review-log (plan 1.3, omformålet: evidens for review-omkostning, IKKE
  // auto-publish-gate): publish af en AI-kladde = godkendt; redigeret hvis
  // indholdet afviger fra original_content. Kun AI-kladder (original_content
  // sat) logges — manuelt oprettede artikler er ikke review-beslutninger.
  // Må aldrig blokere udgivelsen (kører også før migration-027 er kørt).
  if (article?.original_content) {
    try {
      const decision =
        article.content === article.original_content ? "approved_as_is" : "edited";
      await db
        .prepare(
          `INSERT INTO review_log (article_id, decision, article_type, fabrication_risk, sensitive)
           VALUES (?, ?, ?, ?, ?)`
        )
        .bind(id, decision, article.article_type ?? null, article.fabrication_risk ?? null, article.sensitive ?? null)
        .run();
    } catch {
      /* log-fejl må aldrig vælte udgivelsen */
    }
  }

  // Karriere-tidslinje: høst kildebelagte priser/begivenheder fra artiklen
  // (dedup på athlete_id+award_name+season). Må aldrig blokere udgivelsen.
  if (article?.athlete_id) {
    try {
      const text = [article.title, article.summary, article.content, article.fact_sheet]
        .filter(Boolean)
        .join("\n");
      const events = extractEvents(text);
      if (events.length) {
        const season = seasonFromDate(null);
        const occurred = new Date().toISOString().slice(0, 10);
        for (const e of events) {
          await db
            .prepare(
              `INSERT OR IGNORE INTO athlete_events
                 (athlete_id, occurred_on, season, kind, award_name, summary, significance, source_url, article_id, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            )
            .bind(article.athlete_id, occurred, season, e.kind, e.award_name, e.summary, e.significance, article.source_url ?? null, id)
            .run();
        }
      }
    } catch {
      /* høst-fejl må aldrig vælte udgivelsen */
    }
  }
}


/**
 * Fortæl IndexNow om en netop udgivet artikel.
 *
 * Kaldes EFTER publishArticle, ikke inde i den: en misset ping er en misset
 * indeksering, ikke en fejlet udgivelse, og redaktøren skal aldrig se en fejl
 * fordi Bing er nede. Derfor returneres bool og kastes aldrig.
 *
 * Google er IKKE med i IndexNow — for Google er sitemap og intern linkning
 * fortsat den eneste vej. Se src/lib/indexnow.ts.
 */
export async function announcePublishedArticle(id: number): Promise<boolean> {
  try {
    const db = await getDB();
    if (!db) return false;
    const row = (await db
      .prepare(
        `SELECT a.slug, at.sport
           FROM articles a
           LEFT JOIN athletes at ON a.athlete_id = at.id
          WHERE a.id = ? AND a.published = 1`,
      )
      .bind(id)
      .first()) as { slug: string; sport: string | null } | null;
    if (!row?.slug) return false;

    const [base, lang] = await Promise.all([currentBaseUrl(), currentLanguage()]);
    return await pingIndexNow([`${base}${getArticleUrl(row, lang)}`]);
  } catch {
    return false;
  }
}
export async function deleteArticle(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  // Review-log: sletning af en AI-kladde = afvist (rejected). Publicerede
  // artikler og manuelt oprettede kladder logges ikke. Fail-safe.
  try {
    const row = await db
      .prepare(
        `SELECT a.published, a.original_content, a.title, a.article_type, a.fabrication_risk,
                a.story_id, a.athlete_id, s.sensitive
         FROM articles a LEFT JOIN stories s ON a.story_id = s.id WHERE a.id = ?`
      )
      .bind(id)
      .first() as {
        published: number;
        original_content: string | null;
        title: string | null;
        article_type: string | null;
        fabrication_risk: string | null;
        story_id: number | null;
        athlete_id: number | null;
        sensitive: string | null;
      } | null;
    if (row && row.published === 0 && row.original_content) {
      await db
        .prepare(
          // Teksten gemmes MED: uden den kan en afvisning ikke efterprøves
          // senere, og afvisningerne er de vigtigste sager at måle et
          // kvalitetstjek på (migration 044).
          `INSERT INTO review_log (article_id, decision, article_type, fabrication_risk, sensitive,
                                   content_snapshot, title_snapshot, story_id, athlete_id)
           VALUES (?, 'rejected', ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          row.article_type,
          row.fabrication_risk,
          row.sensitive,
          row.original_content,
          row.title,
          row.story_id,
          row.athlete_id
        )
        .run();
    }
  } catch {
    /* log-fejl må aldrig blokere sletning */
  }
  // To tabeller PEGER på artiklen med en fremmednøgle, og D1 håndhæver dem:
  // `draft_reviews` (migration 043) og `social_posts` (migration 018). Fra og
  // med 043 har HVER kladde mindst én gennemgang, så en ren
  // `DELETE FROM articles` fejlede med FOREIGN KEY constraint failed — og
  // /admin's afvis-knap svarede «Serverfejl» på hver eneste kladde.
  //
  // Begge tabeller er logbøger OM rækken og kan ikke overleve den. Det der SKAL
  // overleve, ligger i `review_log`: den har ingen fremmednøgle og gemmer selve
  // teksten (migration 044), så en afvisning kan efterprøves bagefter.
  // Rækkefølgen er børn før forælder, i én batch, så en halv sletning ikke kan
  // efterlade en gennemgang uden artikel.
  await db.batch([
    db.prepare("DELETE FROM draft_reviews WHERE article_id = ?").bind(id),
    db.prepare("DELETE FROM social_posts WHERE article_id = ?").bind(id),
    db.prepare("DELETE FROM articles WHERE id = ?").bind(id),
  ]);
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
         WHERE a.country = ?
         ORDER BY a.updated_at DESC`
      )
      .bind(await contentCountry())
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
    author_role?: string | null;
    correction_note?: string | null;
    athlete_id?: number | null;
    featured?: number;
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
  // Synlig rettelse: sættes/opdateres noten → stempl corrected_at; ryddes → nulstil
  if (fields.correction_note !== undefined) {
    sets.push(
      fields.correction_note
        ? "corrected_at = datetime('now')"
        : "corrected_at = NULL",
    );
  }
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
      // country stemples fra landevælgeren. Uden den falder rækken tilbage på
      // kolonnens DEFAULT 'DK' og ville forsvinde ud af den kø den blev skabt i.
      `INSERT INTO articles (title, slug, summary, content, article_type, author, athlete_id, country, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`
    )
    .bind(fields.title, slug, fields.summary, fields.content, fields.article_type, fields.author, fields.athlete_id, await contentCountry())
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
  kind?: string; // 'page' (default) | 'guide' | 'sport'
  category?: string | null; // hub-gruppering for guides
}

export async function getAllPages(): Promise<Array<Omit<PageRow, "content"> & { updated_at: string | null }>> {
  const db = await getDB();
  if (!db) return [];
  try {
    // Admin viser siderne for DET site den tilgås fra (migration 038).
    const country = (await contentCountry());
    const r = await db
      .prepare("SELECT slug, title, meta_description, published, kind, updated_at FROM pages WHERE country = ? ORDER BY kind ASC, title ASC")
      .bind(country)
      .all();
    return (r.results ?? []) as Array<Omit<PageRow, "content"> & { updated_at: string | null }>;
  } catch {
    return [];
  }
}

/**
 * Én side. Landet udledes af værten, så alle fire offentlige opslag nedenfor
 * (side, guide, sport, admin) automatisk rammer det rigtige sites indhold —
 * uden at kalderne skal vide noget.
 */
export async function getPageBySlug(slug: string, country?: string): Promise<PageRow | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const code = country ?? (await contentCountry());
    const r = await db
      .prepare("SELECT slug, title, content, meta_description, published, kind, category FROM pages WHERE slug = ? AND country = ?")
      .bind(slug, code)
      .first();
    return (r as PageRow) ?? null;
  } catch {
    return null;
  }
}

/**
 * Offentlig statisk side (/[slug]) — KUN kind='page' (så guides/sport-tekster
 * ikke også dukker op på roden). Kladder (published=0) findes ikke udenfor admin.
 */
export async function getPublishedPageBySlug(slug: string): Promise<PageRow | null> {
  const page = await getPageBySlug(slug);
  if (!page || page.published !== 1) return null;
  return (page.kind ?? "page") === "page" ? page : null;
}

/** Offentlig viden-guide (/viden/[slug]) — kun kind='guide', publiceret. */
export async function getPublishedGuideBySlug(slug: string): Promise<PageRow | null> {
  const page = await getPageBySlug(slug);
  return page && page.published === 1 && page.kind === "guide" ? page : null;
}

/** Offentlig sport-pillar (/[sport]) — kun kind='sport', publiceret. */
export async function getPublishedSportBySlug(slug: string): Promise<PageRow | null> {
  const page = await getPageBySlug(slug);
  return page && page.published === 1 && page.kind === "sport" ? page : null;
}

/** Site-tekster/indstillinger: kode-defaults flettet med D1-overrides. */
/**
 * Indstillinger for ET site. Landet udledes af requestens vært, så de seks
 * kaldesteder (layout, footer, ads.txt, disclaimer, admin) ikke skal vide noget
 * — de får automatisk det rigtige sites tekster.
 *
 * To scopes flettes (migration 037): først de globale rækker (`country = '*'`,
 * fx AdSense-kontoen der dækker begge domæner), derefter landets egne, som
 * vinder. Kode-defaults i bunden, som før.
 */
export async function getSiteSettings(country?: string): Promise<Record<string, string>> {
  const resolved = siteDefaults();
  const db = await getDB();
  if (!db) return resolved;
  const code = (country ?? (await contentCountry())).toUpperCase();
  try {
    const r = await db
      .prepare(
        `SELECT key, value, country FROM site_content
         WHERE country = ? OR country = ?
         ORDER BY CASE WHEN country = ? THEN 0 ELSE 1 END`,
      )
      .bind(GLOBAL_SCOPE, code, GLOBAL_SCOPE)
      .all();
    // Sorteringen sætter '*' først, så landets egen række overskriver den.
    for (const row of (r.results ?? []) as { key: string; value: string }[]) {
      if (row.key in resolved) resolved[row.key] = row.value;
    }
  } catch {
    /* fail-safe: behold defaults */
  }
  return resolved;
}

/**
 * Gem én override (kun kendte nøgler).
 *
 * Globale nøgler lander under '*' og gælder alle sites; alt andet gemmes på
 * det site admin tilgås fra. Redigerer du UK-teksterne, skal du altså åbne
 * admin på den britiske vært — samme mekanik som resten af motoren.
 */
export async function upsertSetting(key: string, value: string, country?: string): Promise<void> {
  if (!SETTING_KEYS.has(key)) return;
  const db = await getDB();
  if (!db) return;
  const scope =
    settingScope(key) === "global"
      ? GLOBAL_SCOPE
      : (country ?? (await contentCountry())).toUpperCase();
  await db
    .prepare(
      `INSERT INTO site_content (key, country, value, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(key, country) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    )
    .bind(key, scope, value)
    .run();
}

/** Tilføj en manuel karriere-begivenhed (dedup på athlete_id+award_name+season). */
export async function addAthleteEvent(e: {
  athlete_id: number;
  season: string | null;
  kind: string;
  award_name: string | null;
  summary: string;
  significance: string;
  source_url?: string | null;
}): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db
    .prepare(
      `INSERT OR IGNORE INTO athlete_events
         (athlete_id, occurred_on, season, kind, award_name, summary, significance, source_url, article_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'))`,
    )
    .bind(
      e.athlete_id,
      new Date().toISOString().slice(0, 10),
      e.season,
      e.kind,
      e.award_name,
      e.summary,
      e.significance,
      e.source_url ?? null,
    )
    .run();
}

export async function deleteAthleteEvent(id: number): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.prepare("DELETE FROM athlete_events WHERE id = ?").bind(id).run();
}

/** Publicerede guides til /viden-hubben + sitemap (uden content). */
export async function getPublishedGuides(): Promise<
  { slug: string; title: string; meta_description: string | null; category: string | null }[]
> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        "SELECT slug, title, meta_description, category FROM pages WHERE kind = 'guide' AND published = 1 AND country = ? ORDER BY title ASC",
      )
      .bind((await contentCountry()))
      .all();
    return (r.results ?? []) as {
      slug: string;
      title: string;
      meta_description: string | null;
      category: string | null;
    }[];
  } catch {
    return [];
  }
}

export async function upsertPage(
  slug: string,
  title: string,
  content: string,
  metaDescription: string | null,
  published?: number,
  country?: string,
): Promise<void> {
  const db = await getDB();
  if (!db) return;
  // published udeladt → bevar eksisterende værdi (0 for nye rækker)
  const pub = published ?? null;
  const code = country ?? (await contentCountry());
  await db
    .prepare(
      // ON CONFLICT(slug, country) — IKKE bare (slug). Efter migration 038 er
      // den unikke nøgle sammensat, og en ON CONFLICT der ikke matcher en
      // nøgle er en hård fejl i SQLite, ikke en no-op.
      `INSERT INTO pages (slug, country, title, content, meta_description, published, updated_at)
       VALUES (?, ?, ?, ?, ?, COALESCE(?, 0), datetime('now'))
       ON CONFLICT(slug, country) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         meta_description = excluded.meta_description,
         published = COALESCE(?, pages.published),
         updated_at = datetime('now')`
    )
    .bind(slug, code, title, content, metaDescription, pub, pub)
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
           AND a.home_country = ?
         GROUP BY s.id
         ORDER BY s.name ASC`
      )
      .bind(await contentCountry())
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
         WHERE ps.status = 'pending' AND a.home_country = ?
         ORDER BY ps.created_at ASC`
      )
      .bind(await contentCountry())
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
      .prepare(
        `SELECT COUNT(*) as cnt FROM photo_suggestions ps
         JOIN athletes a ON ps.athlete_id = a.id
         WHERE ps.status = 'pending' AND a.home_country = ?`,
      )
      .bind(await contentCountry())
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

// ─── Profiludkast (athletes.profile_draft, migration-031) ────────────────────
// Udkast-konvention (deles med pipeline/profiles/build-profile-drafts.ts):
// draft != NULL = afventer · godkend → summary=tekst, draft+draft_at=NULL ·
// afvis → draft=NULL men draft_at BEHOLDES (markerer "afvist" så baseline-
// tilstanden aldrig genforeslår; expand-kørsler må gerne).

export interface ProfileDraft {
  id: number; // athletes.id
  name: string;
  slug: string;
  university: string;
  sport: string;
  profile_summary: string | null;
  profile_draft: string;
  profile_draft_at: string | null;
}

export interface ProfileDraftEvent {
  season: string | null;
  award_name: string | null;
  summary: string;
  source_url: string | null;
}

export async function getPendingProfileDrafts(limit = 50): Promise<ProfileDraft[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT id, name, slug, university, sport,
                profile_summary, profile_draft, profile_draft_at
         FROM athletes
         WHERE profile_draft IS NOT NULL AND home_country = ?
         ORDER BY profile_draft_at ASC
         LIMIT ?`
      )
      .bind(await contentCountry(), limit)
      .all();
    return (r.results ?? []) as unknown as ProfileDraft[];
  } catch {
    return [];
  }
}

export async function getPendingProfileDraftCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  try {
    const r = await db
      .prepare("SELECT COUNT(*) as cnt FROM athletes WHERE profile_draft IS NOT NULL AND home_country = ?")
      .bind(await contentCountry())
      .first();
    return (r as { cnt: number })?.cnt ?? 0;
  } catch {
    return 0;
  }
}

/** Kildebelagte events for flere atleter ad gangen (grundlag i godkendelses-UI). */
export async function getEventsForAthletes(
  athleteIds: number[],
): Promise<Map<number, ProfileDraftEvent[]>> {
  const map = new Map<number, ProfileDraftEvent[]>();
  if (athleteIds.length === 0) return map;
  const db = await getDB();
  if (!db) return map;
  try {
    const placeholders = athleteIds.map(() => "?").join(",");
    const r = await db
      .prepare(
        `SELECT athlete_id, season, award_name, summary, source_url
         FROM athlete_events WHERE athlete_id IN (${placeholders})
         ORDER BY season ASC, occurred_on ASC`
      )
      .bind(...athleteIds)
      .all();
    for (const row of (r.results ?? []) as (ProfileDraftEvent & { athlete_id: number })[]) {
      const arr = map.get(row.athlete_id) ?? [];
      arr.push({ season: row.season, award_name: row.award_name, summary: row.summary, source_url: row.source_url });
      map.set(row.athlete_id, arr);
    }
  } catch {
    // tomt map = UI viser blot udkastet uden fakta-grundlag
  }
  return map;
}

/**
 * Godkend (evt. redigeret tekst → profile_summary) eller afvis et profiludkast.
 * Publicering sker KUN her — pipeline skriver aldrig profile_summary.
 */
export async function decideProfileDraft(
  athleteId: number,
  action: "approve" | "reject",
  editedText?: string,
): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;

  const row = await db
    .prepare("SELECT profile_draft FROM athletes WHERE id = ? AND profile_draft IS NOT NULL")
    .bind(athleteId)
    .first() as { profile_draft: string } | null;
  if (!row) return false;

  if (action === "approve") {
    const text = editedText?.trim() || row.profile_draft;
    await db
      .prepare(
        `UPDATE athletes SET profile_summary = ?, profile_draft = NULL,
         profile_draft_at = NULL, updated_at = datetime('now') WHERE id = ?`
      )
      .bind(text, athleteId)
      .run();
  } else {
    // Afvis: draft_at beholdes som afvisnings-markør (se konvention ovenfor).
    await db
      .prepare(
        "UPDATE athletes SET profile_draft = NULL, updated_at = datetime('now') WHERE id = ?"
      )
      .bind(athleteId)
      .run();
  }
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
      // home_country fra landevælgeren — samme grund som i createArticle.
      `INSERT INTO athletes (name, slug, sport, university, position, hometown, division, year_enrolled, home_country, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
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
      await contentCountry(),
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
    name?: string | null;
    photo_url?: string | null;
    photo_credit?: string | null;
    preferred_name?: string | null;
    expected_graduation?: number | null;
  },
): Promise<{ ok: boolean; error?: string; renamed?: boolean }> {
  const db = await getDB();
  if (!db) return { ok: false, error: "Ingen databaseforbindelse" };

  await db
    .prepare(
      `UPDATE athletes SET photo_url = ?, photo_credit = ?, preferred_name = ?, expected_graduation = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(
      fields.photo_url ?? null,
      fields.photo_credit ?? null,
      fields.preferred_name ?? null,
      fields.expected_graduation ?? null,
      id,
    )
    .run();

  const wanted = fields.name?.trim();
  if (!wanted) return { ok: true };
  return await renameAthlete(id, wanted);
}

/**
 * Ret det viste navn i hånden — fx skolens ASCII-foldede "Malthe Bogebjerg" →
 * "Malthe Bøgebjerg".
 *
 * Tre ting skal gælde bagefter, ellers ødelægger rettelsen mere end den løser:
 *  1. Skolens stavemåde bevares i roster_name, så den ugentlige scraper stadig
 *     genkender atleten (ellers ville rettelsen selv skabe en dublet).
 *  2. name_locked = 1, så scraperen aldrig retter navnet tilbage.
 *  3. Den gamle slug bliver 301-alias, så eksisterende links overlever.
 * Skrives navnet tilbage til skolens stavemåde, låses låsen op igen.
 */
export async function renameAthlete(
  id: number,
  newName: string,
): Promise<{ ok: boolean; error?: string; renamed?: boolean }> {
  const db = await getDB();
  if (!db) return { ok: false, error: "Ingen databaseforbindelse" };

  const current = (await db
    .prepare("SELECT id, name, slug, roster_name FROM athletes WHERE id = ?")
    .bind(id)
    .first()) as { id: number; name: string; slug: string; roster_name: string | null } | null;
  if (!current) return { ok: false, error: "Atlet ikke fundet" };

  const name = newName.trim();
  if (!name) return { ok: false, error: "Navnet må ikke være tomt" };
  if (name === current.name) return { ok: true, renamed: false };

  const newSlug = generateSlug(name);
  const clash = (await db
    .prepare("SELECT id FROM athletes WHERE slug = ? AND id != ?")
    .bind(newSlug, id)
    .first()) as { id: number } | null;
  if (clash) {
    return {
      ok: false,
      error: `URL'en /atleter/${newSlug} bruges allerede af atlet #${clash.id}. Er det den samme person? Så flet dem i stedet.`,
    };
  }

  // Skolens stavemåde er matchnøglen — den må ikke gå tabt ved første rettelse.
  const rosterName = current.roster_name ?? current.name;
  const locked = name === rosterName ? 0 : 1;

  if (newSlug !== current.slug) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO athlete_aliases (athlete_id, slug, name, reason)
         VALUES (?, ?, ?, 'manual')`,
      )
      .bind(id, current.slug, current.name)
      .run();
    // Genbruges en tidligere slug, må den ikke også stå som alias (løkke).
    await db.prepare("DELETE FROM athlete_aliases WHERE slug = ?").bind(newSlug).run();
  }

  await db
    .prepare(
      `UPDATE athletes SET name = ?, slug = ?, roster_name = ?, name_locked = ?,
       updated_at = datetime('now') WHERE id = ?`,
    )
    .bind(name, newSlug, rosterName, locked, id)
    .run();

  return { ok: true, renamed: true };
}

// ─── Dublet-kø (merge_candidates, migration-032) ─────────────────────────────

export interface MergeCandidate {
  id: number;
  score: number;
  reason: string;
  created_at: string;
  keep: Athlete;
  merge: Athlete;
}

/**
 * Ventende dublet-forslag. Sikre dubletter (fælles spiller-id hos skolen)
 * flettes automatisk af pipelinen og havner aldrig her — køen er kun de
 * tvivlsomme, hvor et menneske skal se på det.
 */
export async function getMergeCandidates(limit = 50): Promise<MergeCandidate[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT mc.id, mc.score, mc.reason, mc.created_at,
                k.id AS k_id, m.id AS m_id
         FROM merge_candidates mc
         JOIN athletes k ON k.id = mc.athlete_id_keep
         JOIN athletes m ON m.id = mc.athlete_id_merge
         WHERE mc.status = 'pending' AND k.home_country = ?
         ORDER BY mc.score DESC, mc.created_at ASC
         LIMIT ?`,
      )
      .bind(await contentCountry(), limit)
      .all();
    const rows = (r.results ?? []) as unknown as Array<{
      id: number; score: number; reason: string; created_at: string;
      k_id: number; m_id: number;
    }>;
    const out: MergeCandidate[] = [];
    for (const row of rows) {
      const [keep, merge] = await Promise.all([
        getAthleteById(row.k_id),
        getAthleteById(row.m_id),
      ]);
      if (keep && merge) {
        out.push({ id: row.id, score: row.score, reason: row.reason, created_at: row.created_at, keep, merge });
      }
    }
    return out;
  } catch {
    return [];
  }
}

export async function getMergeCandidateCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  try {
    const r = await db
      .prepare(
        `SELECT COUNT(*) as cnt FROM merge_candidates mc
         JOIN athletes k ON k.id = mc.athlete_id_keep
         WHERE mc.status = 'pending' AND k.home_country = ?`,
      )
      .bind(await contentCountry())
      .first();
    return (r as { cnt: number })?.cnt ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Afgør et dublet-forslag. "merge" flytter taberens artikler, historier, kilder
 * og manglende felter over på keeperen, gør taberens URL til et 301-alias og
 * sletter taber-rækken (src/lib/athlete-merge.ts). "reject" lukker forslaget,
 * så det ikke dukker op igen.
 *
 * `swap` bytter om på hvem der beholdes — nyttigt når det bedste navn står på
 * den anden række.
 */
export async function decideMergeCandidate(
  candidateId: number,
  action: "merge" | "reject",
  swap = false,
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDB();
  if (!db) return { ok: false, error: "Ingen databaseforbindelse" };

  const row = (await db
    .prepare(
      "SELECT athlete_id_keep, athlete_id_merge FROM merge_candidates WHERE id = ? AND status = 'pending'",
    )
    .bind(candidateId)
    .first()) as { athlete_id_keep: number; athlete_id_merge: number } | null;
  if (!row) return { ok: false, error: "Forslaget findes ikke eller er allerede afgjort" };

  if (action === "reject") {
    await db
      .prepare(
        "UPDATE merge_candidates SET status = 'rejected', decided_at = datetime('now') WHERE id = ?",
      )
      .bind(candidateId)
      .run();
    return { ok: true };
  }

  const keepId = swap ? row.athlete_id_merge : row.athlete_id_keep;
  const loserId = swap ? row.athlete_id_keep : row.athlete_id_merge;
  const [keep, loser] = await Promise.all([getAthleteById(keepId), getAthleteById(loserId)]);
  if (!keep || !loser) return { ok: false, error: "En af atleterne findes ikke længere" };

  for (const stmt of buildMergeStatements(keep, loser)) {
    await db.prepare(stmt.sql).bind(...stmt.params).run();
  }
  // Selve forslaget er allerede fjernet af buildMergeStatements (det peger på
  // taberen, og fremmednøglen kræver at det ryger før atleten slettes).
  return { ok: true };
}

// ─── Leads ("Spil i USA"-formularen, migration-028 — NSSA-forberedelse) ──────

export interface Lead {
  id: number;
  name: string;
  email: string;
  sport: string | null;
  message: string | null;
  source_path: string | null;
  referrer: string | null;
  status: string;
  created_at: string;
}

/** Gem et lead fra den offentlige formular. Attribution (source_path/referrer) medfølger. */
export async function insertLead(fields: {
  name: string;
  email: string;
  sport?: string | null;
  message?: string | null;
  source_path?: string | null;
  referrer?: string | null;
}): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;
  try {
    await db
      .prepare(
        `INSERT INTO leads (name, email, sport, message, source_path, referrer)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        fields.name,
        fields.email,
        fields.sport ?? null,
        fields.message ?? null,
        fields.source_path ?? null,
        fields.referrer ?? null,
      )
      .run();
    return true;
  } catch {
    return false;
  }
}

export async function getLeads(): Promise<Lead[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare("SELECT * FROM leads ORDER BY created_at DESC LIMIT 200")
      .all();
    return (r.results ?? []) as Lead[];
  } catch {
    return [];
  }
}

export async function getNewLeadCount(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  try {
    const r = await db
      .prepare("SELECT COUNT(*) as cnt FROM leads WHERE status = 'new'")
      .first();
    return (r as { cnt: number })?.cnt ?? 0;
  } catch {
    return 0;
  }
}

export async function updateLeadStatus(id: number, status: string): Promise<boolean> {
  const allowed = new Set(["new", "contacted", "forwarded", "closed"]);
  if (!allowed.has(status)) return false;
  const db = await getDB();
  if (!db) return false;
  const r = await db
    .prepare("UPDATE leads SET status = ? WHERE id = ?")
    .bind(status, id)
    .run();
  return ((r as { meta?: { changes?: number } })?.meta?.changes ?? 0) > 0;
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

// ─── Ekspansions-katalog (international_athletes) ────────────────────────────
// Walled-off tabel — ingen OFFENTLIG side læser den. Denne admin-visning giver
// beslutnings-input til pool-vs-eget-site-træet (jf. expansion-playbook.md):
// pr. sprog (redaktør-enhed), pr. region (pool-enhed), pr. land (graduering).

export interface CatalogueCount {
  name: string;
  n: number;
}
export interface CatalogueCountryRow extends CatalogueCount {
  language: string;
  region: string;
}
export interface CatalogueCounts {
  total: number;
  lastUpdated: string | null;
  byLanguage: CatalogueCount[];
  byRegion: CatalogueCount[];
  byCountry: CatalogueCountryRow[];
  bySport: CatalogueCount[];
  /** Region/sprog → top-sportsgrene ("soccer 42 · tennis 18") — hvor man leder efter frivillige. */
  topSportByLanguage: Record<string, string>;
  topSportByRegion: Record<string, string>;
}

/** Byg "top-k sportsgrene" pr. gruppe fra flade (grp, sport, n)-rækker. */
function topSportsByGroup(
  rows: Array<{ grp: string; sport: string | null; n: number }>,
  k = 3,
): Record<string, string> {
  const byGrp = new Map<string, Array<{ sport: string; n: number }>>();
  for (const r of rows) {
    if (!r.sport) continue;
    const arr = byGrp.get(r.grp) ?? [];
    arr.push({ sport: r.sport, n: r.n });
    byGrp.set(r.grp, arr);
  }
  const out: Record<string, string> = {};
  for (const [grp, arr] of byGrp) {
    arr.sort((a, b) => b.n - a.n);
    out[grp] = arr.slice(0, k).map((s) => `${s.sport} ${s.n}`).join(" · ");
  }
  return out;
}

export async function getCatalogueCounts(): Promise<CatalogueCounts | null> {
  const db = await getDB();
  if (!db) return null;
  try {
    const [totalRow, langs, regions, countries, sports, langSport, regionSport] =
      await Promise.all([
        db
          .prepare(
            `SELECT COUNT(*) AS total, MAX(last_seen) AS last
             FROM international_athletes WHERE active = 1`
          )
          .first(),
        db
          .prepare(
            `SELECT language AS name, COUNT(*) AS n FROM international_athletes
             WHERE active = 1 GROUP BY language ORDER BY n DESC`
          )
          .all(),
        db
          .prepare(
            `SELECT region AS name, COUNT(*) AS n FROM international_athletes
             WHERE active = 1 GROUP BY region ORDER BY n DESC`
          )
          .all(),
        db
          .prepare(
            `SELECT home_country AS name, COUNT(*) AS n,
                    MAX(language) AS language, MAX(region) AS region
             FROM international_athletes
             WHERE active = 1 GROUP BY home_country ORDER BY n DESC`
          )
          .all(),
        db
          .prepare(
            `SELECT sport AS name, COUNT(*) AS n FROM international_athletes
             WHERE active = 1 GROUP BY sport ORDER BY n DESC`
          )
          .all(),
        db
          .prepare(
            `SELECT language AS grp, sport, COUNT(*) AS n FROM international_athletes
             WHERE active = 1 GROUP BY language, sport`
          )
          .all(),
        db
          .prepare(
            `SELECT region AS grp, sport, COUNT(*) AS n FROM international_athletes
             WHERE active = 1 GROUP BY region, sport`
          )
          .all(),
      ]);
    const t = totalRow as { total: number; last: string | null } | null;
    return {
      total: t?.total ?? 0,
      lastUpdated: t?.last ?? null,
      byLanguage: (langs.results ?? []) as CatalogueCount[],
      byRegion: (regions.results ?? []) as CatalogueCount[],
      byCountry: (countries.results ?? []) as CatalogueCountryRow[],
      bySport: (sports.results ?? []) as CatalogueCount[],
      topSportByLanguage: topSportsByGroup(
        (langSport.results ?? []) as Array<{ grp: string; sport: string | null; n: number }>,
      ),
      topSportByRegion: topSportsByGroup(
        (regionSport.results ?? []) as Array<{ grp: string; sport: string | null; n: number }>,
      ),
    };
  } catch {
    return null;
  }
}
