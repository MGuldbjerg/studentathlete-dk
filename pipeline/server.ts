/**
 * Lokal pipeline-server.
 * Kører pipeline-scripts via HTTP — bruges af admin-panelets knapper.
 * Start med: npx tsx pipeline/server.ts (eller start-pipeline.bat)
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

const PORT = 3099;
const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const MAX_LOG_LINES = 200;

interface StepConfig {
  label: string;
  script: string;
}

const STEPS: Record<string, StepConfig> = {
  discover: {
    label: "Find nye historier",
    script: "pipeline/discover/check-sources.ts",
  },
  "discover-feeds": {
    label: "Opdag nyhedsfeeds",
    script: "pipeline/discover/discover-feeds.ts",
  },
  backfill: {
    label: "Hent manglende story-indhold",
    script: "pipeline/discover/backfill-content.ts",
  },
  generate: {
    label: "Generér artikler",
    script: "pipeline/generate/generate-articles.ts",
  },
  scrape: {
    label: "Scrap rosters",
    script: "pipeline/scrape/scrape-rosters.ts",
  },
  report: {
    label: "Dækningsrapport",
    script: "pipeline/report/coverage-report.ts",
  },
};

// Simpel lås — kun én kørsel ad gangen
let running: { step: string; startedAt: Date } | null = null;
let logLines: string[] = [];

function corsHeaders(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res: ServerResponse, status: number, data: unknown) {
  corsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function handleStatus(_req: IncomingMessage, res: ServerResponse) {
  json(res, 200, {
    running: running ? { step: running.step, startedAt: running.startedAt } : null,
    steps: Object.entries(STEPS).map(([id, cfg]) => ({ id, label: cfg.label })),
  });
}

function handleRun(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const step = url.pathname.replace("/run/", "");

  const config = STEPS[step];
  if (!config) {
    json(res, 400, { error: `Ukendt trin: ${step}. Tilgængelige: ${Object.keys(STEPS).join(", ")}` });
    return;
  }

  if (running) {
    json(res, 409, { error: `"${STEPS[running.step].label}" kører allerede (startet ${running.startedAt.toLocaleTimeString("da-DK")})` });
    return;
  }

  running = { step, startedAt: new Date() };
  logLines = [];
  console.log(`▶ Starter: ${config.label}`);

  const child = spawn("npx", ["tsx", config.script], {
    cwd: PROJECT_ROOT,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  function appendLog(text: string) {
    const newLines = text.split("\n").filter((l) => l.trim() !== "");
    logLines.push(...newLines);
    if (logLines.length > MAX_LOG_LINES) {
      logLines = logLines.slice(-MAX_LOG_LINES);
    }
  }

  child.stdout.on("data", (data: Buffer) => {
    const text = data.toString();
    appendLog(text);
    process.stdout.write(text);
  });

  child.stderr.on("data", (data: Buffer) => {
    const text = data.toString();
    appendLog(text);
    process.stderr.write(text);
  });

  child.on("close", (code) => {
    const duration = Math.round((Date.now() - running!.startedAt.getTime()) / 1000);
    running = null;
    console.log(`✓ ${config.label} afsluttet (${duration}s, kode ${code})`);
  });

  // Returner straks — klienten poller /status
  json(res, 202, { message: `${config.label} startet`, step });
}

function handleResult(_req: IncomingMessage, res: ServerResponse) {
  json(res, 200, {
    running: running ? { step: running.step, label: STEPS[running.step].label, startedAt: running.startedAt } : null,
  });
}

function handleLogs(_req: IncomingMessage, res: ServerResponse) {
  const elapsedSeconds = running
    ? Math.round((Date.now() - running.startedAt.getTime()) / 1000)
    : null;
  json(res, 200, {
    lines: logLines,
    elapsedSeconds,
    running: running !== null,
  });
}

const server = createServer((req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    corsHeaders(res);
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url ?? "/";

  if (url === "/status" && req.method === "GET") {
    handleStatus(req, res);
  } else if (url.startsWith("/run/") && req.method === "POST") {
    handleRun(req, res);
  } else if (url === "/poll" && req.method === "GET") {
    handleResult(req, res);
  } else if (url === "/logs" && req.method === "GET") {
    handleLogs(req, res);
  } else {
    json(res, 404, { error: "Ikke fundet" });
  }
});

server.listen(PORT, () => {
  console.log(`\n  Pipeline-server kører på http://localhost:${PORT}`);
  console.log(`  Tilgængelige trin:`);
  for (const [id, cfg] of Object.entries(STEPS)) {
    console.log(`    POST /run/${id}  — ${cfg.label}`);
  }
  console.log(`    GET  /status     — Vis status`);
  console.log(`    GET  /poll       — Polling (kører noget?)`);
  console.log(`    GET  /logs       — Sidste output-linjer\n`);
});
