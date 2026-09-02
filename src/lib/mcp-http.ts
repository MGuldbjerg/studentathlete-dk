/**
 * Transport, autentifikation og svar-form for MCP-endepunktet.
 *
 * Tokenet kan komme tre veje ind, fordi Claude Desktops connector-dialog ikke
 * ser ens ud i alle versioner:
 *
 *   1. `Authorization: Bearer <token>`  ← brug denne, hvis dialogen har et felt
 *      til API-nøgle/headers. Tokenet ryger så aldrig i en URL, en log eller en
 *      browserhistorik.
 *   2. `X-MCP-Token: <token>`           ← samme fordel, hvis Bearer-formen er
 *      optaget af noget andet.
 *   3. `/api/mcp/<token>`               ← faldback for de builds, hvor dialogen
 *      KUN tager en URL. Så er URL'en adgangskoden.
 *
 * Alle tre sammenlignes i konstant tid mod `MCP_TOKEN` på workeren. Uden den
 * secret svarer endepunktet 503 — en glemt opsætning lukker døren i stedet for
 * at åbne den.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "./db";
import { handleMcpRequest, MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./mcp-server";

/** Konstant-tids-sammenligning: en almindelig === lækker længde og præfiks. */
function tokenMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function tokenFromHeaders(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth) {
    const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
    if (m) return m[1].trim();
  }
  return req.headers.get("x-mcp-token")?.trim() || null;
}

/** null = adgang i orden. Ellers svaret der skal sendes tilbage. */
async function authorize(req: NextRequest, pathToken?: string): Promise<NextResponse | null> {
  const expected = (await getEnv()).MCP_TOKEN as string | undefined;
  if (!expected) {
    return NextResponse.json(
      { error: "MCP er ikke slået til: MCP_TOKEN mangler på workeren." },
      { status: 503 },
    );
  }
  const given = tokenFromHeaders(req) ?? pathToken ?? "";
  if (!given || !tokenMatches(given, expected)) {
    // 401 med WWW-Authenticate, så en klient der KAN sende en header, forstår
    // hvad der mangler i stedet for at gætte på en forkert URL.
    return NextResponse.json(
      { error: "Ugyldigt eller manglende token" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="studentathlete-mcp"' } },
    );
  }
  return null;
}

export async function mcpPost(req: NextRequest, pathToken?: string): Promise<NextResponse> {
  const denied = await authorize(req, pathToken);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Ugyldig JSON" } },
      { status: 400 },
    );
  }

  // Batch: en liste af kald besvares med en liste af svar, uden notifikationerne.
  if (Array.isArray(body)) {
    const answers = (await Promise.all(body.map((b) => handleMcpRequest(b)))).filter(Boolean);
    return answers.length
      ? NextResponse.json(answers)
      : (new NextResponse(null, { status: 202 }) as NextResponse);
  }

  const answer = await handleMcpRequest(body as Record<string, unknown>);
  // Notifikationer har intet svar — 202 uden krop er det protokollen forventer.
  return answer
    ? NextResponse.json(answer)
    : (new NextResponse(null, { status: 202 }) as NextResponse);
}

/**
 * GET bruges af klienter til at åbne en SSE-strøm. Vi har ingen server-initieret
 * besked at sende, så vi svarer 405 — men først efter token-tjekket, så
 * endepunktet ikke kan kortlægges af nogen uden adgang.
 */
export async function mcpGet(req: NextRequest, pathToken?: string): Promise<NextResponse> {
  const denied = await authorize(req, pathToken);
  if (denied) return denied;
  return NextResponse.json(
    {
      server: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
      transport: "streamable-http",
      note: "Brug POST.",
    },
    { status: 405, headers: { Allow: "POST" } },
  );
}

/**
 * Workers Cache cacher ethvert GET-svar uden `Cache-Control` i to timer, og
 * `/api/`-stierne rammes ikke af middlewarens standard. Et MCP-svar må ALDRIG
 * caches: stien kan bære tokenet (`/api/mcp/<token>`), og svaret hører til det
 * enkelte kald. Begge ruter sender deres svar gennem denne.
 */
export function noStore(res: Response): Response {
  const out = new Response(res.body, res);
  out.headers.set("Cache-Control", "no-store");
  return out;
}
