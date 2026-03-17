import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, publishArticle, deleteArticle } from "@/lib/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action, token } = body as {
      id: number;
      action: string;
      token: string;
    };

    const valid = await validateAdminToken(token ?? null);
    if (!valid) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }

    if (!id || !["publish", "reject"].includes(action)) {
      return NextResponse.json({ error: "Ugyldigt request" }, { status: 400 });
    }

    if (action === "publish") {
      await publishArticle(id);
    } else {
      await deleteArticle(id);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Serverfejl" }, { status: 500 });
  }
}
