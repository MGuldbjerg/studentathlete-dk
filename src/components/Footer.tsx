import Link from "next/link";

export function Footer() {
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
            Danmarks dedikerede medie for danske student athletes i USA.
            Vi dækker profiler, nyheder og sæsonopdateringer.
          </p>
        </div>

        {/* Sportsgrene */}
        <div>
          <h5 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
            Sportsgrene
          </h5>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {[
              { label: "Football", slug: "football" },
              { label: "Basketball", slug: "basketball" },
              { label: "Baseball", slug: "baseball" },
              { label: "Fodbold", slug: "fodbold" },
              { label: "Svømning", slug: "svoemning" },
              { label: "Atletik", slug: "atletik" },
              { label: "Golf", slug: "golf" },
              { label: "Tennis", slug: "tennis" },
              { label: "Roning", slug: "roning" },
              { label: "Gymnastik", slug: "gymnastik" },
              { label: "Ishockey", slug: "ishockey" },
              { label: "Volleyball", slug: "volleyball" },
            ].map((sport) => (
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
