"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SPORTS } from "@/lib/types";

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
    params.delete("side"); // nulstil pagination ved kategori-skift
    router.push(`/?${params.toString()}`);
  }

  return (
    <nav className="w-full overflow-x-auto border-b border-border bg-white">
      <div className="flex items-center min-w-max px-4 md:px-8">
        {SPORTS.map((sport) => {
          const isActive = activeSport === sport.slug;
          return (
            <button
              key={sport.slug}
              onClick={() => handleClick(sport.slug)}
              className="relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors"
              style={{
                color: isActive ? "#00205B" : "#666666",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {sport.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: "#BF0A30" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
