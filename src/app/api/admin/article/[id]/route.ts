import { NextRequest, NextResponse } from "next/server";
import { updateArticle } from "@/lib/admin";
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
    const fields = (await req.json()) as {
      title?: string;
      summary?: string;
      content?: string;
      article_type?: string;
      author?: string;
      athlete_id?: number | null;
      featured?: number;
    };

    await updateArticle(id, fields);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
