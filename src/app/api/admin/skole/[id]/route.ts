import { NextRequest, NextResponse } from "next/server";
import { updateSchoolColors } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function PUT(
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
    const { primary_color, secondary_color } = body as {
      primary_color?: string | null;
      secondary_color?: string | null;
    };

    for (const v of [primary_color, secondary_color]) {
      if (v && !HEX_RE.test(v)) {
        return NextResponse.json({ error: "Farver skal være #rrggbb" }, { status: 400 });
      }
    }

    await updateSchoolColors(id, primary_color ?? null, secondary_color ?? null);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
