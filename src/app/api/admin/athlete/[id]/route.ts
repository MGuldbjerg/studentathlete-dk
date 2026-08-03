import { NextRequest, NextResponse } from "next/server";
import { updateAthlete } from "@/lib/admin";
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
    const body = await req.json();
    const { name, photo_url, photo_credit, preferred_name, expected_graduation } = body as {
      name?: string | null;
      photo_url?: string | null;
      photo_credit?: string | null;
      preferred_name?: string | null;
      expected_graduation?: number | null;
    };

    // Kun et fornuftigt 4-cifret år accepteres; alt andet ryddes.
    const gradYear =
      typeof expected_graduation === "number" &&
      Number.isInteger(expected_graduation) &&
      expected_graduation >= 2000 &&
      expected_graduation <= 2100
        ? expected_graduation
        : null;

    const res = await updateAthlete(id, {
      name: name?.trim() || null,
      photo_url: photo_url?.trim() || null,
      photo_credit: photo_credit?.trim() || null,
      preferred_name: preferred_name?.trim() || null,
      expected_graduation: gradYear,
    });
    // Navneskiftet kan afvises (slug-kollision) selvom resten er gemt.
    if (!res.ok) {
      return NextResponse.json({ error: res.error ?? "Kunne ikke gemme navnet" }, { status: 409 });
    }

    return NextResponse.json({ success: true, renamed: res.renamed === true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
