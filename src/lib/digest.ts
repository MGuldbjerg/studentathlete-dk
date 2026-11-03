/**
 * The weekly email digest (growth plan, Mikkel 2026-11-03): a reader picks
 * sports and gets, every Monday, only those sports' stories from the week.
 *
 * Shared by the Worker (/api/digest/*: sign-up, confirm, manage, unsubscribe)
 * and the weekly sender (pipeline/digest/send-digest.ts), so the links, texts
 * and the Brevo call exist once. Everything a reader sees comes from the
 * site's language pack and the site's own domain: a .co.uk reader gets
 * .co.uk links from info@student-athlete.co.uk, never the Danish site.
 */
import type { CountryProfile } from "./countries/types";
import { siteBaseUrl } from "./site";
import { sportLabel, t } from "./i18n";
import { isSportKey } from "./sports";
import { getArticleUrl } from "./seo";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const e = raw.trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : null;
}

/** Known sport keys only, de-duplicated, in the order given. */
export function parseSports(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const out: string[] = [];
  for (const v of list) {
    const k = typeof v === "string" ? v.trim() : "";
    if (isSportKey(k) && !out.includes(k)) out.push(k);
  }
  return out.slice(0, 40);
}

/** 32 random bytes as hex: the secret in every confirm / manage / unsubscribe link. */
export function newToken(): string {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export function isToken(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
}

export function digestLinks(site: CountryProfile, token: string) {
  const base = `${siteBaseUrl(site)}/api/digest`;
  return {
    confirm: `${base}/confirm?t=${token}`,
    manage: `${base}/manage?t=${token}`,
    unsubscribe: `${base}/unsubscribe?t=${token}`,
  };
}

/** "golf, rowing and athletics" in the site's language. */
export function sportList(sports: string[], lang: string): string {
  const names = sports.map((s) => sportLabel(s, lang).toLowerCase());
  if (names.length <= 1) return names.join("");
  const and = lang === "da" ? "og" : "and";
  return `${names.slice(0, -1).join(", ")} ${and} ${names[names.length - 1]}`;
}

export interface Email { subject: string; html: string; text: string }

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain, single-column email: system fonts, the sites' navy and red, no images. */
function frame(site: CountryProfile, body: string, footer: string): string {
  return `<!doctype html><html lang="${site.language}"><body style="margin:0;padding:0;background:#F7F6F4">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;font-family:Georgia,'Times New Roman',serif;color:#111">
<p style="margin:0 0 20px;font:700 12px/1 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#00205B">${esc(site.brand)}</p>
${body}
<div style="height:3px;background:#BF0A30;margin:28px 0 14px"></div>
<p style="margin:0;font:12px/1.5 Arial,sans-serif;color:#6B6B6B">${footer}</p>
</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(href)}" style="display:inline-block;background:#BF0A30;color:#fff;text-decoration:none;font:700 13px/1 Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;padding:14px 20px">${esc(label)}</a></p>`;

export function buildConfirmEmail(site: CountryProfile, sports: string[], token: string): Email {
  const lang = site.language;
  const { confirm } = digestLinks(site, token);
  const body = t("digest.confirm_body", lang, { sports: sportList(sports, lang) });
  const footer = esc(t("digest.mail_footer", lang, { host: site.host }));
  return {
    subject: t("digest.confirm_subject", lang, { brand: site.brand }),
    html: frame(site, `<p style="font-size:17px;line-height:1.5">${esc(body)}</p>${button(confirm, t("digest.confirm_button", lang))}`, footer),
    text: `${body}\n\n${confirm}\n\n${t("digest.mail_footer", lang, { host: site.host })}`,
  };
}

/** For a sign-up from an address that is already active: the manage link, nothing changed. */
export function buildAlreadyEmail(site: CountryProfile, token: string): Email {
  const lang = site.language;
  const { manage, unsubscribe } = digestLinks(site, token);
  const body = t("digest.already_body", lang);
  const footer = `<a href="${esc(unsubscribe)}" style="color:#6B6B6B">${esc(t("digest.mail_unsubscribe", lang))}</a>`;
  return {
    subject: t("digest.already_subject", lang, { brand: site.brand }),
    html: frame(site, `<p style="font-size:17px;line-height:1.5">${esc(body)}</p>${button(manage, t("digest.mail_manage", lang))}`, footer),
    text: `${body}\n\n${manage}\n\n${t("digest.mail_unsubscribe", lang)}: ${unsubscribe}`,
  };
}

export interface DigestArticle { title: string; summary: string | null; slug: string; sport: string }
export interface DigestSection { sport: string; articles: DigestArticle[] }

/** Sections in the subscriber's own order, only sports they chose and that had a story this week. */
export function sectionsFor(sports: string[], all: DigestSection[]): DigestSection[] {
  return sports
    .map((s) => all.find((x) => x.sport === s))
    .filter((x): x is DigestSection => !!x && x.articles.length > 0);
}

/** Group the week's articles by sport, newest first within a sport. */
export function groupBySport(articles: DigestArticle[]): DigestSection[] {
  const by = new Map<string, DigestArticle[]>();
  for (const a of articles) {
    if (!by.has(a.sport)) by.set(a.sport, []);
    by.get(a.sport)!.push(a);
  }
  return [...by].map(([sport, list]) => ({ sport, articles: list }));
}

/** The site's link for an article, tagged with the source parameter so arrivals count as 'digest'. */
function articleLink(site: CountryProfile, a: DigestArticle, sourceParam: string): string {
  return `${siteBaseUrl(site)}${getArticleUrl({ slug: a.slug, sport: a.sport }, site.language)}?${sourceParam}=digest`;
}

export function buildDigestEmail(site: CountryProfile, sections: DigestSection[], token: string, sourceParam: string): Email {
  const lang = site.language;
  const { manage, unsubscribe } = digestLinks(site, token);
  const subject = t("digest.mail_subject", lang, {
    brand: site.brand,
    sports: sportList(sections.map((s) => s.sport), lang),
  });

  const htmlSections = sections.map((sec) => {
    const items = sec.articles.map((a) => {
      const href = esc(articleLink(site, a, sourceParam));
      const summary = a.summary ? `<br><span style="font-size:15px;color:#444">${esc(a.summary)}</span>` : "";
      return `<li style="margin:0 0 14px"><a href="${href}" style="color:#00205B;font-weight:700;text-decoration:none;font-size:17px">${esc(a.title)}</a>${summary}</li>`;
    }).join("");
    return `<h2 style="margin:26px 0 10px;font:900 11px/1 Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#BF0A30">${esc(sportLabel(sec.sport, lang))}</h2><ul style="margin:0;padding:0;list-style:none;line-height:1.4">${items}</ul>`;
  }).join("");

  const footer = `${esc(t("digest.mail_footer", lang, { host: site.host }))}<br>`
    + `<a href="${esc(manage)}" style="color:#6B6B6B">${esc(t("digest.mail_manage", lang))}</a> · `
    + `<a href="${esc(unsubscribe)}" style="color:#6B6B6B">${esc(t("digest.mail_unsubscribe", lang))}</a>`;

  const textSections = sections.map((sec) =>
    `${sportLabel(sec.sport, lang).toUpperCase()}\n` +
    sec.articles.map((a) => `- ${a.title}\n  ${articleLink(site, a, sourceParam)}`).join("\n"),
  ).join("\n\n");

  return {
    subject,
    html: frame(site, `<p style="font-size:17px;line-height:1.5;margin:0">${esc(t("digest.mail_intro", lang))}</p>${htmlSections}`, footer),
    text: `${t("digest.mail_intro", lang)}\n\n${textSections}\n\n${t("digest.mail_footer", lang, { host: site.host })}\n${t("digest.mail_manage", lang)}: ${manage}\n${t("digest.mail_unsubscribe", lang)}: ${unsubscribe}`,
  };
}

/**
 * One transactional email through Brevo, from the site's own address. The
 * List-Unsubscribe headers give mail clients their one-click unsubscribe (the
 * Gmail/Yahoo bulk-sender rule); the URL accepts POST for exactly that.
 */
export async function sendBrevo(apiKey: string, site: CountryProfile, to: string, email: Email, unsubscribeUrl?: string): Promise<string> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: site.brand, email: site.contactEmail },
      replyTo: { email: site.contactEmail },
      to: [{ email: to }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      ...(unsubscribeUrl ? {
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      } : {}),
    }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${body.slice(0, 200)}`);
  return (JSON.parse(body) as { messageId?: string }).messageId ?? "";
}
