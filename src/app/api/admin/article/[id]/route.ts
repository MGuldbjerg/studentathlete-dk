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
    const body = (await req.json()) as {
      title?: string;
      summary?: string;
      content?: string;
      article_type?: string;
      author?: string;
      author_role?: string | null;
      correction_note?: string | null;
      athlete_id?: number | null;
      featured?: number;
    };

    // Whitelist felter eksplicit — updateArticle bygger SQL af nøglerne,
    // så ukendte nøgler fra klienten må aldrig slippe igennem.
    await updateArticle(id, {
      title: body.title,
      summary: body.summary,
      content: body.content,
      article_type: body.article_type,
      author: body.author,
      author_role:
        body.author_role === undefined ? undefined : body.author_role === "human" ? "human" : null,
      correction_note:
        body.correction_note === undefined ? undefined : body.correction_note?.trim() || null,
      athlete_id: body.athlete_id,
      featured: body.featured,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
