/**
 * Kildeboks der vises i bunden af artikler.
 * Linker til den originale kilde for transparens.
 */

interface SourceBoxProps {
  sourceUrl: string | null | undefined;
}

export function SourceBox({ sourceUrl }: SourceBoxProps) {
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
        Kilde
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
