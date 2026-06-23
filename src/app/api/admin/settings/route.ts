import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken, upsertSetting } from "@/lib/admin";
import { SETTING_KEYS } from "@/lib/site-content";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, values } = body as { token?: string; values?: Record<string, string> };

    if (!(await validateAdminToken(token ?? null))) {
      return NextResponse.json({ error: "Ugyldigt token" }, { status: 404 });
    }
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
