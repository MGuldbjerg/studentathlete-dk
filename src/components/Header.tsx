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
        <a href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-white.svg"
            alt="StudentAthlete.dk"
            className="h-8 md:h-10 w-auto"
          />
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
