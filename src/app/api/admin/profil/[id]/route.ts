import { NextRequest, NextResponse } from "next/server";
import { decideProfileDraft } from "@/lib/admin";
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
    const { action, text } = body as {
      action: "approve" | "reject";
      text?: string;
    };
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: "Ugyldig handling" }, { status: 400 });
    }

    const ok = await decideProfileDraft(id, action, text);
    if (!ok) {
      return NextResponse.json(
        { error: "Udkast ikke fundet eller allerede afgjort" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
