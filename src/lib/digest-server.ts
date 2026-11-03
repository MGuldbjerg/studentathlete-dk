/**
 * Server side of the email digest: the subscriber row and the small pages the
 * email links open (confirmed, unsubscribed, manage). Those pages are answered
 * by the /api/digest routes as plain HTML in the site's language, not through
 * the page tree: they are one sentence each, never indexed, and keeping them
 * out of the RouteKey system means no slug to keep in two languages.
 */
import type { CountryProfile } from "./countries/types";
import { siteBaseUrl } from "./site";
import { getDB } from "./db";
import { isToken } from "./digest";

export interface Subscriber {
  id: number;
  email: string;
  site: string;
  sports: string;
  status: "pending" | "active" | "unsubscribed";
  token: string;
  confirm_sent_at: string | null;
}

export async function subscriberByToken(token: unknown, site: CountryProfile): Promise<Subscriber | null> {
  if (!isToken(token)) return null;
  const db = await getDB();
  if (!db) return null;
  return (await db.prepare("SELECT * FROM digest_subscribers WHERE token = ? AND site = ?")
    .bind(token, site.code).first()) as Subscriber | null;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A one-message page in the site's colours, with a way back to the site. Never indexed. */
export function noticePage(site: CountryProfile, message: string, extraHtml = "", status = 200): Response {
  const html = `<!doctype html><html lang="${site.language}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>${esc(site.brand)}</title></head>
<body style="margin:0;background:#F7F6F4;font-family:Georgia,'Times New Roman',serif;color:#111">
<div style="background:#00205B;padding:18px 20px"><a href="${siteBaseUrl(site)}/" style="color:#fff;text-decoration:none;font:700 13px/1 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase">${esc(site.brand)}</a></div>
<div style="height:3px;background:#BF0A30"></div>
<main style="max-width:560px;margin:0 auto;padding:40px 20px">
<p style="font-size:20px;line-height:1.5;margin:0 0 20px">${esc(message)}</p>${extraHtml}
</main></body></html>`;
  return new Response(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
