import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, updateSchoolColors } from "@/lib/admin";

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

    const body = await req.json();
    const { token, primary_color, secondary_color } = body as {
      token: string;
      primary_color?: string | null;
      secondary_color?: string | null;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

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
