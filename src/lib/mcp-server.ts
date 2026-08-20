/**
 * MCP-server: værktøjerne Claude Desktop kan bruge på sitet.
 *
 * Desktop har hverken repo eller database. Kontekstpakken
 * (`desktop-pakke/`) giver den viden; det her giver den HÆNDER — men kun til
 * de handlinger vi selv har defineret. Alt går gennem de samme funktioner som
 * `/admin`, så en rettelse via Desktop opfører sig som en rettelse i UI'et.
 *
 * To regler er bygget ind, ikke skrevet i en vejledning:
 *
 * 1. **`save_draft` publicerer aldrig.** Den rører kun kladder (`published = 0`)
 *    og lader feltet være. Ingen automatisk publicering — nogensinde.
 * 2. **`publish_draft` kræver `confirm: true`** og nægter, hvis den seneste
 *    kvalitetsgennemgang endte på `reject`. Mikkel kan stadig publicere med et
 *    ord i chatten; en model kan ikke komme til det ved et uheld.
 *
 * Transport og autentifikation ligger i `src/app/api/mcp/[token]/route.ts`.
 */
import { getDB } from "./db";
import { publishArticle, updateArticle, upsertPage } from "./admin";

export const MCP_SERVER_NAME = "studentathlete";
export const MCP_SERVER_VERSION = "1.0.0";

/** Protokolversionen vi taler, når klienten ikke selv beder om en. */
const DEFAULT_PROTOCOL_VERSION = "2025-06-18";

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Skriver værktøjet i databasen? Bruges kun til beskrivelsen i tools/list. */
  writes?: boolean;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Landekode normaliseret; ukendt værdi bliver til undefined (= begge lande). */
function country(v: unknown): string | undefined {
  const c = str(v)?.toUpperCase();
  return c === "DK" || c === "UK" ? c : undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function all(sql: string, params: unknown[] = []): Promise<any[]> {
  const db = await getDB();
  if (!db) return [];
  const r = await db.prepare(sql).bind(...params).all();
  return r.results ?? [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function one(sql: string, params: unknown[] = []): Promise<any | null> {
  const db = await getDB();
  if (!db) return null;
  return (await db.prepare(sql).bind(...params).first()) ?? null;
}

/** Seneste kvalitetsgennemgang for en kladde — verdict styrer publish-spærren. */
async function latestReview(articleId: number) {
  return one(
    `SELECT verdict, summary, findings, created_at
       FROM draft_reviews WHERE article_id = ? ORDER BY id DESC LIMIT 1`,
    [articleId],
  );
}

const TOOLS: ToolDef[] = [
  {
    name: "list_drafts",
    description:
      "List upublicerede artikelkladder med seneste kvalitetsverdict (ok/fix/reject). " +
      "Brug den først — den giver id'erne de andre værktøjer arbejder på.",
    inputSchema: {
      type: "object",
      properties: {
        country: { type: "string", description: "DK eller UK. Udelades = begge lande." },
      },
    },
    handler: async (a) => {
      const c = country(a.country);
      const rows = await all(
        `SELECT ar.id, ar.title, ar.country, ar.article_type, ar.fabrication_risk,
                ar.created_at, ar.updated_at,
                (SELECT d.verdict FROM draft_reviews d
                  WHERE d.article_id = ar.id ORDER BY d.id DESC LIMIT 1) AS verdict
           FROM articles ar
          WHERE ar.published = 0 ${c ? "AND ar.country = ?" : ""}
          ORDER BY ar.id`,
        c ? [c] : [],
      );
      return { antal: rows.length, kladder: rows };
    },
  },
  {
    name: "get_draft",
    description:
      "Hent én kladde med ALT grundlaget: brødtekst, kildens manchet og sidetekst, " +
      "faktaarket, atletens data og den seneste gennemgangs fund. Læs den før du omskriver.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "number", description: "Kladdens id fra list_drafts" } },
      required: ["id"],
    },
    handler: async (a) => {
      const id = num(a.id);
      if (!id) throw new Error("id mangler");
      const draft = await one(
        `SELECT ar.id, ar.title, ar.slug, ar.content, ar.summary, ar.article_type,
                ar.published, ar.country, ar.source_url, ar.fabrication_risk, ar.fact_flags,
                ar.story_id, ar.athlete_id, ar.created_at, ar.updated_at
           FROM articles ar WHERE ar.id = ?`,
        [id],
      );
      if (!draft) throw new Error(`Ingen artikel med id ${id}`);

      const story = draft.story_id
        ? await one(
            `SELECT headline, summary, substr(content_raw, 1, 6000) AS content_raw,
                    fact_sheet, source_url
               FROM stories WHERE id = ?`,
            [draft.story_id],
          )
        : null;
      const athlete = draft.athlete_id
        ? await one(
            `SELECT name, sport, position, class_year, expected_graduation, university,
                    hometown, division, gender, home_country, bio_url
               FROM athletes WHERE id = ?`,
            [draft.athlete_id],
          )
        : null;

      return {
        kladde: draft,
        kilde: story,
        atlet_i_basen: athlete,
        seneste_gennemgang: await latestReview(id),
        note: draft.published
          ? "ADVARSEL: denne artikel er PUBLICERET. save_draft afviser den."
          : "Kladde (published = 0).",
      };
    },
  },
  {
    name: "save_draft",
    description:
      "Gem ny titel og/eller brødtekst på en KLADDE. Publicerer aldrig — kladden " +
      "bliver liggende til godkendelse. Afviser artikler der allerede er publiceret.",
    writes: true,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        title: { type: "string", description: "Ny titel. Udelades = uændret." },
        content: { type: "string", description: "Ny brødtekst i markdown. Udelades = uændret." },
        summary: { type: "string", description: "Ny manchet. Udelades = uændret." },
      },
      required: ["id"],
    },
    handler: async (a) => {
      const id = num(a.id);
      if (!id) throw new Error("id mangler");
      const row = await one(`SELECT id, published, title FROM articles WHERE id = ?`, [id]);
      if (!row) throw new Error(`Ingen artikel med id ${id}`);
      if (row.published) {
        throw new Error(
          `Artikel ${id} er publiceret. Rettelser i publiceret tekst tages i /admin, ` +
            `så en synlig rettelsesnote følger med.`,
        );
      }
      const fields: { title?: string; content?: string; summary?: string } = {};
      const t = str(a.title);
      const c = str(a.content);
      const s = str(a.summary);
      if (t) fields.title = t;
      if (c) fields.content = c;
      if (s) fields.summary = s;
      if (Object.keys(fields).length === 0) throw new Error("Intet at gemme — send title, content eller summary.");

      await updateArticle(id, fields);
      return {
        gemt: id,
        felter: Object.keys(fields),
        published: 0,
        note: "Kladden er IKKE publiceret. Kvalitetstjekket gennemgår den igen, fordi indholdet er ændret.",
      };
    },
  },
  {
    name: "publish_draft",
    description:
      "Publicér en kladde. Kræver confirm: true, og nægter hvis seneste gennemgang " +
      "endte på 'reject'. Brug den kun når Mikkel udtrykkeligt beder om det.",
    writes: true,
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number" },
        confirm: { type: "boolean", description: "Skal være true. Uden den sker der intet." },
      },
      required: ["id", "confirm"],
    },
    handler: async (a) => {
      const id = num(a.id);
      if (!id) throw new Error("id mangler");
      if (a.confirm !== true) {
        return { publiceret: false, grund: "confirm var ikke true — intet publiceret." };
      }
      const row = await one(`SELECT id, published, title FROM articles WHERE id = ?`, [id]);
      if (!row) throw new Error(`Ingen artikel med id ${id}`);
      if (row.published) return { publiceret: false, grund: "Artiklen var allerede publiceret." };

      const review = await latestReview(id);
      if (review?.verdict === "reject") {
        throw new Error(
          `Seneste gennemgang af ${id} endte på 'reject': ${review.summary ?? "(ingen opsummering)"}. ` +
            `Ret kladden med save_draft først.`,
        );
      }
      await publishArticle(id);
      return { publiceret: true, id, titel: row.title, seneste_verdict: review?.verdict ?? null };
    },
  },
  {
    name: "list_pages",
    description:
      "List sider i pages-tabellen: sportspillartekster (kind=sport), viden-guider (guide) " +
      "og faste sider (page), pr. land.",
    inputSchema: {
      type: "object",
      properties: {
        country: { type: "string", description: "DK eller UK. Udelades = begge." },
        kind: { type: "string", description: "sport, guide eller page. Udelades = alle." },
      },
    },
    handler: async (a) => {
      const c = country(a.country);
      const k = str(a.kind);
      const where: string[] = [];
      const params: unknown[] = [];
      if (c) { where.push("country = ?"); params.push(c); }
      if (k) { where.push("kind = ?"); params.push(k); }
      const rows = await all(
        `SELECT slug, country, kind, title, published, length(content) AS tegn, updated_at
           FROM pages ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY kind, slug`,
        params,
      );
      return { antal: rows.length, sider: rows };
    },
  },
  {
    name: "get_page",
    description: "Hent én sides fulde tekst (pillartekst, guide eller fast side).",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        country: { type: "string", description: "DK (standard) eller UK." },
      },
      required: ["slug"],
    },
    handler: async (a) => {
      const slug = str(a.slug);
      if (!slug) throw new Error("slug mangler");
      const c = country(a.country) ?? "DK";
      const page = await one(
        `SELECT slug, country, kind, title, content, meta_description, published, updated_at
           FROM pages WHERE slug = ? AND country = ?`,
        [slug, c],
      );
      if (!page) throw new Error(`Ingen side med slug '${slug}' i land ${c}`);
      return page;
    },
  },
  {
    name: "save_page",
    description:
      "Gem en sides tekst. NB: sport- og guide-sider har en kode-version i repoet; " +
      "en rettelse her overskrives, hvis seed-scriptet køres igen. Sig det til Mikkel.",
    writes: true,
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string" },
        country: { type: "string", description: "DK (standard) eller UK." },
        title: { type: "string" },
        content: { type: "string", description: "Hele sidens markdown." },
        meta_description: { type: "string" },
      },
      required: ["slug", "title", "content"],
    },
    handler: async (a) => {
      const slug = str(a.slug);
      const title = str(a.title);
      const content = str(a.content);
      if (!slug || !title || !content) throw new Error("slug, title og content skal alle med.");
      const c = country(a.country) ?? "DK";
      const before = await one(`SELECT kind, published FROM pages WHERE slug = ? AND country = ?`, [slug, c]);
      await upsertPage(slug, title, content, str(a.meta_description) ?? null, undefined, c);
      return {
        gemt: slug,
        land: c,
        kind: before?.kind ?? "page",
        advarsel:
          before?.kind === "sport" || before?.kind === "guide"
            ? "Denne side har en kode-version i src/lib/. Rettelsen her overlever ikke næste seed — kodefilen skal rettes tilsvarende."
            : null,
      };
    },
  },
  {
    name: "search_athletes",
    description: "Slå atleter op i registret på navn, sportsgren, universitet eller hjemland.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Del af navn, universitet eller hjemby." },
        sport: { type: "string", description: "Kanonisk sportsnøgle, fx soccer eller field-hockey." },
        country: { type: "string", description: "Atletens hjemland: DK eller UK." },
        limit: { type: "number", description: "Maks antal rækker (standard 25)." },
      },
    },
    handler: async (a) => {
      const where: string[] = [];
      const params: unknown[] = [];
      const q = str(a.query);
      if (q) {
        where.push("(name LIKE ? OR university LIKE ? OR hometown LIKE ?)");
        params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      }
      const s = str(a.sport);
      if (s) { where.push("sport = ?"); params.push(s); }
      const c = country(a.country);
      if (c) { where.push("home_country = ?"); params.push(c); }
      const limit = Math.min(num(a.limit) ?? 25, 100);
      const rows = await all(
        `SELECT id, name, slug, sport, position, class_year, university, hometown,
                home_country, active, bio_url
           FROM athletes ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
          ORDER BY name LIMIT ${limit}`,
        params,
      );
      return { antal: rows.length, atleter: rows };
    },
  },
  {
    name: "site_stats",
    description:
      "Overblik: atleter pr. sportsgren og land, antal kladder i køen, publicerede artikler pr. land.",
    inputSchema: { type: "object", properties: {} },
    handler: async () => ({
      atleter_pr_sport: await all(
        `SELECT sport, home_country, COUNT(*) n FROM athletes GROUP BY sport, home_country ORDER BY n DESC`,
      ),
      kladder: await all(
        `SELECT country, COUNT(*) n FROM articles WHERE published = 0 GROUP BY country`,
      ),
      publicerede_artikler: await all(
        `SELECT country, COUNT(*) n FROM articles WHERE published = 1 GROUP BY country`,
      ),
      sider: await all(`SELECT kind, country, COUNT(*) n FROM pages GROUP BY kind, country`),
    }),
  },
];

const BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

/**
 * Ét JSON-RPC-kald. Returnerer null for notifikationer (ingen id) — de skal
 * ikke besvares, og et svar på en notifikation får nogle klienter til at fejle.
 */
export async function handleMcpRequest(req: JsonRpcRequest): Promise<Record<string, unknown> | null> {
  const { id, method, params } = req;
  const isNotification = id === undefined || id === null;

  const ok = (result: unknown) => (isNotification ? null : { jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) =>
    isNotification ? null : { jsonrpc: "2.0", id, error: { code, message } };

  switch (method) {
    case "initialize": {
      const asked = str((params as Record<string, unknown> | undefined)?.protocolVersion);
      return ok({
        // Klientens version spejles tilbage, når den sender en — så følger vi
        // med, uden at serveren skal opdateres hver gang specen rykker.
        protocolVersion: asked ?? DEFAULT_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
      });
    }
    case "notifications/initialized":
    case "notifications/cancelled":
      return null;
    case "ping":
      return ok({});
    case "tools/list":
      return ok({
        tools: TOOLS.map((t) => ({
          name: t.name,
          description: t.writes ? `${t.description} (SKRIVER i databasen)` : t.description,
          inputSchema: t.inputSchema,
        })),
      });
    case "tools/call": {
      const name = str((params as Record<string, unknown> | undefined)?.name);
      const args = ((params as Record<string, unknown> | undefined)?.arguments ?? {}) as Record<string, unknown>;
      const tool = name ? BY_NAME.get(name) : undefined;
      if (!tool) return fail(-32602, `Ukendt værktøj: ${name ?? "(intet navn)"}`);
      try {
        const result = await tool.handler(args);
        return ok({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
      } catch (err) {
        // Værktøjsfejl hører til i resultatet med isError, ikke som JSON-RPC-fejl:
        // modellen skal kunne læse hvad der gik galt og prøve igen.
        const message = err instanceof Error ? err.message : String(err);
        return ok({ content: [{ type: "text", text: `Fejl: ${message}` }], isError: true });
      }
    }
    default:
      return fail(-32601, `Ukendt metode: ${method ?? "(ingen)"}`);
  }
}
