"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getSportColor } from "@/lib/types";
import { sportNav } from "@/lib/i18n";
import { SPORT_ICONS } from "@/lib/sports";

// Ikoner: Tabler Icons (MIT, tabler.io/icons) — samme streg-stil (24×24, stroke 2)
// som sitets øvrige ikoner. Udskiftet 2026-07-03: de håndtegnede lignede ikke
// sportsgrenene (fodbold = krøllet stjerne, volleyball = globus, roning = zigzag).
// NB (2026-08-18): nøglerne her var DANSKE ord efter motor-refaktoren, mens
// SPORT_ICONS slår op med den kanoniske nøgle — syv af tretten sportsgrene fik
// derfor fallback-ikonet (cirkel med plus). Samme fælde som SPORT_KEYWORDS,
// der havde danske nøgler og dræbte sport-tieren for 264 atleter (2026-08-06).
// Kompromiser: roning = kajak og ishockey = skøjte (Tabler har intet ro-/hockeystav-ikon).
const ICON_PATHS: Record<string, string> = {
  "football":
    "<path d=\"M15 9l-6 6\" /><path d=\"M10 12l2 2\" /><path d=\"M12 10l2 2\" /><path d=\"M8 21a5 5 0 0 0 -5 -5\" /><path d=\"M16 3c-7.18 0 -13 5.82 -13 13a5 5 0 0 0 5 5c7.18 0 13 -5.82 13 -13a5 5 0 0 0 -5 -5\" /><path d=\"M16 3a5 5 0 0 0 5 5\" />",
  "basketball":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M5.65 5.65l12.7 12.7\" /><path d=\"M5.65 18.35l12.7 -12.7\" /><path d=\"M12 3a9 9 0 0 0 9 9\" /><path d=\"M3 12a9 9 0 0 1 9 9\" />",
  "baseball":
    "<path d=\"M5.636 18.364a9 9 0 1 0 12.728 -12.728a9 9 0 0 0 -12.728 12.728z\" /><path d=\"M12.495 3.02a9 9 0 0 1 -9.475 9.475\" /><path d=\"M20.98 11.505a9 9 0 0 0 -9.475 9.475\" /><path d=\"M9 9l2 2\" /><path d=\"M13 13l2 2\" /><path d=\"M11 7l2 1\" /><path d=\"M7 11l1 2\" /><path d=\"M16 11l1 2\" /><path d=\"M11 16l2 1\" />",
  "soccer":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M12 7l4.76 3.45l-1.76 5.55h-6l-1.76 -5.55z\" /><path d=\"M12 7v-4m3 13l2.5 3m-.74 -8.55l3.74 -1.45m-11.44 7.05l-2.56 2.95m.74 -8.55l-3.74 -1.45\" />",
  "swimming-and-diving":
    "<path d=\"M16 9m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" /><path d=\"M6 11l4 -2l3.5 3l-1.5 2\" /><path d=\"M3 16.75a2.4 2.4 0 0 0 1 .25a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 1 -.25\" />",
  "track-and-field":
    "<path d=\"M13 4m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0\" /><path d=\"M4 17l5 1l.75 -1.5\" /><path d=\"M15 21l0 -4l-4 -3l1 -6\" /><path d=\"M7 12l0 -3l5 -1l3 3l3 1\" />",
  "golf":
    "<path d=\"M12 18v-15l7 4l-7 4\" /><path d=\"M9 17.67c-.62 .36 -1 .82 -1 1.33c0 1.1 1.8 2 4 2s4 -.9 4 -2c0 -.5 -.38 -.97 -1 -1.33\" />",
  "tennis":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M6 5.3a9 9 0 0 1 0 13.4\" /><path d=\"M18 5.3a9 9 0 0 0 0 13.4\" />",
  "rowing":
    "<path d=\"M6.414 6.414a2 2 0 0 0 0 -2.828l-1.414 -1.414l-2.828 2.828l1.414 1.414a2 2 0 0 0 2.828 0z\" /><path d=\"M17.586 17.586a2 2 0 0 0 0 2.828l1.414 1.414l2.828 -2.828l-1.414 -1.414a2 2 0 0 0 -2.828 0z\" /><path d=\"M6.5 6.5l11 11\" /><path d=\"M22 2.5c-9.983 2.601 -17.627 7.952 -20 19.5c9.983 -2.601 17.627 -7.952 20 -19.5z\" /><path d=\"M6.5 12.5l5 5\" /><path d=\"M12.5 6.5l5 5\" />",
  "gymnastics":
    "<path d=\"M7 7a1 1 0 1 0 2 0a1 1 0 0 0 -2 0\" /><path d=\"M13 21l1 -9l7 -6\" /><path d=\"M3 11h6l5 1\" /><path d=\"M11.5 8.5l4.5 -3.5\" />",
  "ice-hockey":
    // Egen tegning i Tabler-stil (stav + puck) — skøjten kunne være enhver
    // issport (Mikkel 2026-07-03); Tabler har intet hockeystav-ikon
    "<path d=\"M18.5 3l-6.8 13a2.5 2.5 0 0 1 -2.2 1.35h-4\" /><ellipse cx=\"17\" cy=\"19.5\" rx=\"3\" ry=\"1.5\" />",
  "volleyball":
    "<path d=\"M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0\" /><path d=\"M12 12a8 8 0 0 0 8 4\" /><path d=\"M7.5 13.5a12 12 0 0 0 8.5 6.5\" /><path d=\"M12 12a8 8 0 0 0 -7.464 4.928\" /><path d=\"M12.951 7.353a12 12 0 0 0 -9.88 4.111\" /><path d=\"M12 12a8 8 0 0 0 -.536 -8.928\" /><path d=\"M15.549 15.147a12 12 0 0 0 1.38 -10.611\" />",
  "field-hockey":
    // Egen tegning i Tabler-stil: stav med hook + bold. Tabler har intet
    // landhockey-ikon, og ishockey-staven ville forveksles med issport.
    "<path d=\"M9 4v9a5 5 0 0 0 5 5h1\" /><circle cx=\"18.5\" cy=\"18\" r=\"1.8\" />",
  "rugby":
    // Egen tegning i Tabler-stil: ægformet bold på skrå med søm og snørebånd.
    // Tabler har kun den amerikanske football, og de to bolde er ikke ens.
    "<ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"5.5\" transform=\"rotate(-40 12 12)\" /><path d=\"M8.5 15.5l7 -7\" /><path d=\"M10.2 14.2l1.4 1.4\" /><path d=\"M12 12.4l1.4 1.4\" /><path d=\"M13.8 10.6l1.4 1.4\" />",
  "water-polo":
    // Bold over vandlinje — vandet skiller den fra alle andre boldsportsikoner.
    "<circle cx=\"12\" cy=\"8\" r=\"4.5\" /><path d=\"M12 3.5a4.5 4.5 0 0 1 0 9\" /><path d=\"M3 17.5a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1\" /><path d=\"M3 21a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1\" />",
  "fencing":
    // Klinge med parérplade og fæste — våbnet, ikke fægteren.
    "<path d=\"M20 3l-9.5 9.5\" /><path d=\"M7.5 15.5l-2.5 2.5\" /><path d=\"M8.2 11.8l4 4\" /><path d=\"M5.5 14.5l4 4\" /><path d=\"M4 17l3 3\" />",
  "squash":
    // Ketsjer med lille bold. Squashketsjeren er smallere og længere end
    // tennisketsjeren — derfor egen tegning og ikke tennis-ikonet.
    "<ellipse cx=\"14.5\" cy=\"8\" rx=\"4\" ry=\"5.5\" transform=\"rotate(35 14.5 8)\" /><path d=\"M11 12.5l-5.5 7\" /><circle cx=\"5\" cy=\"11\" r=\"1.6\" />",
  "esports":
    // Tabler \"device-gamepad\" — controlleren er esportens universelle tegn.
    "<path d=\"M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z\" /><path d=\"M6 12h4\" /><path d=\"M8 10v4\" /><path d=\"M15 11l0 .01\" /><path d=\"M18 13l0 .01\" />",
  "lacrosse":
    // Stav med net-hoved og bold. Tabler har ingen lacrossestav.
    "<path d=\"M6 21l6.5 -6.5\" /><ellipse cx=\"16\" cy=\"10\" rx=\"3.2\" ry=\"4.5\" transform=\"rotate(45 16 10)\" /><path d=\"M14 8l4 4\" /><circle cx=\"5\" cy=\"9\" r=\"1.6\" />",
  "softball":
    // Som baseball, men med de to store søm-buer og uden det tætte stingmønster.
    "<circle cx=\"12\" cy=\"12\" r=\"9\" /><path d=\"M6.5 5a11 11 0 0 1 0 14\" /><path d=\"M17.5 5a11 11 0 0 0 0 14\" />",
  "wrestling":
    // To greb der låser hinanden — brydning tegnet som figur bliver rod i 24px.
    "<path d=\"M4 9a4 4 0 0 1 8 0v6a4 4 0 0 0 8 0\" /><path d=\"M4 15a4 4 0 0 0 8 0\" /><path d=\"M12 9a4 4 0 0 1 8 0\" />",
  "bowling":
    // Kugle med tre huller + en kegle.
    "<circle cx=\"9\" cy=\"14\" r=\"6.5\" /><circle cx=\"7\" cy=\"11\" r=\".8\" /><circle cx=\"10\" cy=\"10.5\" r=\".8\" /><circle cx=\"8.5\" cy=\"14\" r=\".8\" /><path d=\"M18 21c-1.5 0 -2.5 -1 -2.5 -3s1 -3 1 -6s.5 -4 1.5 -4s1.5 1 1.5 4s1 4 1 6s-1 3 -2.5 3z\" />",
  "sailing":
    // Sejl og skrog over vand (Tabler \"sailboat\"-linjen).
    "<path d=\"M4 18l-1 -5h18l-2 5\" /><path d=\"M11 13v-9l7 9\" /><path d=\"M3 21a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1a2.4 2.4 0 0 0 2 -1a2.4 2.4 0 0 1 2 -1a2.4 2.4 0 0 1 2 1a2.4 2.4 0 0 0 2 1\" />",
  "shooting":
    // Skiven — den ene ting riffel og pistol deler.
    "<circle cx=\"12\" cy=\"12\" r=\"9\" /><circle cx=\"12\" cy=\"12\" r=\"5\" /><circle cx=\"12\" cy=\"12\" r=\"1.4\" />",
  "skiing":
    // Skiløber i fart: hoved, krop, stav og ski.
    "<circle cx=\"15.5\" cy=\"4.5\" r=\"1.5\" /><path d=\"M9 20l3.5 -4.5l-1.5 -4l-3 2\" /><path d=\"M11 11.5l4 2l1.5 4\" /><path d=\"M3 20.5l17 -5.5\" />",
  "triathlon":
    // Cykelhjulene bærer ikonet; svømning og løb kan ikke være der samtidig.
    "<circle cx=\"5.5\" cy=\"17\" r=\"3.5\" /><circle cx=\"18.5\" cy=\"17\" r=\"3.5\" /><path d=\"M5.5 17l4 -6h5l4 6\" /><path d=\"M9.5 11l2.5 6\" /><path d=\"M13 7h3\" />",
  "polo":
    // Køllen med hovedet og bolden — hesten kan ikke tegnes i 24px.
    "<path d=\"M19 3l-9 12\" /><path d=\"M8 16.5l3.5 2\" /><circle cx=\"5\" cy=\"20\" r=\"1.6\" /><path d=\"M9.5 14l3 1.8\" />",
  "flag-football":
    // Flaget i bæltet — sportens hele idé, og det der skiller den fra football.
    "<path d=\"M5 21v-16\" /><path d=\"M5 5h11l-2.5 3.5l2.5 3.5h-11\" /><path d=\"M19 13v8\" /><path d=\"M17 21h4\" />",
  "cycling":
    // To hjul og en ramme (Tabler \"bike\"-linjen).
    "<circle cx=\"5\" cy=\"17\" r=\"3.5\" /><circle cx=\"19\" cy=\"17\" r=\"3.5\" /><path d=\"M12 17l-2 -6l5 0l-4 -3l3 -1\" /><path d=\"M5 17l7 0\" /><path d=\"M15 11l4 6\" />",
  "archery":
    // Bue og pil.
    "<path d=\"M18 3a13 13 0 0 1 -13 13\" /><path d=\"M18 3l-13 13\" /><path d=\"M18 3h-4\" /><path d=\"M18 3v4\" /><path d=\"M9 12l3 3\" />",
  "acrobatics-tumbling":
    // Pyramiden: to baser, en top — sportens billede i én figur.
    "<circle cx=\"12\" cy=\"4.5\" r=\"1.5\" /><path d=\"M12 6v4\" /><path d=\"M8 10h8\" /><circle cx=\"6\" cy=\"14\" r=\"1.5\" /><circle cx=\"18\" cy=\"14\" r=\"1.5\" /><path d=\"M3 20h18\" /><path d=\"M6 15.5v4.5\" /><path d=\"M18 15.5v4.5\" />",
  "ultimate":
    // Disken set på skrå, i luften.
    "<ellipse cx=\"12\" cy=\"13\" rx=\"9\" ry=\"3.5\" /><path d=\"M4.5 11.5a9 3.5 0 0 0 15 0\" /><path d=\"M6 7l2 2\" /><path d=\"M10 5l1 2\" />",
  "other":
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
