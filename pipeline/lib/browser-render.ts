/**
 * Cloudflare Browser Rendering — /content endpoint.
 * Renderer JS-tunge sider (Sidearm SPA-rosters m.fl.) til fuld HTML, så de
 * eksisterende Cheerio-parsere kan læse dem.
 *
 * Bruges KUN som fallback når plain fetch + Cheerio ikke finder data — render=true
 * koster browser-tid (gratis plan: ~10 min/dag). Kaldere bør respektere
 * BrowserRenderError.quotaExhausted og stoppe render resten af kørslen.
 *
 * Docs: https://developers.cloudflare.com/browser-rendering/rest-api/content-endpoint/
 */

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export class BrowserRenderError extends Error {
  constructor(
    public status: number,
    message: string,
    public quotaExhausted = false,
  ) {
    super(message);
    this.name = "BrowserRenderError";
  }
}

export interface RenderOptions {
  /** Vent til dette CSS-selektor findes (godt til SPA-rosters, fx ".sidearm-roster") */
  waitForSelector?: string;
  /** networkidle2 = vent til ≤2 forbindelser (default). networkidle0 fungerer IKKE på
   *  college-sport-SPA'er: tracking-/annonce-pixels (statcollector, id5-sync, rlcdn)
   *  holder forbindelser åbne, så netværket bliver aldrig helt roligt → timeout. */
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  /** Navigationstimeout i ms (default 45000). */
  timeoutMs?: number;
  /** Antal gentagne forsøg ved HTTP 429 (per-minut rate limit). Default 3. */
  retries?: number;
  /** Ventetid mellem 429-forsøg i ms. Default 20000. */
  backoffMs?: number;
}

export function isBrowserRenderAvailable(): boolean {
  return Boolean(ACCOUNT_ID && API_TOKEN);
}

/**
 * Renderer en side og returnerer fuld HTML, eller null ved netværks-/timeout-fejl.
 * Ved HTTP 429 (per-minut rate limit på gratis-tier — genoprettes på sekunder) venter
 * den `backoffMs` og prøver igen op til `retries` gange. Kaster BrowserRenderError med
 * quotaExhausted=true ved auth/permission (kode 10000 / 401 / 403) eller hvis 429 fortsætter
 * efter alle forsøg — så kaldere kan stoppe render for resten af kørslen.
 */
export async function renderPage(
  url: string,
  opts: RenderOptions = {},
): Promise<string | null> {
  if (!isBrowserRenderAvailable()) return null;

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/content`;
  const timeoutMs = opts.timeoutMs ?? 45000;
  const maxRetries = opts.retries ?? 3;
  const backoffMs = opts.backoffMs ?? 20000;

  const body: Record<string, unknown> = {
    url,
    // networkidle2 (ikke networkidle0): tracking-/annonce-pixels på Sidearm-sider
    // holder forbindelser åbne, så networkidle0 timeouter i stedet for at returnere.
    gotoOptions: { waitUntil: opts.waitUntil ?? "networkidle2", timeout: timeoutMs },
    // Spar browser-tid: skip billeder/fonts/css/media — vi skal kun bruge DOM-teksten.
    rejectResourceTypes: ["image", "font", "media", "stylesheet"],
  };
  if (opts.waitForSelector) body.waitForSelector = opts.waitForSelector;

  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs + 15000),
      });
    } catch {
      return null; // netværk/timeout — behandl som "kunne ikke rendere denne URL"
    }

    if (res.ok) {
      // /content returnerer enten rå HTML eller en CF-API-konvolut {success,result,errors}.
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const json = (await res.json()) as {
          success?: boolean;
          result?: string;
          errors?: Array<{ code?: number; message?: string }>;
        };
        if (json.success && typeof json.result === "string") return json.result;
        // CF kan returnere 200 med {success:false, errors:[{code:10000,"Authentication error"}]}.
        const errs = Array.isArray(json.errors) ? json.errors : [];
        const code = errs[0]?.code;
        const msg = errs.map((e) => e?.message).filter(Boolean).join("; ");
        const authOrQuota =
          code === 10000 || /authenticat|permission|quota|rate limit/i.test(msg);
        throw new BrowserRenderError(
          res.status,
          msg || JSON.stringify(json.errors ?? json).slice(0, 300),
          authOrQuota,
        );
      }
      return await res.text();
    }

    // !res.ok — 429 = per-minut rate limit: vent og prøv igen.
    const text = await res.text().catch(() => "");
    if (res.status === 429 && attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, backoffMs));
      continue;
    }
    // 401/403/auth = token-/permission-problem (genoprettes ikke); vedvarende 429 = opbrugt.
    const quotaExhausted =
      res.status === 401 ||
      res.status === 403 ||
      res.status === 429 ||
      /authenticat|permission|quota|rate limit|10000/i.test(text);
    throw new BrowserRenderError(res.status, text.slice(0, 300), quotaExhausted);
  }
}
