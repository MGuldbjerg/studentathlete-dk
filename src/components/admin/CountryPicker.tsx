"use client";

import { usePathname } from "next/navigation";

/**
 * Landevælgeren øverst i admin.
 *
 * Klientkomponent alene for at kende den aktuelle sti, så valget lander samme
 * sted som man stod. Selve skiftet er et link til /api/admin/land — ingen
 * fetch, ingen state.
 */
export function CountryPicker({
  countries,
  active,
}: {
  countries: { code: string; brand: string }[];
  active: string;
}) {
  const pathname = usePathname() || "/admin";
  if (countries.length < 2) return null;

  return (
    <div className="border-b border-border bg-paper">
      <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-2 text-sm">
        <span className="text-muted">Redigerer:</span>
        {countries.map((c) => {
          const isActive = c.code === active;
          return (
            <a
              key={c.code}
              href={`/api/admin/land?code=${c.code}&next=${encodeURIComponent(pathname)}`}
              aria-current={isActive ? "true" : undefined}
              className={
                isActive
                  ? "px-2.5 py-1 rounded-md font-semibold text-white"
                  : "px-2.5 py-1 rounded-md border border-border text-ink hover:bg-surface transition-colors"
              }
              style={isActive ? { backgroundColor: "#00205B" } : undefined}
            >
              {c.brand}
            </a>
          );
        })}
      </div>
    </div>
  );
}
