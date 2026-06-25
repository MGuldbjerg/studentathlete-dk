import { NextRequest, NextResponse } from "next/server";
import { updateAthlete } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

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
    const { photo_url, photo_credit, preferred_name } = body as {
      photo_url?: string | null;
      photo_credit?: string | null;
      preferred_name?: string | null;
    };

    await updateAthlete(id, {
      photo_url: photo_url?.trim() || null,
      photo_credit: photo_credit?.trim() || null,
      preferred_name: preferred_name?.trim() || null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
