import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, updateArticle } from "@/lib/admin";

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
    const { token, ...fields } = body as {
      token: string;
      title?: string;
      summary?: string;
      content?: string;
      article_type?: string;
      author?: string;
      athlete_id?: number | null;
      featured?: number;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

    await updateArticle(id, fields);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
