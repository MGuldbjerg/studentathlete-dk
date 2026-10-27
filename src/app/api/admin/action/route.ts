import { NextRequest, NextResponse } from "next/server";
import { publishArticle, deleteArticle, announcePublishedArticle } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";
import { cleanNote, isRejectReason } from "@/lib/reject-reasons";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { id, action, reason, note } = body as {
      id: number;
      action: string;
      reason?: unknown;
      note?: unknown;
    };

    if (!id || !["publish", "reject"].includes(action)) {
      return NextResponse.json({ error: "Ugyldigt request" }, { status: 400 });
    }

    if (action === "publish") {
      await publishArticle(id);
      // Efter udgivelsen, aldrig før: pinger vi først og fejler udgivelsen
      // bagefter, har vi fortalt verden om en side der ikke findes.
      await announcePublishedArticle(id);
    } else {
      // The reason is asked for in /admin (Mikkel, 2026-10-27), but an old tab
      // without the dropdown must still be able to reject: unknown → null.
      await deleteArticle(id, { reason: isRejectReason(reason) ? reason : null, note: cleanNote(note) });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // Uden den her linje er «Serverfejl» alt hvad man har at gå efter: da
    // fremmednøglen fra draft_reviews begyndte at blokere sletningen, kunne
    // fejlen kun findes ved at genskabe den i D1 i hånden.
    console.error("admin/action fejlede:", err);
    return NextResponse.json({ error: "Serverfejl" }, { status: 500 });
  }
}
