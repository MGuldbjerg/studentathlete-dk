import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken } from "@/lib/admin";
import { getEnv } from "@/lib/db";

const REPO = "MGuldbjerg/studentathlete-dk";

const WORKFLOWS: Record<string, { file: string; label: string }> = {
  discover: { file: "discover-daily.yml", label: "Find nye historier" },
  backfill: { file: "backfill-content.yml", label: "Hent manglende indhold" },
  generate: { file: "generate-manual.yml", label: "Generér artikler" },
  scrape: { file: "weekly-scrape.yml", label: "Scrap rosters" },
  "scrape-js": { file: "daily-js-scrape.yml", label: "Scrap JS-rosters" },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, step } = body as { token: string; step: string };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 401 });
    }

    const workflow = WORKFLOWS[step];
    if (!workflow) {
      return NextResponse.json(
        { error: `Ukendt trin: ${step}. Tilgængelige: ${Object.keys(WORKFLOWS).join(", ")}` },
        { status: 400 },
      );
    }

    const env = await getEnv();
    const ghToken = (env as Record<string, string>).GITHUB_TOKEN;
    if (!ghToken) {
      return NextResponse.json(
        { error: "GITHUB_TOKEN ikke konfigureret — tilføj den i wrangler.toml [vars]" },
        { status: 500 },
      );
    }

    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${workflow.file}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ghToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "studentathlete-dk",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );

    if (res.status === 204) {
      return NextResponse.json({
        message: `${workflow.label} startet via GitHub Actions`,
        workflowFile: workflow.file,
        triggeredAt: new Date().toISOString(),
      });
    }

    const text = await res.text();
    return NextResponse.json(
      { error: `GitHub API fejl (${res.status}): ${text}` },
      { status: 502 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
