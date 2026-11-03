import type { NextRequest } from "next/server";
import { getDB, getDigestSports } from "@/lib/db";
import { currentSite } from "@/lib/site-server";
import { sportLabel, t } from "@/lib/i18n";
import { digestLinks, parseSports } from "@/lib/digest";
import { noticePage, subscriberByToken } from "@/lib/digest-server";
import type { CountryProfile } from "@/lib/countries/types";

/** «Change sports» from the digest email: tick boxes for the site's sports, saved by POST. */
async function form(site: CountryProfile, token: string, chosen: string[], message: string): Promise<Response> {
  const lang = site.language;
  const sports = await getDigestSports(site.code);
  const boxes = sports.map((s) =>
    `<label style="display:block;padding:6px 0;font:15px/1.4 Arial,sans-serif"><input type="checkbox" name="sports" value="${s}"${chosen.includes(s) ? " checked" : ""} style="margin-right:8px">${sportLabel(s, lang)}</label>`,
  ).join("");
  const unsubscribe = digestLinks(site, token).unsubscribe;
  const extra = `<form method="post" action="?t=${token}">${boxes}
<button type="submit" style="margin-top:18px;background:#BF0A30;color:#fff;border:0;font:700 13px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:14px 20px;cursor:pointer">${t("digest.manage_save", lang)}</button></form>
<p style="margin-top:28px;font:13px/1.5 Arial,sans-serif"><a href="${unsubscribe}" style="color:#6B6B6B">${t("digest.mail_unsubscribe", lang)}</a></p>`;
  return noticePage(site, message, extra);
}

export async function GET(req: NextRequest) {
  const site = await currentSite();
  const row = await subscriberByToken(req.nextUrl.searchParams.get("t"), site);
  if (!row || row.status !== "active") return noticePage(site, t("digest.invalid", site.language), "", 404);
  return form(site, row.token, row.sports.split(","), t("digest.manage_heading", site.language));
}

export async function POST(req: NextRequest) {
  const site = await currentSite();
  const row = await subscriberByToken(req.nextUrl.searchParams.get("t"), site);
  if (!row || row.status !== "active") return noticePage(site, t("digest.invalid", site.language), "", 404);
  const data = await req.formData().catch(() => null);
  const sports = parseSports(data?.getAll("sports") ?? []);
  if (sports.length === 0) return form(site, row.token, row.sports.split(","), t("digest.error", site.language));
  const db = await getDB();
  await db.prepare("UPDATE digest_subscribers SET sports = ? WHERE id = ?").bind(sports.join(","), row.id).run();
  return form(site, row.token, sports, t("digest.saved", site.language));
}
