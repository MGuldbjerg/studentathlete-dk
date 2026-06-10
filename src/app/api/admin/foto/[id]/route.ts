import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, decidePhotoSuggestion } from "@/lib/admin";

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

    const body = await req.json();
    const { token, action, credit } = body as {
      token: string;
      action: "approve" | "reject";
      credit?: string;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
    }

    const ok = await decidePhotoSuggestion(id, action, credit);
    if (!ok) {
      return NextResponse.json({ error: "Forslag ikke fundet eller allerede afgjort" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
