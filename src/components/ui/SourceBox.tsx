/**
 * Kildeboks der vises i bunden af artikler.
 * Linker til den originale kilde for transparens.
 *
 * Overskriften stod hardkodet som «Kilde» og lå derfor på DANSK under hver
 * eneste britiske artikel, fra .co.uk gik live 5. august 2026 til den blev
 * fanget 29. august. Sproget er påkrævet — se regel 6 i ARKITEKTUR-motor.md.
 */
import { t } from "@/lib/i18n";

interface SourceBoxProps {
  sourceUrl: string | null | undefined;
  lang: string;
}

export function SourceBox({ sourceUrl, lang }: SourceBoxProps) {
  if (!sourceUrl) return null;

  // Vis domæne som label
  let domain: string;
  try {
    domain = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    domain = sourceUrl;
  }

  return (
    <div
      className="mt-8 px-5 py-4 border-l-[3px] bg-surface/50"
      style={{ borderLeftColor: "#00205B" }}
    >
      <p className="text-xs font-bold tracking-[0.15em] uppercase text-muted mb-1">
        {t("article.source", lang)}
      </p>
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-ink hover:underline decoration-flag-red break-all"
      >
        {domain}
        <span className="text-muted ml-1">↗</span>
      </a>
    </div>
  );
}
