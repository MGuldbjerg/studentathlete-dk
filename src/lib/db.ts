import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DEFAULT_COUNTRY } from "./countries";
import { contentCountry } from "./site-server";
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
 * Hvilket lands indhold hentes der? Nationalitet er DATA (migration 034), så
 * listerne filtrerer eksplicit i stedet for at antage at "alle rækker" er danske.
 *
 * **Uden argument afgøres landet af VÆRTEN**, ikke af en konstant. Det var
 * fejlen ved UK-launchen: filtrene fandtes, men ingen kalder sendte et land med,
 * så hvert site fik standardlandets indhold — .co.uk viste danske atleter og et
 * sitemap identisk med .dk's, altså en dublet. Ingen side kaldte forkert; det
 * var defaulten der var forkert.
 *
 * Uden request-kontekst (byggetid, scripts, tests) falder `contentCountry()`
 * tilbage til standardsitet, præcis som før. I admin er svaret landevælgerens
 * land, ikke værtens — se `contentCountry()`.
 */
export async function siteCountry(country?: string): Promise<string> {
  if (country) return country.toUpperCase();
  try {
    return (await contentCountry()).toUpperCase();
  } catch {
    return DEFAULT_COUNTRY.toUpperCase();
  }
}

/**
 * Read-through cache for the handful of aggregates the site renders constantly.
 *
 * Measured 2026-09-05: three `athletes` aggregates were 43 % of the day's D1
 * rows read (821k of 1.93M) across only 280 runs. There are 2,823 active
 * athletes, so each run walked nearly the whole set to produce a few numbers.
 * No index fixes that — the scans need columns (`sport`, `name`) no index
 * covers. The fix is to stop asking 280 times a day.
 *
 * The cache heals itself: the first render to find a row older than the TTL
 * recomputes and writes it back, so there is no cron to forget and a dropped
 * table costs nothing but one slow render. Every failure path falls through to
 * `compute()` — a missing table (before migration 049), a bad row, a write that
 * does not land. The cache can only ever make this cheaper, never wrong.
 *
 * TTL is deliberately short. At ~11 renders/hour a 60-minute window still cuts
 * the work by ~90 %, and an hour is close enough for counts that change when a
 * roster scrape lands.
 */
export const STATS_TTL_MINUTES = 60;

export async function cachedStat<T>(
  key: string,
  country: string,
  compute: () => Promise<T>,
): Promise<T> {
  const db = await getDB();
  if (!db) return compute();

  try {
    const row = (await db
      .prepare(
        `SELECT value FROM stats_cache
          WHERE key = ? AND country = ?
            AND computed_at >= datetime('now', ?)`,
      )
      .bind(key, country, `-${STATS_TTL_MINUTES} minutes`)
      .first()) as { value: string } | null;
    if (row?.value) return JSON.parse(row.value) as T;
  } catch {
    /* no table, unreadable row — fall through and compute */
  }

  const fresh = await compute();

  try {
    await db
      .prepare(
        `INSERT OR REPLACE INTO stats_cache (key, country, value, computed_at)
         VALUES (?, ?, ?, datetime('now'))`,
      )
      .bind(key, country, JSON.stringify(fresh))
      .run();
  } catch {
    /* a cache that cannot be written is still a correct page */
  }

  return fresh;
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

export async function getLatestArticles(limit = 5, country?: string): Promise<Article[]> {
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
         WHERE a.published = 1 AND a.country = ?
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .bind(await siteCountry(country), limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

/** Fastgjorte artikler til forsidens karrusel (nyeste først). */
export async function getFeaturedArticles(limit = 5, country?: string): Promise<Article[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT ${ARTICLE_SELECT}
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE a.published = 1 AND a.featured = 1 AND a.country = ?
         ORDER BY a.published_at DESC LIMIT ?`,
      )
      .bind(await siteCountry(country), limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch {
    return [];
  }
}

/**
 * Artiklen med den slug — PÅ DETTE SITE. Et andet lands artikel giver `null`
 * (altså 404), i stedet for at ligge på begge domæner som en dublet.
 */
/**
 * En databasefejl er IKKE «findes ikke».
 * =====================================
 *
 * Opslag pr. slug returnerede `null` både når atleten ikke fandtes, og når D1
 * svarede med en fejl — og siden kalder `notFound()` på `null`. Resultatet så
 * man 2. september: D1's daglige læsegrænse blev ramt, og
 * `/atleter/sebastian-tirsgaard-larsen` begyndte at svare **404** til alle,
 * Google inklusive. 404 betyder «denne side findes ikke, glem den»; 500
 * betyder «prøv igen senere». Vi sagde det første om hver eneste atlet på
 * sitet, mens vi netop kæmpede for at få .co.uk indekseret.
 *
 * Derfor: en fejl kastes videre. Next viser fejlsiden (5xx), crawleren kommer
 * igen, og siden beholder sin plads i indekset. Kun et TOMT svar er «findes
 * ikke».
 */
function rethrowDbError(err: unknown, what: string): never {
  const msg = err instanceof Error ? err.message : String(err);
  throw new Error(`D1-opslag fejlede (${what}): ${msg}`);
}

export async function getArticleBySlug(slug: string, country?: string): Promise<Article | null> {
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
         WHERE a.slug = ? AND a.published = 1 AND a.country = ?`
      )
      .bind(slug, await siteCountry(country))
      .first();
    return (r as Article) ?? null;
  } catch (err) { rethrowDbError(err, "artikel"); }
}

export async function getArticles({
  q = "", sport = "", limit = 18, offset = 0, country,
}: { q?: string; sport?: string; limit?: number; offset?: number; country?: string } = {}): Promise<Article[]> {
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
    const conditions: string[] = ["a.published = 1", "a.country = ?"];
    const params: (string | number)[] = [await siteCountry(country)];
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

/**
 * Antal artikler der matcher SAMME filtre som `getArticles`. Bruges til
 * paginering på arkivsiden — derfor skal WHERE-delen holdes identisk med
 * getArticles ovenfor, ellers viser sidetallet noget andet end listen.
 */
export async function countArticles({
  q = "", sport = "", country,
}: { q?: string; sport?: string; country?: string } = {}): Promise<number> {
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
    if (sport) filtered = filtered.filter((a) => a.sport === sport);
    return filtered.length;
  }
  try {
    const conditions: string[] = ["a.published = 1", "a.country = ?"];
    const params: (string | number)[] = [await siteCountry(country)];
    if (q) {
      conditions.push("(a.title LIKE ? OR a.summary LIKE ? OR at.name LIKE ?)");
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (sport) { conditions.push("at.sport = ?"); params.push(sport); }
    const r = await db
      .prepare(
        `SELECT COUNT(*) AS n
         FROM articles a
         LEFT JOIN athletes at ON a.athlete_id = at.id
         WHERE ${conditions.join(" AND ")}`
      )
      .bind(...params)
      .all();
    return Number((r.results?.[0] as { n?: number } | undefined)?.n ?? 0);
  } catch { return 0; }
}

export interface SiteCounts {
  athletes: number;
  universities: number;
  sports: number;
  newThisWeek: number;
}

/**
 * Tallene til forsidens datastribe. Kun størrelser vi FAKTISK har i basen —
 * ingen personlige rekorder eller ranglister (se mockup-noten): antal aktive
 * atleter, hvor mange universiteter de går på, hvor mange sportsgrene de
 * fordeler sig over, og hvor mange artikler der er udkommet de sidste syv dage.
 */
export async function getSiteCounts(country?: string): Promise<SiteCounts> {
  const db = await getDB();
  const code = await siteCountry(country);
  if (!db) {
    const active = MOCK_ATHLETES.filter((a) => a.active === 1);
    return {
      athletes: active.length,
      universities: new Set(active.map((a) => a.university)).size,
      sports: new Set(active.map((a) => a.sport)).size,
      newThisWeek: 0,
    };
  }
  try {
    // The athlete aggregate is cached; the 7-day article count is not. The
    // article table is small, and it is the number that moves when Mikkel
    // publishes — an hour of staleness there would be visible.
    const [who, fresh] = await Promise.all([
      cachedStat<{ athletes: number; universities: number; sports: number }>(
        "site_counts",
        code,
        async () => {
          const r = (await db
            .prepare(
              `SELECT COUNT(*) AS athletes,
                      COUNT(DISTINCT university) AS universities,
                      COUNT(DISTINCT sport) AS sports
               FROM athletes WHERE active = 1 AND home_country = ?`
            )
            .bind(code)
            .first()) as { athletes?: number; universities?: number; sports?: number } | null;
          return {
            athletes: Number(r?.athletes ?? 0),
            universities: Number(r?.universities ?? 0),
            sports: Number(r?.sports ?? 0),
          };
        },
      ),
      db
        .prepare(
          `SELECT COUNT(*) AS n FROM articles
           WHERE published = 1 AND country = ?
             AND published_at >= datetime('now', '-7 days')`
        )
        .bind(code)
        .first(),
    ]);
    return {
      athletes: who.athletes,
      universities: who.universities,
      sports: who.sports,
      newThisWeek: Number((fresh as { n?: number } | null)?.n ?? 0),
    };
  } catch {
    return { athletes: 0, universities: 0, sports: 0, newThisWeek: 0 };
  }
}

export interface SportGroup {
  sport: string;
  athleteCount: number;
  articles: Article[];
}

/**
 * Artikler grupperet efter sport til forsidens tekstbånd. Ét opslag henter de
 * seneste artikler bredt, ét henter atlet-antal pr. sport — grupperingen sker
 * i JS, så vi undgår et opslag pr. sportsgren.
 *
 * `excludeIds` holder båndet fri af de artikler forsiden allerede har vist
 * længere oppe; sportsgrene sorteres efter nyeste artikel.
 */
export async function getArticlesGroupedBySport({
  sports = 4, perSport = 2, excludeIds = [], country,
}: {
  sports?: number; perSport?: number; excludeIds?: number[]; country?: string;
} = {}): Promise<SportGroup[]> {
  const db = await getDB();
  const code = await siteCountry(country);
  if (!db) return [];
  try {
    const [recent, counts] = await Promise.all([
      db
        .prepare(
          `SELECT ${ARTICLE_SELECT}
           FROM articles a
           LEFT JOIN athletes at ON a.athlete_id = at.id
           WHERE a.published = 1 AND a.country = ? AND at.sport IS NOT NULL
           ORDER BY a.published_at DESC LIMIT 60`
        )
        .bind(code)
        .all(),
      cachedStat<Array<{ sport: string; n: number }>>("sport_counts", code, async () => {
        const r = await db
          .prepare(
            `SELECT sport, COUNT(*) AS n FROM athletes
             WHERE active = 1 AND home_country = ? AND sport IS NOT NULL
             GROUP BY sport`
          )
          .bind(code)
          .all();
        return (r.results ?? []) as Array<{ sport: string; n: number }>;
      }),
    ]);

    const perSportCount = new Map<string, number>();
    for (const row of counts) {
      perSportCount.set(row.sport, row.n);
    }

    const skip = new Set(excludeIds);
    const grouped = new Map<string, Article[]>();
    for (const a of (recent.results ?? []) as Article[]) {
      if (!a.sport || skip.has(a.id)) continue;
      const bucket = grouped.get(a.sport) ?? [];
      if (bucket.length >= perSport) continue;
      bucket.push(a);
      grouped.set(a.sport, bucket);
    }

    // Rækkefølgen fra SQL er nyeste først, så Map'ens indsættelsesorden er
    // allerede "sport med den friskeste artikel først".
    return [...grouped.entries()]
      .slice(0, sports)
      .map(([sport, articles]) => ({
        sport,
        athleteCount: perSportCount.get(sport) ?? 0,
        articles,
      }));
  } catch { return []; }
}

export async function getArticlesByAthleteId(
  athleteId: number, limit = 6, country?: string
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
         WHERE a.athlete_id = ? AND a.published = 1 AND a.country = ?
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .bind(athleteId, await siteCountry(country), limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

export async function getArticlesByUniversity(
  university: string, limit = 4, country?: string
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
         WHERE at.university = ? AND a.published = 1 AND a.country = ?
         ORDER BY a.published_at DESC LIMIT ?`
      )
      .bind(university, await siteCountry(country), limit)
      .all();
    return (r.results ?? []) as Article[];
  } catch { return []; }
}

// ─── Atleter ─────────────────────────────────────────────────────────────────

/**
 * Atleten med den slug — PÅ DETTE SITE. Et andet lands atlet giver `null`, så
 * profilen kun findes ét sted (samme grund som `getArticleBySlug`).
 */
export async function getAthleteBySlug(slug: string, country?: string): Promise<Athlete | null> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES.find((a) => a.slug === slug) ?? null;
  }
  try {
    const r = await db
      .prepare("SELECT * FROM athletes WHERE slug = ? AND home_country = ?")
      .bind(slug, await siteCountry(country))
      .first();
    return (r as Athlete) ?? null;
  } catch (err) { rethrowDbError(err, "atlet"); }
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
      .bind(university, await siteCountry(country), limit)
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
      .bind(await siteCountry(country))
      .all();
    return (r.results ?? []) as Athlete[];
  } catch { return []; }
}

/**
 * Atleterne under ÉT forbogstav — filtreret i SQL, ikke i JavaScript.
 *
 * Bogstavsiderne hentede før HELE listen (2.343 rækker på .co.uk) og kastede
 * ~90% væk i JS. Det kostede 330-380 ms TTFB mod 140 ms på en artikelside.
 *
 * Begge kasser af bogstavet bindes som parametre, fordi SQLite's `upper()` er
 * ASCII-only: den kan ikke se at «ø» og «Ø» er samme bogstav, og et dansk
 * efternavn ville falde ud af sin egen side.
 */
export async function getAthletesByLetter(
  upper: string,
  lower: string,
  country?: string,
): Promise<Athlete[]> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        `SELECT * FROM athletes
         WHERE home_country = ? AND active = 1
           AND (substr(name, 1, 1) = ? OR substr(name, 1, 1) = ?)
         ORDER BY name`,
      )
      .bind(await siteCountry(country), upper, lower)
      .all();
    return (r.results ?? []) as Athlete[];
  } catch (err) {
    // Tom liste = «bogstavet har ingen atleter» → siden kalder notFound().
    // En D1-fejl må derfor ikke returnere tom liste: så bliver et nedbrud til
    // 404 på /atleter/s, præcis som det skete for atletsiderne 2. september.
    rethrowDbError(err, "atleter pr. bogstav");
  }
}

/**
 * Antal aktive atleter pr. forbogstav — ét lille resultat i stedet for hele
 * tabellen. Foldningen af store/små bogstaver sker i JS, hvor Unicode virker.
 */
export async function getAthleteInitialCounts(
  country?: string,
): Promise<Array<{ initial: string; n: number }>> {
  const db = await getDB();
  if (!db) return [];
  const code = await siteCountry(country);
  try {
    return await cachedStat<Array<{ initial: string; n: number }>>(
      "initials",
      code,
      async () => {
        const r = await db
          .prepare(
            `SELECT substr(name, 1, 1) AS initial, COUNT(*) AS n
             FROM athletes WHERE home_country = ? AND active = 1
             GROUP BY initial`,
          )
          .bind(code)
          .all();
        return (r.results ?? []) as Array<{ initial: string; n: number }>;
      },
    );
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
      .bind(await siteCountry(country))
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
      .bind(sport, await siteCountry(country), limit)
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
      .bind(sport, await siteCountry(country), limit)
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
      .bind(sport, await siteCountry(country))
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
  } catch (err) { rethrowDbError(err, "skole"); }
}

/** Skoler med mindst én aktiv atlet FRA DETTE SITES LAND, med antal — /skoler-hubben. */
export async function getSchoolsWithAthletes(country?: string): Promise<
  (School & { athlete_count: number })[]
> {
  const db = await getDB();
  if (!db) return [];
  try {
    const r = await db
      .prepare(
        // Tællingen sker FØRST, på den lille side. Grupperingen læser kun
        // landets aktive atleter; derefter er der præcis ét skoleopslag pr.
        // navn. `HAVING > 0` er unødvendig nu: et indre join giver aldrig 0.
        `SELECT s.*, c.athlete_count
         FROM (
           SELECT university, COUNT(*) AS athlete_count
           FROM athletes
           WHERE home_country = ? AND active = 1
           GROUP BY university
         ) c
         JOIN schools s ON s.name = c.university
         ORDER BY s.division ASC, c.athlete_count DESC, s.name ASC`,
      )
      .bind(await siteCountry(country))
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

export async function getAllArticleSlugs(country?: string): Promise<
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
         WHERE a.published = 1 AND a.country = ?
         ORDER BY a.published_at DESC`
      )
      .bind(await siteCountry(country))
      .all();
    return (r.results ?? []) as { slug: string; sport: string | null; updated_at: string }[];
  } catch (err) { rethrowDbError(err, "artikel-slugs til sitemap"); }
}

/**
 * En databasefejl er heller ikke ET KORTERE SITEMAP.
 * =================================================
 *
 * De tre slug-opslag herunder sluttede i `catch { return [] }`, og et tomt
 * svar ser ud som et gyldigt svar. Da læsegrænsen blev håndhævet 2. september
 * svarede `/sitemap.xml` derfor **200 OK med 57 URL'er** i stedet for 550 —
 * skiftevis, fra sekund til sekund, alt efter om D1 afviste netop den
 * forespørgsel. Begge domæner leverede samtidig det SAMME sitemap, altså
 * netop den dublet landefiltret var bygget til at fjerne.
 *
 * Et sitemap der mangler 2.400 adresser er værre end intet sitemap: Google
 * læser det som en liste over hvad sitet HAR. Et 500 betyder «kunne ikke
 * hentes, prøv igen», og de kendte adresser beholder deres plads.
 *
 * Derfor kaster de nu, ligesom slug-opslagene ovenfor. Kun et ægte tomt
 * resultat er en tom liste — et dark launch-land har lov at have nul artikler.
 */
/**
 * Alle atlet-slugs til sitemappet — bÅDE aktive og alumni, for begge har en
 * profilside. `name` og `active` er med, fordi sitemappet også skal kunne
 * udlede hvilke BOGSTAVSIDER der findes (kun bogstaver med aktive atleter).
 */
export async function getAllAthleteSlugs(country?: string): Promise<
  { slug: string; updated_at: string; name: string; active: number }[]
> {
  const db = await getDB();
  if (!db) {
    return MOCK_ATHLETES
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({ slug: a.slug, updated_at: a.updated_at, name: a.name, active: a.active }));
  }
  try {
    const r = await db
      .prepare("SELECT slug, updated_at, name, active FROM athletes WHERE home_country = ? ORDER BY name")
      .bind(await siteCountry(country))
      .all();
    return (r.results ?? []) as { slug: string; updated_at: string; name: string; active: number }[];
  } catch (err) { rethrowDbError(err, "atlet-slugs til sitemap"); }
}

/**
 * Kun skoler sitet FAKTISK har atleter på. Uden landefiltret listede begge
 * sitemaps alle 91 skoler — også dem uden en eneste atlet fra landet, hvis
 * skoleside derfor er tom.
 */
export async function getAllSchoolSlugs(country?: string): Promise<{ slug: string }[]> {
  const db = await getDB();
  if (!db) {
    return MOCK_SCHOOLS
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ slug: s.slug }));
  }
  try {
    const r = await db
      .prepare(
        // Drevet fra ATLETERNE, ikke fra skolerne. Joinet den gamle vej lod
        // planlæggeren vælge `active = 1` som indgang — et prædikat der matcher
        // hver eneste atlet — og derefter skanne alle skoler pr. atlet.
        // Underforespørgslen læser nu kun landets aktive atleter (dækket af
        // idx_athletes_country_active_uni), og `name IN (...)` slår hver skole
        // op i idx_schools_name. Samme resultat, uden krydsproduktet.
        `SELECT slug FROM schools
         WHERE name IN (
           SELECT university FROM athletes
           WHERE home_country = ? AND active = 1
         )
         ORDER BY name`,
      )
      .bind(await siteCountry(country))
      .all();
    return (r.results ?? []) as { slug: string }[];
  } catch (err) { rethrowDbError(err, "skole-slugs til sitemap"); }
}
