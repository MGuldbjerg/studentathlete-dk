import { NextRequest, NextResponse } from "next/server";
import { decideMergeCandidate } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Ugyldigt id" }, { status: 400 });
    }

    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }

    const body = await req.json();
    const { action, swap } = body as { action: "merge" | "reject"; swap?: boolean };
    if (action !== "merge" && action !== "reject") {
      return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
    }

    const res = await decideMergeCandidate(id, action, swap === true);
    if (!res.ok) {
      return NextResponse.json({ error: res.error ?? "Kunne ikke afgøres" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
