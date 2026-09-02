/**
 * MCP-endepunkt MED token i stien: https://studentathlete.dk/api/mcp/<token>
 *
 * Faldback for de Claude Desktop-builds, hvor connector-dialogen kun tager en
 * URL. Så ER URL'en adgangskoden — behandl den som en. Kan dialogen sende en
 * header, så brug `/api/mcp` med `Authorization: Bearer <token>` i stedet;
 * det er den samme server og de samme værktøjer, men tokenet holder sig ude af
 * URL'er, logs og browserhistorik.
 *
 * Sæt hemmeligheden med:  wrangler secret put MCP_TOKEN
 */
import { NextRequest } from "next/server";
import { mcpGet, mcpPost, noStore } from "@/lib/mcp-http";

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return noStore(await mcpPost(req, token));
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return noStore(await mcpGet(req, token));
}
