import type { Metadata } from "next";
import Link from "next/link";
import { BASE_URL } from "@/lib/seo";
import { LeadForm } from "./LeadForm";

/**
 * "Spil i USA" — landingsside for unge atleter (og forældre) der drømmer om
 * college-sport. Formularens leads gemmes med attribution (NSSA-forberedelse,
 * se migration-028). Indholdet er evergreen og linker til viden-guiderne.
 *
 * OFFLINE (Mikkel, 2026-07-03): mappen er underscore-privat (_spil-i-usa) indtil
 * NSSA-sporet genoptages. GENAKTIVERING: omdøb `_spil-i-usa` -> `spil-i-usa` OG
 * `api/_lead` -> `api/lead`, og sæt /ig- + admin-tekstlinks tilbage. Migration-028
 * (leads-tabellen) og admin -> Leads er stadig live.
 */
export const metadata: Metadata = {
  title: "Spil i USA — sådan kommer du i gang | StudentAthlete.dk",
  description:
    "Drømmer du om at kombinere din sport med en uddannelse i USA? Læs hvordan college-sport fungerer, og skriv til os — vi hjælper dig videre.",
  alternates: { canonical: `${BASE_URL}/spil-i-usa` },
  robots: { index: true, follow: true },
};

export default function SpilIUsaPage() {
  return (
    <main className="min-h-screen bg-surface">
      <article className="max-w-2xl mx-auto px-4 py-12">
        <h1
          className="text-3xl md:text-4xl font-bold text-ink mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Spil i USA
        </h1>
        <p className="text-lg text-muted leading-relaxed mb-8">
          Hvert år kombinerer over 100 danskere deres sport med en uddannelse på et
          amerikansk universitet — vi dækker dem hver uge. Drømmer du om det samme,
          er her de rigtige første skridt.
        </p>

        <h2
          className="text-2xl font-bold text-ink mt-10 mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Start med at forstå systemet
        </h2>
        <ul className="list-disc pl-6 mb-8 space-y-2 text-base text-ink leading-relaxed">
          <li>
            <Link href="/viden/hvad-er-ncaa" className="underline hover:text-flag-blue">
              Hvad er NCAA?
            </Link>{" "}
            — den store sammenslutning bag amerikansk college-sport
          </li>
          <li>
            <Link href="/viden/ncaa-divisioner" className="underline hover:text-flag-blue">
              Divisionerne
            </Link>{" "}
            — D1, D2 og D3 er meget forskellige veje
          </li>
          <li>
            <Link href="/viden/akademiske-krav" className="underline hover:text-flag-blue">
              De akademiske krav
            </Link>{" "}
            — karakterer og tests tæller lige så meget som sporten
          </li>
          <li>
            <Link href="/viden/redshirt-og-eligibility" className="underline hover:text-flag-blue">
              Spilleberettigelse
            </Link>{" "}
            — reglerne for hvor længe du kan konkurrere
          </li>
        </ul>

        <h2
          className="text-2xl font-bold text-ink mt-10 mb-4"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Skriv til os
        </h2>
        <p className="text-base text-ink leading-relaxed mb-6">
          Fortæl os hvem du er, og hvad du går efter. Vi svarer alle henvendelser og
          peger dig i den rigtige retning — og følger vi allerede danskere i din
          sportsgren, kan du se, hvilke skoler der har taget danskere ind før.
        </p>

        <LeadForm />
      </article>
    </main>
  );
}
