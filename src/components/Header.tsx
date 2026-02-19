import { Suspense } from "react";
import { SearchBar } from "./SearchBar";

export function Header() {
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
        <a href="/" className="flex flex-col leading-none">
          <span
            className="text-xl md:text-2xl font-bold text-white tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            StudentAthlete
            <span style={{ color: "#BF0A30" }}>.dk</span>
          </span>
          <span className="text-white/50 text-xs tracking-widest uppercase">
            Dansk dækning af student athletes
          </span>
        </a>

        {/* Desktop søgefelt i header */}
        <div className="hidden md:block w-full max-w-sm">
          <Suspense fallback={null}>
            <SearchBar />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
