import { t } from "@/lib/i18n";
import { firstName, possessive } from "@/lib/possessive";
import { ExternalArrow } from "@/components/ui/ExternalArrow";

/**
 * The athlete's own merchandise store (Influxer), verified by name and school
 * (pipeline/profiles/merch-stores.ts). A fact box in the profile sidebar: surface
 * background, thin red top rule, serif heading, one flag-blue button — DESIGN.md's
 * palette and no pill shapes (Mikkel picked this layout, 2026-11-05).
 *
 * Clicks are counted as 'merch' (data-track); the UTM tags tell Influxer the visit
 * came from us (Mikkel, 2026-10-27). Text is the SITE's language, never the
 * athlete's nationality.
 */
export function FanShop({ url, name, slug, lang }: { url: string; name: string; slug: string; lang: string }) {
  const first = firstName(name);
  const vars = { first, possessive: possessive(first, lang) };
  const href = `${url}?utm_source=studentathlete&utm_medium=referral&utm_campaign=profile`;
  return (
    <section className="mt-6 bg-surface px-4 py-4" style={{ borderTop: "2px solid #BF0A30" }}>
      <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-1.5" style={{ color: "#BF0A30" }}>
        {t("profile.merch_kicker", lang)}
      </p>
      <p className="font-serif text-xl text-ink leading-snug mb-2">{t("profile.merch_heading", lang, vars)}</p>
      <p className="text-xs text-muted leading-relaxed mb-3">{t("profile.merch_body", lang, vars)}</p>
      <a href={href} target="_blank" rel="noopener nofollow"
        data-track="merch" data-track-target={slug}
        className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white px-3 py-2.5 transition-opacity hover:opacity-90"
        style={{ background: "#00205B" }}>
        {t("profile.merch_button", lang, vars)}
        <ExternalArrow />
      </a>
      <p className="text-[11px] text-muted mt-2">{t("profile.merch_via", lang)}</p>
    </section>
  );
}
