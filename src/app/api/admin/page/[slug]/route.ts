import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, getPageBySlug, upsertPage } from "@/lib/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const token = req.nextUrl.searchParams.get("token");

    const valid = await validateAdminToken(token);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
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
    const body = await req.json();
    const { token, title, content, meta_description, published } = body as {
      token: string;
      title: string;
      content: string;
      meta_description?: string | null;
      published?: number;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

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
