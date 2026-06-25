import { NextRequest, NextResponse } from "next/server";
import { getStyleCorrections, createStyleCorrection } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
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
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { wrong_phrase, correct_phrase, category, note } = body as {
      wrong_phrase: string;
      correct_phrase: string;
      category: string;
      note: string | null;
    };

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
