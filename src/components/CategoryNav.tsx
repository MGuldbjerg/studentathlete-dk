"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SPORTS, getSportColor } from "@/lib/types";

function SportIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (icon) {
    case "football":
      return <svg {...props}><ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-30 12 12)" /><path d="M6 3l4 4m4 4l4 4M14 3l-4 4m-4 4l-4 4" /></svg>;
    case "basketball":
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" /><path d="M4.93 4.93c4.08 2.52 4.08 11.62 0 14.14M19.07 4.93c-4.08 2.52-4.08 11.62 0 14.14" /></svg>;
    case "baseball":
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M8 2.5c0 5.5-2 10-2 14M16 2.5c0 5.5 2 10 2 14" /></svg>;
    case "atletik":
      return <svg {...props}><circle cx="12" cy="5" r="2" /><path d="M6 20l3-7 3 2 3-5 3 10" /><path d="M9 13l-3 7" /></svg>;
    case "svømning":
      return <svg {...props}><path d="M2 16c1.5-1 3-2 4.5-1s3 2 4.5 1 3-2 4.5-1 3 2 4.5 1" /><path d="M2 20c1.5-1 3-2 4.5-1s3 2 4.5 1 3-2 4.5-1 3 2 4.5 1" /><circle cx="8" cy="8" r="2" /><path d="M10 8l4 4-2 3" /></svg>;
    case "fodbold":
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 2l3 5h5l1 5-4 4 1 5-5 1-4-4-4 4-5-1 1-5-4-4 1-5h5z" /></svg>;
    case "golf":
      return <svg {...props}><path d="M17 3v10l-5-3v-7z" /><line x1="17" y1="13" x2="17" y2="20" /><ellipse cx="17" cy="21" rx="3" ry="1.5" /></svg>;
    case "tennis":
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M5.5 5.5C8.5 8.5 8.5 15.5 5.5 18.5" /><path d="M18.5 5.5C15.5 8.5 15.5 15.5 18.5 18.5" /></svg>;
    case "roning":
      return <svg {...props}><path d="M3 17l5-10 5 5 5-10" /><path d="M3 17l3 3M13 12l3 3" /></svg>;
    case "gymnastik":
      return <svg {...props}><circle cx="12" cy="4" r="2" /><path d="M12 6v5M9 8l-4 5M15 8l4 5M9 11l-1 7M15 11l1 7" /></svg>;
    case "ishockey":
      return <svg {...props}><path d="M18 4L6 16" /><path d="M6 16l-2 3h4" /><ellipse cx="12" cy="21" rx="6" ry="2" /></svg>;
    case "volleyball":
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 2C9 6 9 18 12 22" /><path d="M12 2C15 6 15 18 12 22" /><path d="M2 9h20M2 15h20" /></svg>;
    case "andet":
      return <svg {...props}><polygon points="12,2 14.9,8.3 22,9.3 17,14.1 18.2,21.1 12,17.8 5.8,21.1 7,14.1 2,9.3 9.1,8.3" /></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>;
  }
}

export function CategoryNav() {
  const searchParams = useSearchParams();
  const activeSport = searchParams.get("sport") ?? "";

  return (
    <nav className="w-full overflow-x-auto border-b border-border bg-white scrollbar-hide sticky top-0 z-40">
      <div className="flex items-center min-w-max px-4 md:px-8 gap-1">
        {SPORTS.map((sport) => {
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
              <SportIcon icon={sport.icon} size={15} />
              {sport.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
