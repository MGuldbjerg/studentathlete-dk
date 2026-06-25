import { NextRequest, NextResponse } from "next/server";
import { addAthleteEvent, deleteAthleteEvent } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { athlete_id, season, kind, award_name, summary, significance } = body as {
      athlete_id?: number;
      season?: string | null;
      kind?: string;
      award_name?: string | null;
      summary?: string;
      significance?: string;
    };
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
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { id } = body as { id?: number };
    if (!id) return NextResponse.json({ error: "Mangler id" }, { status: 400 });
    await deleteAthleteEvent(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Serverfejl" }, { status: 500 });
  }
}
