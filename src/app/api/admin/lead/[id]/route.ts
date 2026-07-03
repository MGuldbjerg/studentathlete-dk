import { NextRequest, NextResponse } from "next/server";
import { updateLeadStatus } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

/** Opdatér lead-status (new/contacted/forwarded/closed) fra admin → Leads. */
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

    const body = (await req.json()) as { status?: string };
    const ok = await updateLeadStatus(id, body.status ?? "");
    if (!ok) {
      return NextResponse.json({ error: "Ugyldig status eller lead findes ikke" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
