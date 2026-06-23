import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, addAthleteEvent, deleteAthleteEvent } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, athlete_id, season, kind, award_name, summary, significance } = body as {
      token?: string;
      athlete_id?: number;
      season?: string | null;
      kind?: string;
      award_name?: string | null;
      summary?: string;
      significance?: string;
    };
    if (!(await validateAdminToken(token ?? null))) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }
    if (!athlete_id || !summary?.trim()) {
      return NextResponse.json({ error: "athlete_id og beskrivelse er påkrævet" }, { status: 400 });
    }
    await addAthleteEvent({
      athlete_id,
      season: season?.trim() || null,
      kind: kind || "award",
      award_name: award_name?.trim() || null,
      summary: summary.trim(),
      significance: significance || "notable",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Serverfejl" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, id } = body as { token?: string; id?: number };
    if (!(await validateAdminToken(token ?? null))) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }
    if (!id) return NextResponse.json({ error: "Mangler id" }, { status: 400 });
    await deleteAthleteEvent(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Serverfejl" }, { status: 500 });
  }
}
