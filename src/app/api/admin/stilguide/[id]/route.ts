import { NextRequest, NextResponse } from "next/server";
import { deleteStyleCorrection, decideStyleSuggestion } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

/** Godkend/afvis et pipeline-mined stilforslag (mine-edits.ts). */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Ugyldigt ID" }, { status: 400 });
    }

    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { action } = body as { action: "approve" | "reject" };
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
    }

    const ok = await decideStyleSuggestion(id, action);
    if (!ok) {
      return NextResponse.json({ error: "Forslag ikke fundet eller allerede afgjort" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Ugyldigt ID" }, { status: 400 });
    }

    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }

    await deleteStyleCorrection(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
