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
          throw new Error(`D1 API fejl (${response.status}): ${text}`);
        }

        const data = (await response.json()) as D1Response<T>;

        if (!data.success) {
          throw new Error(`D1 query fejl: ${data.errors.map((e) => e.message).join(", ")}`);
        }

        return data.result[0];
      } catch (err) {
        const isNetworkError =
          err instanceof TypeError ||
          (err instanceof Error &&
            /ECONNRESET|ETIMEDOUT|fetch failed|network/i.test(err.message));

        if (isNetworkError && attempt < maxRetries - 1) {
          const delay = 1000 * 2 ** attempt;
          console.warn(
            `  D1 netværksfejl (forsøg ${attempt + 1}/${maxRetries}), prøver igen om ${delay}ms...`,
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

  async execute(sql: string, params: unknown[] = []): Promise<void> {
    await this.query(sql, params);
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
