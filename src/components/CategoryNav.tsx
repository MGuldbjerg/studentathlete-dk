"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSportColor } from "@/lib/types";
import { sportNav } from "@/lib/i18n";
import { SPORT_ICONS } from "@/lib/sports";

// Ikoner: Tabler Icons (MIT, tabler.io/icons) — samme streg-stil (24×24, stroke 2)
// som sitets øvrige ikoner. Udskiftet 2026-07-03: de håndtegnede lignede ikke
// sportsgrenene (fodbold = krøllet stjerne, volleyball = globus, roning = zigzag).
// Kompromiser: roning = kajak og ishockey = skøjte (Tabler har intet ro-/hockeystav-ikon).
const ICON_PATHS: Record<string, string> = {
  "football":
    "<path d=\"M15 9l-6 6\" /><path d=\"M10 12l2 2\" /><path d=\"M12 10l2 2\" /><path d=\"M8 21a5 5 0 0 0 -5 -5\" /><path d=\"M16 3c-7.18 0 -13 5.82 -13 13a5 5 0 0 0 5 5c7.18 0 13 -5.82 13 -13a5 5 0 0 0 -5 -5\" /><path d=\"M16 3a5 5 0 0 0 5 5\" />",
  "basketball":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M5.65 5.65l12.7 12.7\" /><path d=\"M5.65 18.35l12.7 -12.7\" /><path d=\"M12 3a9 9 0 0 0 9 9\" /><path d=\"M3 12a9 9 0 0 1 9 9\" />",
  "baseball":
    "<path d=\"M5.636 18.364a9 9 0 1 0 12.728 -12.728a9 9 0 0 0 -12.728 12.728z\" /><path d=\"M12.495 3.02a9 9 0 0 1 -9.475 9.475\" /><path d=\"M20.98 11.505a9 9 0 0 0 -9.475 9.475\" /><path d=\"M9 9l2 2\" /><path d=\"M13 13l2 2\" /><path d=\"M11 7l2 1\" /><path d=\"M7 11l1 2\" /><path d=\"M16 11l1 2\" /><path d=\"M11 16l2 1\" />",
  "fodbold":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55z\" /><path d=\"M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45\" />",
  "sv\u00f8mning":
    "<path d=\"M16 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" /><path d=\"M6 11l4 -2l3.5 3l-1.5 2\" /><path d=\"M3 16.75a2.4 2.4 0 0 0 1 .25a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1 -.25\" />",
  "atletik":
    "<path d=\"M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" /><path d=\"M4 17l5 1l.75 -1.5\" /><path d=\"M15 21l0 -4l-4 -3l1 -6\" /><path d=\"M7 12l0 -3l5 -1l3 3l3 1\" />",
  "golf":
    "<path d=\"M12 18v-15l7 4l-7 4\" /><path d=\"M9 17.67c-.62 .36 -1 .82 -1 1.33c0 1.1 1.8 2 4 2s4 -.9 4 -2c0 -.5 -.38 -.97 -1 -1.33\" />",
  "tennis":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M6 5.3a9 9 0 0 1 0 13.4\" /><path d=\"M18 5.3a9 9 0 0 0 0 13.4\" />",
  "roning":
    "<path d=\"M6.414 6.414a2 2 0 0 0 0 -2.828l-1.414 -1.414l-2.828 2.828l1.414 1.414a2 2 0 0 0 2.828 0z\" /><path d=\"M17.586 17.586a2 2 0 0 0 0 2.828l1.414 1.414l2.828 -2.828l-1.414 -1.414a2 2 0 0 0 -2.828 0z\" /><path d=\"M6.5 6.5l11 11\" /><path d=\"M22 2.5c-9.983 2.601 -17.627 7.952 -20 19.5c9.983 -2.601 17.627 -7.952 20 -19.5z\" /><path d=\"M6.5 12.5l5 5\" /><path d=\"M12.5 6.5l5 5\" />",
  "gymnastik":
    "<path d=\"M7 7a1 1 0 1 0 2 0a1 1 0 0 0 -2 0\" /><path d=\"M13 21l1 -9l7 -6\" /><path d=\"M3 11h6l5 1\" /><path d=\"M11.5 8.5l4.5 -3.5\" />",
  "ishockey":
    // Egen tegning i Tabler-stil (stav + puck) — skøjten kunne være enhver
    // issport (Mikkel 2026-07-03); Tabler har intet hockeystav-ikon
    "<path d=\"M18.5 3l-6.8 13a2.5 2.5 0 0 1 -2.2 1.35h-4\" /><ellipse cx=\"17\" cy=\"19.5\" rx=\"3\" ry=\"1.5\" />",
  "volleyball":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M12 12a8 8 0 0 0 8 4\" /><path d=\"M7.5 13.5a12 12 0 0 0 8.5 6.5\" /><path d=\"M12 12a8 8 0 0 0 -7.464 4.928\" /><path d=\"M12.951 7.353a12 12 0 0 0 -9.88 4.111\" /><path d=\"M12 12a8 8 0 0 0 -.536 -8.928\" /><path d=\"M15.549 15.147a12 12 0 0 0 1.38 -10.611\" />",
  "andet":
    "<polygon points=\"12,2 14.9,8.3 22,9.3 17,14.1 18.2,21.1 12,17.8 5.8,21.1 7,14.1 2,9.3 9.1,8.3\" />",
};

function SportIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const paths =
    ICON_PATHS[icon] ?? '<circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" />';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: paths }}
    />
  );
}

// Klientkomponent: sproget kommer som prop fra layoutet (ingen request-kontekst her).
export function CategoryNav({ lang, allLabel }: { lang?: string; allLabel?: string }) {
  const searchParams = useSearchParams();
  const activeSport = searchParams.get("sport") ?? "";

  return (
    <nav className="w-full overflow-x-auto border-b border-border bg-white scrollbar-hide sticky top-0 z-40">
      <div className="flex items-center min-w-max px-4 md:px-8 gap-1">
        {sportNav(lang).map((sport) => {
          const sportColor = sport.slug ? getSportColor(sport.slug) : "#00205B";

          // "Alle" filtrerer på forsiden
          if (!sport.slug) {
            const isActive = !activeSport;
            return (
              <Link
                key="alle"
                href="/"
                className="relative flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors"
                style={{
                  color: isActive ? sportColor : "#888888",
                  fontWeight: isActive ? 700 : 500,
                }}
              >
                {sport.label}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                    style={{ backgroundColor: sportColor }}
                  />
                )}
              </Link>
            );
          }

          // Sportsgrene linker til /{sport}
          return (
            <Link
              key={sport.slug}
              href={`/${sport.slug}`}
              className="relative flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors"
              style={{
                color: "#888888",
                fontWeight: 500,
              }}
            >
              <SportIcon icon={SPORT_ICONS[sport.key]} size={15} />
              {sport.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
