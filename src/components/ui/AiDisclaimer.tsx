import Link from "next/link";

/**
 * Ai-ansvarsfraskrivelse der vises i bunden af hver artikel.
 * Oplyser at artiklen er skrevet af Ai og gennemlæst af et menneske,
 * og linker til siden der forklarer, hvordan vi bruger Ai.
 */
export function AiDisclaimer() {
  return (
    <aside
      className="mt-8 px-5 py-4 border-l-[3px] bg-surface/50 text-sm text-muted leading-relaxed"
      style={{ borderLeftColor: "#BF0A30" }}
    >
      Denne artikel er skrevet af kunstig intelligens og gennemlæst af et
      menneske før udgivelse.{" "}
      <Link
        href="/ai-brug"
        className="text-ink hover:underline decoration-flag-red"
      >
        Sådan bruger vi Ai
      </Link>
      .
    </aside>
  );
}
