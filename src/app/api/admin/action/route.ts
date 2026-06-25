import { NextRequest, NextResponse } from "next/server";
import { publishArticle, deleteArticle } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { id, action } = body as {
      id: number;
      action: string;
    };

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
