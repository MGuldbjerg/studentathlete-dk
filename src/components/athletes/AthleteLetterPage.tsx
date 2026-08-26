/**
 * Bogstavsiden: alle atleter hvis navn begynder med ét bogstav.
 *
 * Findes fordi /atleter viste 2.343 links på én side — tungt for læseren og et
 * svagt knudepunkt for Google, der ikke har anden vej ind til profilerne.
 * Siden har sin egen overskrift, sin egen indledning og sit eget alfabet, så
 * den kan stå alene i et søgeresultat.
 */
import Link from "next/link";
import type { Athlete } from "@/lib/types";
import { t, routePath } from "@/lib/i18n";
import { CardGrid } from "./AthleteCardGrid";
import { AthleteLetterNav } from "@/components/AthleteLetterNav";

export function AthleteLetterPage({
  letter,
  athletes,
  counts,
  alphabet,
  lang,
}: {
  letter: string;
  athletes: Athlete[];
  counts: Map<string, number>;
  alphabet: string[];
  lang: string;
}) {
  return (
    <main className="max-w-5xl mx-auto px-4 md:px-8 py-10">
      <p className="mb-4 text-sm">
        <Link href={routePath("athletes", lang)} className="text-muted hover:text-ink hover:underline">
          ← {t("athletes.letter_back", lang)}
        </Link>
      </p>

      <h1
        className="text-3xl font-bold text-ink mb-2"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {t("athletes.letter_h1", lang, { letter })}
      </h1>
      <p className="text-muted text-sm mb-4">
        {t("athletes.letter_count", lang, { n: String(athletes.length) })}
      </p>
      <p className="text-ink text-sm mb-8 max-w-2xl">
        {t("athletes.letter_intro", lang, { letter })}
      </p>

      <AthleteLetterNav alphabet={alphabet} counts={counts} active={letter} lang={lang} />

      {/* Ingen tom-tilstand: ruten 404'er et bogstav uden atleter. */}
      <CardGrid athletes={athletes} lang={lang} />
    </main>
  );
}
