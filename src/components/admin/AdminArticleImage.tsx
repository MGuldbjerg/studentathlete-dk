import type { Article } from "@/lib/types";
import { articleHero } from "@/lib/article-photo";
import { PhotoCredit } from "@/components/ui/PhotoCredit";
import { countryProfile } from "@/lib/countries";

/**
 * The image readers will get with this article (migration 085): the school's
 * photo with its credit — on the page, as the share image and in the social
 * posts — or a note that the generated match card is used. Shown on the edit
 * page, the preview and the source check, so the image is checked with the text.
 */
export function AdminArticleImage({ article, className = "" }: { article: Article; className?: string }) {
  const hero = articleHero(article);
  const lang = countryProfile(article.country ?? undefined).language;
  return (
    <section className={`rounded border border-border bg-white p-3 ${className}`}>
      <p className="text-xs font-semibold text-muted mb-2">
        {hero.credit ? "Billede (side, delekort og sociale medier)" : "Billede: genereret kampkort"}
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={hero.src} alt="" className="w-full h-auto max-h-96 object-contain bg-surface" />
      {hero.credit && <PhotoCredit className="text-xs text-muted mt-2" {...hero.credit} lang={lang} />}
      {article.photo_url && !hero.credit && (
        <p className="text-xs text-red-700 mt-2">
          Artiklen har et foto, men skolen tillader ikke fotos (eller mangler) — kortet bruges.
        </p>
      )}
    </section>
  );
}
