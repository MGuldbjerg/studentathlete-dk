export function Footer() {
  return (
    <footer style={{ backgroundColor: "#00205B" }} className="mt-16">
      {/* Rød streg øverst i footer */}
      <div className="h-1 w-full" style={{ backgroundColor: "#BF0A30" }} />

      <div className="px-6 md:px-12 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Om siden */}
        <div>
          <h4
            className="text-white font-bold text-lg mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            StudentAthlete<span style={{ color: "#BF0A30" }}>.dk</span>
          </h4>
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
          <ul className="space-y-1.5">
            {["Football", "Basketball", "Baseball", "Atletik", "Svømning", "Fodbold"].map(
              (sport) => (
                <li key={sport}>
                  <a
                    href={`/?sport=${sport.toLowerCase()}`}
                    className="text-white/60 text-sm hover:text-white transition-colors"
                  >
                    {sport}
                  </a>
                </li>
              )
            )}
          </ul>
        </div>

        {/* Links */}
        <div>
          <h5 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
            Om os
          </h5>
          <ul className="space-y-1.5">
            <li>
              <a href="/om" className="text-white/60 text-sm hover:text-white transition-colors">
                Om StudentAthlete.dk
              </a>
            </li>
            <li>
              <a href="/kontakt" className="text-white/60 text-sm hover:text-white transition-colors">
                Kontakt
              </a>
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
