import type { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { currentSite } from "@/lib/site-server";
import { t } from "@/lib/i18n";
import { noticePage, subscriberByToken } from "@/lib/digest-server";

/**
 * Unsubscribe. POST does it: the button below, and the mail client's one-click
 * unsubscribe (List-Unsubscribe-Post, RFC 8058). GET — the link in the email —
 * only shows that button, because mail security scanners (Outlook Safe Links
 * and the like) open every link in a message, and a GET that unsubscribed
 * would sign people out without them ever clicking. The row stays as
 * 'unsubscribed' and is deleted after 30 days (privacy page).
 */
export async function GET(req: NextRequest) {
  const site = await currentSite();
  const lang = site.language;
  const token = req.nextUrl.searchParams.get("t");
  const row = await subscriberByToken(token, site);
  if (!row) return noticePage(site, t("digest.invalid", lang), "", 404);
  if (row.status === "unsubscribed") return noticePage(site, t("digest.unsubscribed", lang));
  return noticePage(site, t("digest.mail_unsubscribe", lang) + "?",
    `<form method="post" action="?t=${row.token}"><button type="submit" style="background:#BF0A30;color:#fff;border:0;font:700 13px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:14px 20px;cursor:pointer">${t("digest.mail_unsubscribe", lang)}</button></form>`);
}

export async function POST(req: NextRequest) {
  const site = await currentSite();
  const lang = site.language;
  const row = await subscriberByToken(req.nextUrl.searchParams.get("t"), site);
  if (!row) return noticePage(site, t("digest.invalid", lang), "", 404);
  if (row.status !== "unsubscribed") {
    const db = await getDB();
    await db.prepare("UPDATE digest_subscribers SET status = 'unsubscribed', unsubscribed_at = datetime('now') WHERE id = ?")
      .bind(row.id).run();
  }
  return noticePage(site, t("digest.unsubscribed", lang));
}
