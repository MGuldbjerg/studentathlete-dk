import type { Article } from "@/lib/types";
import { ArticleCard } from "@/components/ArticleCard";
import { archivePath } from "@/lib/routes";
import { currentLanguage } from "@/lib/site-server";
import { t } from "@/lib/i18n";

/**
 * BÅND B — lead + skinne.
 *
 * Asymmetrisk med vilje: ét stort kort med billede ved siden af rene
 * tekstrækker uden billede. Det er her forsiden første gang bryder med
 * "endnu en række ens kort", og skinnen koster ingen ekstra forespørgsel —
 * artiklerne kommer fra samme liste som resten af siden.
 *
 * Skinnen har bevidst INGEN tidsoverskrift ("Også i dag"): rækkerne er blot de
 * næste artikler i rækkefølgen og kan sagtens være fra i går.
 */
export async function LeadBand({ lead, rail }: { lead: Article; rail: Article[] }) {
  const lang = await currentLanguage();
  return (
    <section className="grid md:grid-cols-[1.9fr_1fr] border-b border-border">
      <div className="border-b md:border-b-0 md:border-r border-border">
        <ArticleCard article={lead} variant="lead" />
      </div>

      <div className="flex flex-col">
        {rail.map((a) => (
          <ArticleCard key={a.id} article={a} variant="compact" />
        ))}
        <a
          href={archivePath(lang)}
          data-track="internal"
          className="block mt-auto px-4 md:px-8 py-4 border-t border-border text-sm font-semibold hover:bg-surface transition-colors"
          style={{ color: "#00205B" }}
        >
          {t("home.see_all_articles", lang)} →
        </a>
      </div>
    </section>
  );
}
