"use client";

import { useRouter, useSearchParams } from "next/navigation";
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
    default:
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></svg>;
  }
}

export function CategoryNav() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSport = searchParams.get("sport") ?? "";

  function handleClick(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) {
      params.set("sport", slug);
    } else {
      params.delete("sport");
    }
    params.delete("side");
    router.push(`/?${params.toString()}`);
  }

  return (
    <nav className="w-full overflow-x-auto border-b border-border bg-white scrollbar-hide">
      <div className="flex items-center min-w-max px-4 md:px-8 gap-1">
        {SPORTS.map((sport) => {
          const isActive = activeSport === sport.slug;
          const sportColor = sport.slug ? getSportColor(sport.slug) : "#00205B";
          return (
            <button
              key={sport.slug}
              onClick={() => handleClick(sport.slug)}
              className="relative flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition-colors"
              style={{
                color: isActive ? sportColor : "#888888",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {sport.slug && <SportIcon icon={sport.icon} size={15} />}
              {sport.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                  style={{ backgroundColor: sportColor }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
