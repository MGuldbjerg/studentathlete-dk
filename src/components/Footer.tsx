import Link from "next/link";
import { getSiteSettings } from "@/lib/admin";

import { sportNav } from "@/lib/i18n";
import { ARCHIVE_PATH } from "@/lib/routes";
import { ConsentSettingsLink } from "./ConsentSettingsLink";
export async function Footer() {
  const settings = await getSiteSettings();
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
            alt="StudentAthlete.dk"
            className="h-8 w-auto mb-3 opacity-90"
          />
          <p className="text-white/60 text-sm leading-relaxed">
            {settings["footer.blurb"]}
          </p>
        </div>

        {/* Sportsgrene */}
        <div>
          <h5 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
            Sportsgrene
          </h5>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {sportNav().filter((s) => s.key !== "other").map((sport) => (
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
            Om os
          </h5>
          <ul className="space-y-1.5">
            <li>
              <Link href={ARCHIVE_PATH} className="text-white/60 text-sm hover:text-white transition-colors">
                Alle artikler
              </Link>
            </li>
            <li>
              <Link href="/atleter" className="text-white/60 text-sm hover:text-white transition-colors">
                Alle atleter
              </Link>
            </li>
            <li>
              <Link href="/skoler" className="text-white/60 text-sm hover:text-white transition-colors">
                Universiteter
              </Link>
            </li>
            <li>
              <Link href="/viden" className="text-white/60 text-sm hover:text-white transition-colors">
                Viden om NCAA
              </Link>
            </li>
            <li>
              <Link href="/om" className="text-white/60 text-sm hover:text-white transition-colors">
                Om StudentAthlete.dk
              </Link>
            </li>
            <li>
              <Link href="/kontakt" className="text-white/60 text-sm hover:text-white transition-colors">
                Kontakt
              </Link>
            </li>
            <li>
              <Link href="/ai-brug" className="text-white/60 text-sm hover:text-white transition-colors">
                Sådan bruger vi AI
              </Link>
            </li>
            <li>
              <Link href="/presseetik" className="text-white/60 text-sm hover:text-white transition-colors">
                Presseetik &amp; henvendelser
              </Link>
            </li>
            <li>
              <Link href="/cookies" className="text-white/60 text-sm hover:text-white transition-colors">
                Cookies
              </Link>
            </li>
            {/* Leverer selv sit <li> — vises kun når Googles CMP er indlæst. */}
            <ConsentSettingsLink enabled={settings["adsense.enabled"] === "true"} />
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 md:px-12 py-4 flex items-center justify-between">
        <span className="text-white/40 text-xs">
          © {new Date().getFullYear()} StudentAthlete.dk
        </span>
      </div>
    </footer>
  );
}
