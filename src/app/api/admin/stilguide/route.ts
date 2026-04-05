import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, getStyleCorrections, createStyleCorrection } from "@/lib/admin";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    const valid = await validateAdminToken(token);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

    const corrections = await getStyleCorrections();
    return NextResponse.json({ corrections });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, wrong_phrase, correct_phrase, category, note } = body as {
      token: string;
      wrong_phrase: string;
      correct_phrase: string;
      category: string;
      note: string | null;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

    if (!wrong_phrase?.trim() || !correct_phrase?.trim()) {
      return NextResponse.json(
        { error: "Forkert og korrekt frase er påkrævet" },
        { status: 400 },
      );
    }

    const id = await createStyleCorrection({
      wrong_phrase: wrong_phrase.trim(),
      correct_phrase: correct_phrase.trim(),
      category: category || "oversaettelse",
      note: note?.trim() || null,
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
