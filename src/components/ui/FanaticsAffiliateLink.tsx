import {
  FANATICS_DISCLOSURE,
  FANATICS_CUSTOMS_NOTE,
  buildFanaticsAffiliateUrl,
  type FanaticsRegion,
} from "@/lib/fanatics";

/**
 * Affiliate-CTA for én skole — TEMPLATE (endnu ikke wiret ind i sider).
 *
 * Billede: send `banner` (grafik fra Fanatics' creative-bibliotek efter
 * godkendelse). Uden banner vises en pæn fallback-knap i skolens farve.
 *
 * Eksempel på senere brug i en artikelskabelon (efter aktivering):
 *   <FanaticsAffiliateLink
 *     schoolName="Illinois Fighting Illini"
 *     slug="illinois-fighting-illini"   // fra fanatics-store-mapping.csv
 *     region="eu"                        // eu → fanatics.de, us → fanatics.com
 *     primaryColor={school.primary_color}
 *     subId={article.slug}               // attribution i Impact
 *     banner={{ src: "/fanatics/illinois-300x250.png", width: 300, height: 250 }}
 *   />
 */
interface FanaticsBanner {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface Props {
  schoolName: string;
  slug: string;
  region: FanaticsRegion;
  primaryColor?: string | null;
  subId?: string;
  banner?: FanaticsBanner;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

export function FanaticsAffiliateLink({
  schoolName,
  slug,
  region,
  primaryColor,
  subId,
  banner,
}: Props) {
  const href = buildFanaticsAffiliateUrl(slug, region, subId);
  const color = primaryColor && HEX.test(primaryColor) ? primaryColor : "#00205B";

  return (
    <aside className="mt-8 border border-border rounded-lg overflow-hidden bg-surface/40">
      <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted px-4 pt-3">
        {FANATICS_DISCLOSURE}
      </p>

      <a
        href={href}
        target="_blank"
        rel="sponsored nofollow noopener"
        data-track="fanatics"
        className="block px-4 py-3"
      >
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={banner.src}
            alt={banner.alt ?? `Shop ${schoolName}-merchandise hos Fanatics`}
            width={banner.width}
            height={banner.height}
            className="w-full h-auto rounded"
            loading="lazy"
          />
        ) : (
          <span
            className="flex items-center justify-center text-center text-white font-bold
                       rounded py-3 px-4 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: color, fontFamily: "var(--font-serif)" }}
          >
            Shop {schoolName}-merchandise hos Fanatics →
          </span>
        )}
      </a>

      {region === "us" && (
        <p className="text-[11px] text-muted px-4 pb-3 leading-relaxed">
          {FANATICS_CUSTOMS_NOTE}
        </p>
      )}
    </aside>
  );
}
