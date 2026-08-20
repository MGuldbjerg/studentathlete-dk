/**
 * MCP-serverens protokol og spærrer.
 *
 * Testen kører uden D1 (getDB returnerer null udenfor Workers), så den prøver
 * netop det, der ikke må afhænge af databasen: protokollens form, og de to
 * spærrer der holder "ingen automatisk publicering" oppe.
 */
import { handleMcpRequest } from "./mcp-server";

let passed = 0;
let failed = 0;

function ok(cond: boolean, name: string): void {
  if (cond) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${name}`);
  }
}

function text(res: Record<string, unknown> | null): string {
  const result = (res?.result ?? {}) as { content?: Array<{ text?: string }> };
  return result.content?.[0]?.text ?? "";
}

const run = async () => {
  // ── Protokollen ───────────────────────────────────────────────────────────
  const init = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: { protocolVersion: "2099-01-01" },
  });
  const initResult = (init?.result ?? {}) as Record<string, unknown>;
  ok(initResult.protocolVersion === "2099-01-01", "initialize spejler klientens protokolversion");
  ok(typeof initResult.serverInfo === "object", "initialize oplyser serverInfo");

  const initNoVersion = await handleMcpRequest({ jsonrpc: "2.0", id: 2, method: "initialize" });
  ok(
    typeof ((initNoVersion?.result ?? {}) as Record<string, unknown>).protocolVersion === "string",
    "initialize uden version falder tilbage på vores egen",
  );

  ok(
    (await handleMcpRequest({ jsonrpc: "2.0", method: "notifications/initialized" })) === null,
    "notifikationer besvares ikke",
  );

  const list = await handleMcpRequest({ jsonrpc: "2.0", id: 3, method: "tools/list" });
  const tools = ((list?.result ?? {}) as { tools?: Array<{ name: string; description: string }> }).tools ?? [];
  const names = tools.map((t) => t.name);
  for (const expected of [
    "list_drafts",
    "get_draft",
    "save_draft",
    "publish_draft",
    "list_pages",
    "get_page",
    "save_page",
    "search_athletes",
    "site_stats",
  ]) {
    ok(names.includes(expected), `tools/list indeholder ${expected}`);
  }
  ok(
    tools.every((t) => t.description.length > 20),
    "hvert værktøj har en beskrivelse der siger hvornår det bruges",
  );
  ok(
    tools.find((t) => t.name === "save_draft")?.description.includes("SKRIVER") === true,
    "skrivende værktøjer er mærket som skrivende",
  );

  const unknownMethod = await handleMcpRequest({ jsonrpc: "2.0", id: 4, method: "findes/ikke" });
  ok(
    ((unknownMethod?.error ?? {}) as { code?: number }).code === -32601,
    "ukendt metode giver -32601",
  );

  const unknownTool = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: { name: "drop_database", arguments: {} },
  });
  ok(((unknownTool?.error ?? {}) as { code?: number }).code === -32602, "ukendt værktøj afvises");

  // ── Spærrerne ─────────────────────────────────────────────────────────────
  const noConfirm = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: { name: "publish_draft", arguments: { id: 1, confirm: false } },
  });
  ok(text(noConfirm).includes('"publiceret": false'), "publish_draft uden confirm publicerer ikke");

  const nothingToSave = await handleMcpRequest({
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: { name: "save_draft", arguments: { id: 1 } },
  });
  const saveResult = (nothingToSave?.result ?? {}) as { isError?: boolean };
  ok(saveResult.isError === true, "save_draft uden felter er en værktøjsfejl");
  ok(
    text(nothingToSave).startsWith("Fejl:"),
    "værktøjsfejl kommer tilbage som læsbar tekst, ikke som JSON-RPC-fejl",
  );

  console.log(`\nmcp-server: ${passed} bestået, ${failed} fejlet.`);
  if (failed > 0) process.exit(1);
};

run();
