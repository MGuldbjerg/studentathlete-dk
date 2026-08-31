import Link from "next/link";
import { getSiteSettings } from "@/lib/admin";

import { sportNav, routePath } from "@/lib/i18n";
import { archivePath } from "@/lib/routes";
import { ConsentSettingsLink } from "./ConsentSettingsLink";
import { currentLanguage, currentSite } from "@/lib/site-server";
import { liveSites, siteBaseUrl } from "@/lib/site";
import { t } from "@/lib/i18n";
export async function Footer() {
  const settings = await getSiteSettings();
  const lang = await currentLanguage();
  const site = await currentSite();
  const family = liveSites();
  return (
    <footer style={{ backgroundColor: "#00205B" }} className="mt-16">
      {/* Rød streg øverst i footer */}
      <div className="h-1 w-full" style={{ backgroundColor: "#BF0A30" }} />

      <div className="px-6 md:px-12 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Om siden */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-white.svg"
            alt={site.brand}
            width={180}
            height={32}
            loading="lazy"
            className="h-8 w-auto mb-3 opacity-90"
          />
          <p className="text-white/60 text-sm leading-relaxed">
            {settings["footer.blurb"]}
          </p>
        </div>

        {/* Sportsgrene */}
        <div>
          <h5 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
            {t("footer.sports", lang)}
          </h5>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {sportNav(lang).filter((s) => s.key !== "other").map((sport) => (
              <Link
                key={sport.slug}
                href={`/${sport.slug}`}
                className="text-white/60 text-sm hover:text-white transition-colors"
              >
                {sport.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Links */}
        <div>
          <h5 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
            {t("footer.about", lang)}
          </h5>
          <ul className="space-y-1.5">
            <li>
              <Link href={archivePath(lang)} className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.all_articles", lang)}
              </Link>
            </li>
            <li>
              <Link href={routePath("athletes", lang)} className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.all_athletes", lang)}
              </Link>
            </li>
            <li>
              <Link href={routePath("schools", lang)} className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.universities", lang)}
              </Link>
            </li>
            <li>
              <Link href={routePath("guides", lang)} className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.knowledge", lang)}
              </Link>
            </li>
            <li>
              <Link href="/om" className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.about_site", lang)}
              </Link>
            </li>
            <li>
              <Link href="/kontakt" className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.contact", lang)}
              </Link>
            </li>
            <li>
              <Link href="/ai-brug" className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.ai_use", lang)}
              </Link>
            </li>
            <li>
              <Link href="/presseetik" className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.press_ethics", lang)}
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-white/60 text-sm hover:text-white transition-colors">
                {t("footer.cookies", lang)}
              </Link>
            </li>
            {/* Leverer selv sit <li> — vises kun når Googles CMP er indlæst. */}
            <ConsentSettingsLink enabled={settings["adsense.enabled"] === "true"} />
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 md:px-12 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-white/40 text-xs">
          © {new Date().getFullYear()} {site.brand}
        </span>

        {/*
          Familielinjen binder sitene sammen — ét link hver vej mellem to
          domæner der ellers intet har til fælles for en crawler. Listen er
          `liveSites()`, så et dark launch-site ikke kan blive linket ind.

          Sitet man står på nævnes uden link: et selvlink siger ingenting til
          hverken læser eller crawler, og forskellen gør det synligt HVOR man er.
        */}
        {family.length > 1 && (
          <span className="text-white/40 text-xs">
            {t("footer.family", lang)}{" "}
            {family.map((other, i) => (
              <span key={other.code}>
                {i > 0 && <span className="text-white/25"> · </span>}
                {other.code === site.code ? (
                  <span className="text-white/70">{other.code}</span>
                ) : (
                  <a
                    href={siteBaseUrl(other)}
                    hrefLang={other.language}
                    className="hover:text-white transition-colors underline underline-offset-2"
                  >
                    {other.code}
                  </a>
                )}
              </span>
            ))}
          </span>
        )}
      </div>
    </footer>
  );
}
