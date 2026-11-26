import { NextRequest, NextResponse } from "next/server";
import { createIssue, validateIssue } from "@/lib/admin-issues";
import { isAdmin } from "@/lib/admin-auth";

/** New hand-kept issue for admin → Åbne sager. */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const v = validateIssue((await req.json()) as Record<string, unknown>);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    const issue = await createIssue(v.value);
    if (!issue) return NextResponse.json({ error: "Kunne ikke gemme" }, { status: 500 });
    return NextResponse.json({ issue });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
