import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isbot } from "isbot";
import { getDB, getEnv } from "@/lib/db";
import { currentSite } from "@/lib/site-server";
import { isKnownHost } from "@/lib/site";
import { buildAlreadyEmail, buildConfirmEmail, digestLinks, newToken, normalizeEmail, parseSports, sendBrevo } from "@/lib/digest";
import type { Subscriber } from "@/lib/digest-server";

/**
 * Public sign-up for the weekly email digest (DigestSignup.tsx). Double opt-in:
 * the row is 'pending' until the confirm link is clicked, and nothing but the
 * confirm email is sent before that. Guards as /api/_lead: bot UA, same-origin,
 * honeypot. On top: one email per address per 10 minutes, so the form cannot
 * be used to flood someone's inbox. Closed unless the site's `emailDigest` is on.
 */
const RESEND_AFTER_MIN = 10;
const ok = () => NextResponse.json({ ok: true });
const fail = (status: number) => NextResponse.json({ ok: false }, { status });

export async function POST(req: NextRequest) {
  const site = await currentSite();
  if (!site.emailDigest) return fail(404);
  if (isbot(req.headers.get("user-agent") ?? "")) return ok();

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const h = new URL(origin).hostname;
      if (!isKnownHost(h) && h !== "localhost") return ok();
    } catch {
      return ok();
    }
  }

  const body = (await req.json().catch(() => null)) as { email?: unknown; sports?: unknown; website?: unknown } | null;
  if (!body) return fail(400);
  if (typeof body.website === "string" && body.website.trim() !== "") return ok(); // honeypot
  const email = normalizeEmail(body.email);
  const sports = parseSports(body.sports);
  if (!email || sports.length === 0) return fail(400);

  const db = await getDB();
  const apiKey = (await getEnv()).BREVO_API_KEY_WEB as string | undefined;
  if (!db || !apiKey) return fail(503);

  try {
    const row = (await db.prepare("SELECT * FROM digest_subscribers WHERE email = ? AND site = ?")
      .bind(email, site.code).first()) as Subscriber | null;

    if (row?.confirm_sent_at) {
      const minutes = (Date.now() - Date.parse(row.confirm_sent_at.replace(" ", "T") + "Z")) / 60000;
      if (minutes < RESEND_AFTER_MIN) return ok();
    }

    if (row?.status === "active") {
      // Already subscribed: send the manage link, change nothing (no one can
      // alter another person's sports by typing their address).
      await sendBrevo(apiKey, site, email, buildAlreadyEmail(site, row.token), digestLinks(site, row.token).unsubscribe);
      await db.prepare("UPDATE digest_subscribers SET confirm_sent_at = datetime('now') WHERE id = ?").bind(row.id).run();
      return ok();
    }

    const token = newToken();
    if (row) {
      await db.prepare(
        `UPDATE digest_subscribers SET sports = ?, status = 'pending', token = ?, confirm_sent_at = datetime('now'),
           unsubscribed_at = NULL WHERE id = ?`,
      ).bind(sports.join(","), token, row.id).run();
    } else {
      await db.prepare(
        `INSERT INTO digest_subscribers (email, site, sports, status, token, confirm_sent_at)
         VALUES (?, ?, ?, 'pending', ?, datetime('now'))`,
      ).bind(email, site.code, sports.join(","), token).run();
    }
    await sendBrevo(apiKey, site, email, buildConfirmEmail(site, sports, token));
    return ok();
  } catch (err) {
    console.error("digest subscribe:", err instanceof Error ? err.message : err);
    return fail(502);
  }
}
