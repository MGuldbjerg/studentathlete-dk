import { NextRequest, NextResponse } from "next/server";
import { decideInstagramCandidate } from "@/lib/admin";
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
    const { action, handle, confidence } = body as {
      action: "followed" | "rejected" | "undo";
      // Only for undoing a rejection: by then the row has lost the handle, so
      // the page hands back what it still has on screen.
      handle?: string | null;
      confidence?: string | null;
    };
    if (action !== "followed" && action !== "rejected" && action !== "undo") {
      return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
    }

    const ok = await decideInstagramCandidate(id, action, { handle, confidence });
    if (!ok) {
      return NextResponse.json(
        { error: "Kandidat ikke fundet eller allerede afgjort" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
