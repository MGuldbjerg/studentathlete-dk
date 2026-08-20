/**
 * MCP-endepunkt UDEN token i stien: https://studentathlete.dk/api/mcp
 *
 * Brug denne, når Claude Desktops connector-dialog har et felt til API-nøgle
 * eller headers — så rejser tokenet i `Authorization: Bearer <token>` og ryger
 * aldrig i en URL. Har dialogen kun et URL-felt, bruges `/api/mcp/<token>`
 * i stedet (samme server, samme værktøjer).
 */
import { NextRequest } from "next/server";
import { mcpGet, mcpPost } from "@/lib/mcp-http";

export async function POST(req: NextRequest) {
  return mcpPost(req);
}

export async function GET(req: NextRequest) {
  return mcpGet(req);
}
