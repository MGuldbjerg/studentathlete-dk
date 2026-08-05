import { Suspense } from "react";
import { SearchBar } from "./SearchBar";
import { AdminBarLink } from "./AdminBarLink";
import { currentLanguage } from "@/lib/site-server";
import { t } from "@/lib/i18n";

export async function Header() {
  const lang = await currentLanguage();
  return (
    <header>
      {/* Tynd rød top-streg */}
      <div className="h-1 w-full" style={{ backgroundColor: "#BF0A30" }} />

      {/* Hoved-nav — mørk blå */}
      <div
        className="w-full px-4 md:px-8 py-4 flex items-center justify-between gap-6"
        style={{ backgroundColor: "#00205B" }}
      >
        {/* Logo */}
        <a href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-white.svg"
            alt="StudentAthlete.dk"
            className="h-8 md:h-10 w-auto"
          />
        </a>

        {/* Højre side: admin-knap (vises på alle skærme når logget ind) + desktop-nav */}
        <div className="flex items-center gap-4 md:gap-6 md:flex-1 md:justify-end">
          <AdminBarLink />

          {/* Desktop navigation + søgefelt */}
          <div className="hidden md:flex items-center gap-6 flex-1 justify-end">
            <a
              href="/atleter"
              className="text-sm font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap"
            >
              {t("nav.athletes", lang)}
            </a>
            <div className="w-full max-w-sm">
              <Suspense fallback={null}>
                <SearchBar
                  placeholder={t("nav.search_placeholder", lang)}
                  submitLabel={t("nav.search_submit", lang)}
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
