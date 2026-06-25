import { NextRequest, NextResponse } from "next/server";
import { createArticle } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { title, summary, content, article_type, author, athlete_id } = body as {
      title: string;
      summary: string;
      content: string;
      article_type: string;
      author: string;
      athlete_id: number | null;
    };

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Titel og indhold er påkrævet" }, { status: 400 });
    }

    const id = await createArticle({
      title: title.trim(),
      summary: summary?.trim() ?? "",
      content: content.trim(),
      article_type: article_type || "news",
      author: author?.trim() || "StudentAthlete.dk",
      athlete_id: athlete_id || null,
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
