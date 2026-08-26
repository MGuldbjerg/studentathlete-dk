/**
 * Cloudflare D1 REST API client.
 * Bruges af pipeline-scripts der kører udenfor Workers (GitHub Actions, lokalt).
 * Inde i Workers bruges getCloudflareContext() i stedet (se src/lib/db.ts).
 */

interface D1Response<T = Record<string, unknown>> {
  result: Array<{
    results: T[];
    meta: { changes: number; duration: number };
  }>;
  success: boolean;
  errors: Array<{ code: number; message: string }>;
}

export interface D1QueryResult<T = Record<string, unknown>> {
  results: T[];
  meta: { changes: number; duration: number };
}

/** Fejl fra selve HTTP-laget bærer statuskoden med sig, så den kan vurderes. */
interface D1HttpError extends Error {
  status?: number;
}

/**
 * Er fejlen forbigående — altså værd at prøve igen?
 *
 * Projektets egen regel for roster-scraping (se CLAUDE.md, «Fejl er ikke ét
 * begreb») har altid sagt: 429/5xx/timeout er forbigående og SKAL prøves igen.
 * D1-klienten fulgte ikke reglen. Den prøvede kun igen ved fejl på
 * TRANSPORT-laget (ECONNRESET o.l.), mens et HTTP-svar på 502 fra Cloudflares
 * kant blev kastet videre med det samme, uden ét eneste forsøg.
 *
 * Det væltede foto-kørslen 2026-08-26 kl. 18:33 UTC: tolv minutter inde, midt
 * i et opslag, kom der ét `502 Bad Gateway`, og hele kørslen døde. Et enkelt
 * blip på Cloudflares side er ikke en programmeringsfejl og skal ikke koste
 * en kørsel — slet ikke en der behandler hundredvis af atleter i træk.
 *
 * 4xx (bortset fra 429) prøves IKKE igen: en forkert nøgle eller en ugyldig
 * SQL bliver ikke rigtig af at blive sendt tre gange.
 */
export function isTransient(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (!(err instanceof Error)) return false;

  const status = (err as D1HttpError).status;
  if (typeof status === "number") {
    return status === 429 || status >= 500;
  }

  return /ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|fetch failed|network/i.test(
    err.message,
  );
}

export class D1Client {
  private baseUrl: string;

  constructor(
    private accountId: string,
    private databaseId: string,
    private apiToken: string,
  ) {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
  }

  async query<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<D1QueryResult<T>> {
    return this.queryWithRetry<T>(sql, params);
  }

  private async queryWithRetry<T = Record<string, unknown>>(
    sql: string,
    params: unknown[],
    maxRetries = 3,
  ): Promise<D1QueryResult<T>> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/query`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql, params }),
        });

        if (!response.ok) {
          const text = await response.text();
          const err = new Error(`D1 API fejl (${response.status}): ${text}`);
          (err as D1HttpError).status = response.status;
          throw err;
        }

        const data = (await response.json()) as D1Response<T>;

        if (!data.success) {
          throw new Error(`D1 query fejl: ${data.errors.map((e) => e.message).join(", ")}`);
        }

        return data.result[0];
      } catch (err) {
        if (isTransient(err) && attempt < maxRetries - 1) {
          const delay = 1000 * 2 ** attempt;
          console.warn(
            `  D1 forbigående fejl (forsøg ${attempt + 1}/${maxRetries}), prøver igen om ${delay}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    // Burde aldrig nås — TypeScript kræver return
    throw new Error("queryWithRetry: uventet tilstand");
  }

  /**
   * Kør en skrive-query. Returnerer resultatet inkl. `meta.changes` (antal rækker
   * faktisk ændret) — vigtigt for `INSERT OR IGNORE`/`UPDATE`, der IKKE kaster ved
   * no-op: changes === 0 betyder "ingen ny/ændret række". Returtypen er udvidet fra
   * void → kaldere der ignorerer den er upåvirkede.
   */
  async execute<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<D1QueryResult<T>> {
    return this.query<T>(sql, params);
  }

  async batch(
    statements: Array<{ sql: string; params?: unknown[] }>,
  ): Promise<void> {
    // D1 REST API understøtter ikke batch direkte — kør sekventielt
    for (const stmt of statements) {
      await this.execute(stmt.sql, stmt.params ?? []);
    }
  }
}

/**
 * Opret D1Client fra miljøvariabler.
 * Kræver: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID
 */
export function createD1Client(): D1Client {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

  if (!token) throw new Error("Mangler CLOUDFLARE_API_TOKEN");
  if (!accountId) throw new Error("Mangler CLOUDFLARE_ACCOUNT_ID");
  if (!databaseId) throw new Error("Mangler CLOUDFLARE_D1_DATABASE_ID");

  return new D1Client(accountId, databaseId, token);
}
