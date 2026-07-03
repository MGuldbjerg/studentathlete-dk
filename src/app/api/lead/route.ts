import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isbot } from "isbot";
import { insertLead } from "@/lib/admin";

const SITE_HOST = "studentathlete.dk";

/**
 * Offentlig POST fra "Spil i USA"-formularen (/spil-i-usa).
 * Gemmer lead i D1 med attribution (source_path + referrer) — beviset for en
 * fremtidig NSSA-afregning. Ingen videresendelse; leads ses i admin → Leads.
 * Værn: bot-UA, same-origin, honeypot-felt, feltlængder. Rate-limit er bevidst
 * udeladt (Workers free har ingen KV-tæller her; volumen er lav og admin ser alt).
 */
export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (isbot(ua)) return NextResponse.json({ ok: true });

    const origin = req.headers.get("origin");
    if (origin) {
      try {
        const h = new URL(origin).hostname;
        const ok = h === SITE_HOST || h.endsWith(`.${SITE_HOST}`) || h === "localhost";
        if (!ok) return NextResponse.json({ ok: true });
      } catch {
        return NextResponse.json({ ok: true });
      }
    }

    const body = (await req.json().catch(() => null)) as {
      name?: string;
      email?: string;
      sport?: string;
      message?: string;
      source_path?: string;
      referrer?: string;
      website?: string; // honeypot — mennesker udfylder det aldrig
    } | null;

    // Honeypot udfyldt → bot; svar pænt uden at gemme.
    if (!body || body.website) return NextResponse.json({ ok: true });

    const name = (body.name ?? "").trim().slice(0, 120);
    const email = (body.email ?? "").trim().slice(0, 200);
    if (!name || !email || !email.includes("@")) {
      return NextResponse.json({ ok: false, error: "Udfyld navn og gyldig e-mail" }, { status: 400 });
    }

    let referrer: string | null = null;
    if (body.referrer) {
      try {
        const h = new URL(body.referrer).hostname;
        if (h && h !== SITE_HOST && !h.endsWith(`.${SITE_HOST}`)) referrer = h.slice(0, 255);
      } catch {
        /* ignorér ugyldig referrer */
      }
    }

    const saved = await insertLead({
      name,
      email,
      sport: (body.sport ?? "").trim().slice(0, 60) || null,
      message: (body.message ?? "").trim().slice(0, 2000) || null,
      source_path: (body.source_path ?? "").trim().slice(0, 512) || null,
      referrer,
    });

    if (!saved) {
      return NextResponse.json({ ok: false, error: "Kunne ikke gemme — prøv igen" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Serverfejl" }, { status: 500 });
  }
}
