import { notFound } from "next/navigation";
import Link from "next/link";
import { getStyleCorrections, getStyleSuggestions } from "@/lib/admin";
import { StilguideClient } from "./StilguideClient";

export default async function StilguidePage() {

  const [corrections, suggestions] = await Promise.all([
    getStyleCorrections(),
    getStyleSuggestions(),
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-ink">Stilguide</h1>
          <Link
            href={`/admin`}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Tilbage
          </Link>
        </div>

        <p className="text-sm text-muted mb-6">
          Redaktionelle rettelser der automatisk injiceres i system-prompten ved artikelgenerering.
          Systemet lærer af dine rettelser, så de samme fejl ikke gentages.
        </p>

        <StilguideClient
          initialCorrections={corrections}
          initialSuggestions={suggestions}

        />
      </div>
    </main>
  );
}
