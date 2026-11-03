import type { NextRequest } from "next/server";
import { getDB } from "@/lib/db";
import { currentSite } from "@/lib/site-server";
import { t } from "@/lib/i18n";
import { noticePage, subscriberByToken } from "@/lib/digest-server";

/** The link in the confirmation email: pending → active. Clicking it twice is harmless. */
export async function GET(req: NextRequest) {
  const site = await currentSite();
  const lang = site.language;
  const row = await subscriberByToken(req.nextUrl.searchParams.get("t"), site);
  if (!row || row.status === "unsubscribed") return noticePage(site, t("digest.invalid", lang), "", 404);

  if (row.status === "pending") {
    const db = await getDB();
    await db.prepare("UPDATE digest_subscribers SET status = 'active', confirmed_at = datetime('now') WHERE id = ?")
      .bind(row.id).run();
  }
  return noticePage(site, t("digest.confirmed", lang));
}
