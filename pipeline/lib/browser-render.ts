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
  /** networkidle0 = vent til netværket er roligt (default). */
  waitUntil?: "load" | "domcontentloaded" | "networkidle0" | "networkidle2";
  /** Navigationstimeout i ms (default 30000). */
  timeoutMs?: number;
}

export function isBrowserRenderAvailable(): boolean {
  return Boolean(ACCOUNT_ID && API_TOKEN);
}

/**
 * Renderer en side og returnerer fuld HTML, eller null ved netværks-/timeout-fejl.
 * Kaster BrowserRenderError ved 429 (daglig browser-tid opbrugt) så kaldere kan
 * stoppe med at bruge render resten af kørslen.
 */
export async function renderPage(
  url: string,
  opts: RenderOptions = {},
): Promise<string | null> {
  if (!isBrowserRenderAvailable()) return null;

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/browser-rendering/content`;
  const timeoutMs = opts.timeoutMs ?? 30000;

  const body: Record<string, unknown> = {
    url,
    gotoOptions: { waitUntil: opts.waitUntil ?? "networkidle0", timeout: timeoutMs },
    // Spar browser-tid: skip billeder/fonts/css/media — vi skal kun bruge DOM-teksten.
    rejectResourceTypes: ["image", "font", "media", "stylesheet"],
  };
  if (opts.waitForSelector) body.waitForSelector = opts.waitForSelector;

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

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // 401/403/429 eller auth/quota i body = kørsels-globalt problem (token-permission,
    // daglig browser-tid). Signalér "stop med at rende resten af kørslen".
    const quotaExhausted =
      res.status === 401 ||
      res.status === 403 ||
      res.status === 429 ||
      /authenticat|permission|quota|rate limit|10000/i.test(text);
    throw new BrowserRenderError(res.status, text.slice(0, 300), quotaExhausted);
  }

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
    // code 10000 = auth/permission (token mangler Browser Rendering). Kørsels-global → stop.
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
