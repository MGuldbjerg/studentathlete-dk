/**
 * MCP-endepunkt til Claude Desktop (Streamable HTTP).
 *
 * URL: https://studentathlete.dk/api/mcp/<token>
 *
 * **Hvorfor token i stien og ikke i en header?** Desktops "custom connector"
 * beder om én ting: en URL. OAuth-felterne findes, men kræver en OAuth-server
 * vi ikke har, og header-feltet er stadig på vej ud til alle. Stien er det ene
 * sted, vi med sikkerhed kan lægge en hemmelighed, som Desktop sender med hver
 * gang. Konsekvensen skal siges højt: **hvem som helst med URL'en har adgang.**
 * Behandl den som en adgangskode — den giver skriveadgang til kladder og sider.
 *
 * Sæt hemmeligheden med:
 *     wrangler secret put MCP_TOKEN
 *
 * Roter ved at sætte en ny og opdatere connectorens URL i Desktop. Uden
 * MCP_TOKEN sat svarer endepunktet 503 — så en glemt secret lukker døren i
 * stedet for at åbne den.
 */
import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/db";
import { handleMcpRequest, MCP_SERVER_NAME, MCP_SERVER_VERSION } from "@/lib/mcp-server";

/** Konstant-tids-sammenligning: en almindelig === lækker længde og præfiks. */
function tokenMatches(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

async function authorize(token: string): Promise<NextResponse | null> {
  const expected = (await getEnv()).MCP_TOKEN as string | undefined;
  if (!expected) {
    return NextResponse.json(
      { error: "MCP er ikke slået til: MCP_TOKEN mangler på workeren." },
      { status: 503 },
    );
  }
  if (!token || !tokenMatches(token, expected)) {
    return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
  }
  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const denied = await authorize(token);
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
    return answers.length ? NextResponse.json(answers) : new NextResponse(null, { status: 202 });
  }

  const answer = await handleMcpRequest(body as Record<string, unknown>);
  // Notifikationer har intet svar — 202 uden krop er det protokollen forventer.
  return answer ? NextResponse.json(answer) : new NextResponse(null, { status: 202 });
}

/**
 * GET bruges af klienter til at åbne en SSE-strøm. Vi har ingen server-initieret
 * besked at sende, så vi svarer 405 (det accepterer klienterne) — men kun når
 * token passer, så endepunktet ikke kan afsløres ved at prøve sig frem.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const denied = await authorize(token);
  if (denied) return denied;
  return NextResponse.json(
    { server: MCP_SERVER_NAME, version: MCP_SERVER_VERSION, transport: "streamable-http", note: "Brug POST." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
