import { NextRequest, NextResponse } from "next/server";
import { getPageBySlug, upsertPage } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }

    const page = await getPageBySlug(slug);
    return NextResponse.json({ page });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { title, content, meta_description, published } = body as {
      title: string;
      content: string;
      meta_description?: string | null;
      published?: number;
    };

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Titel og indhold er påkrævet" }, { status: 400 });
    }

    await upsertPage(
      slug,
      title.trim(),
      content.trim(),
      meta_description?.trim() || null,
      published === 1 ? 1 : published === 0 ? 0 : undefined,
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
