import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, updateAthletePhoto } from "@/lib/admin";

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
    const { token, photo_url, photo_credit } = body as {
      token: string;
      photo_url?: string | null;
      photo_credit?: string | null;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

    await updateAthletePhoto(
      id,
      photo_url?.trim() || null,
      photo_credit?.trim() || null,
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
