import { NextRequest, NextResponse } from "next/server";
import { upsertSetting } from "@/lib/admin";
import { isAdmin } from "@/lib/admin-auth";
import { SETTING_KEYS } from "@/lib/site-content";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdmin(req.headers))) {
      return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
    }
    const body = await req.json();
    const { values } = body as { values?: Record<string, string> };
    if (!values || typeof values !== "object") {
      return NextResponse.json({ error: "Ingen værdier" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(values)) {
      if (SETTING_KEYS.has(key) && typeof value === "string") {
        await upsertSetting(key, value);
      }
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serverfejl";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
