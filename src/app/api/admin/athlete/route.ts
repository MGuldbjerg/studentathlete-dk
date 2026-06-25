import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { name, sport, university, division, position, hometown, university_state } =
      body as {
        name: string;
        sport: string;
        university: string;
        division?: string;
        position?: string | null;
        hometown?: string | null;
        university_state?: string | null;
      };

    if (!name || !sport || !university) {
      return NextResponse.json(
        { error: "Navn, sport og universitet er påkrævet" },
        { status: 400 },
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[æ]/g, "ae")
      .replace(/[ø]/g, "oe")
      .replace(/[å]/g, "aa")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s-]+/g, "-")
      .trim();

    const db = await getDB();
    if (!db) {
      return NextResponse.json({ error: "Database utilgængelig" }, { status: 500 });
    }

    await db
      .prepare(
        `INSERT INTO athletes (name, slug, sport, university, division, position, hometown, university_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        name,
        slug,
        sport,
        university,
        division ?? "NCAA D1",
        position ?? null,
        hometown ?? null,
        university_state ?? null,
      )
      .run();

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
