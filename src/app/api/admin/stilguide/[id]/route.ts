import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, deleteStyleCorrection, decideStyleSuggestion } from "@/lib/admin";

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

    const body = await req.json();
    const { token, action } = body as { token: string; action: "approve" | "reject" };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }
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

    const body = await req.json();
    const { token } = body as { token: string };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

    await deleteStyleCorrection(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
