import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, createArticle } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, title, summary, content, article_type, author, athlete_id } = body as {
      token: string;
      title: string;
      summary: string;
      content: string;
      article_type: string;
      author: string;
      athlete_id: number | null;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

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
