import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken } from "@/lib/admin";
import { getEnv } from "@/lib/db";

const REPO = "MGuldbjerg/studentathlete-dk";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const workflowFile = searchParams.get("workflow");
  const after = searchParams.get("after"); // ISO timestamp

  const valid = await validateAdminToken(token ?? null);
  if (!valid) {
    return NextResponse.json({ error: "Ugyldigt token" }, { status: 401 });
  }

  if (!workflowFile) {
    return NextResponse.json({ error: "Mangler workflow-parameter" }, { status: 400 });
  }

  const env = await getEnv();
  const ghToken = (env as Record<string, string>).GITHUB_TOKEN;
  if (!ghToken) {
    return NextResponse.json({ error: "GITHUB_TOKEN ikke konfigureret" }, { status: 500 });
  }

  const url = new URL(
    `https://api.github.com/repos/${REPO}/actions/workflows/${workflowFile}/runs`,
  );
  url.searchParams.set("event", "workflow_dispatch");
  url.searchParams.set("per_page", "5");

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "studentathlete-dk",
    },
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `GitHub API fejl (${res.status})` },
      { status: 502 },
    );
  }

  const data = await res.json() as { workflow_runs: GhRun[] };
  const runs: GhRun[] = data.workflow_runs ?? [];

  // Find den kørsel der blev trigget efter `after`-tidsstemplet.
  // Trækker 30s fra for at absorbere clockskew og netværkslatens:
  // GitHub stemplede run.created_at ~200ms FØR vores triggeredAt blev sat.
  const afterDate = after ? new Date(new Date(after).getTime() - 30_000) : null;
  const run = afterDate
    ? runs.find((r) => new Date(r.created_at) >= afterDate)
    : runs[0];

  if (!run) {
    // Endnu ikke oprettet — GitHub er lidt bagud
    return NextResponse.json({ phase: "queued", runId: null });
  }

  const phase: "queued" | "running" | "done" =
    run.status === "completed" ? "done"
    : run.status === "in_progress" ? "running"
    : "queued";

  return NextResponse.json({
    phase,
    runId: run.id,
    status: run.status,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    htmlUrl: run.html_url,
  });
}

interface GhRun {
  id: number;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}
