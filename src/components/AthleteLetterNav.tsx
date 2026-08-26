/**
 * Alfabet-navigationen over atlet-listen.
 *
 * Bogstaver UDEN atleter er tekst, ikke links. Det er ikke kosmetik: et link
 * til en tom side er en soft-404 for Google, og den slags trækker et i forvejen
 * ungt site ned. Læseren får samtidig at vide hvad der findes, uden at klikke.
 */
import Link from "next/link";
import { t } from "@/lib/i18n";
import { getAthleteLetterUrl } from "@/lib/athlete-letters";
import { routePath } from "@/lib/i18n";

export function AthleteLetterNav({
  alphabet,
  counts,
  active,
  lang,
}: {
  alphabet: string[];
  counts: Map<string, number>;
  /** Nuværende bogstav, eller null på den fulde oversigt. */
  active: string | null;
  lang: string;
}) {
  return (
    <nav aria-label={t("athletes.letter_nav_label", lang)} className="mb-8">
      <p className="text-xs text-muted mb-2">{t("athletes.letter_nav_label", lang)}</p>
      <ul className="flex flex-wrap gap-1.5">
        <li>
          <Link
            href={routePath("athletes", lang)}
            aria-current={active === null ? "page" : undefined}
            className={`inline-flex min-w-9 items-center justify-center rounded-md border px-2.5 py-1.5
                        text-sm font-semibold transition-colors ${
                          active === null
                            ? "border-transparent text-white"
                            : "border-border bg-paper text-ink hover:bg-surface"
                        }`}
            style={active === null ? { backgroundColor: "#00205B" } : undefined}
          >
            {t("athletes.letter_all", lang)}
          </Link>
        </li>

        {alphabet.map((letter) => {
          const n = counts.get(letter) ?? 0;
          const isActive = letter === active;

          if (n === 0) {
            return (
              <li key={letter}>
                <span
                  aria-disabled="true"
                  className="inline-flex min-w-9 items-center justify-center rounded-md border
                             border-border bg-surface px-2.5 py-1.5 text-sm font-semibold text-muted
                             opacity-50"
                >
                  {letter}
                </span>
              </li>
            );
          }

          return (
            <li key={letter}>
              <Link
                href={getAthleteLetterUrl(letter, lang)}
                aria-current={isActive ? "page" : undefined}
                title={t("athletes.letter_count", lang, { n: String(n) })}
                className={`inline-flex min-w-9 items-center justify-center rounded-md border px-2.5 py-1.5
                            text-sm font-semibold transition-colors ${
                              isActive
                                ? "border-transparent text-white"
                                : "border-border bg-paper text-ink hover:bg-surface"
                            }`}
                style={isActive ? { backgroundColor: "#00205B" } : undefined}
              >
                {letter}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
