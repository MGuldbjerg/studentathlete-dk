/**
 * The hero of an article page: the school's photo when the article has one and
 * the school still allows photos, else the generated match card.
 *
 * Pure, so the gate and the credit are testable without a DOM. The permission is
 * read at render time (migration 085), so a school that declines later loses the
 * photo on the next render — the same rule as athlete photos (photo-permission.ts).
 */
import type { Article } from "./types";
import { photoAllowed } from "./photo-permission";
import { creditedSchoolName, safeSourceUrl, type PhotoCreditInput } from "./photo-credit";
import { getArticleCoverUrl } from "./seo";

/** The article fields this needs; the photo_* columns come from ARTICLE_SELECT. */
export type ArticlePhotoFields = Pick<Article, "id" | "card_ready"> & {
  photo_url?: string | null;
  photo_photographer?: string | null;
  photo_school?: string | null;
  photo_source_url?: string | null;
  /** schools.photo_permission of photo_school, joined at read time. */
  photo_school_permission?: string | null;
  /** schools.common_name of photo_school — the name the credit uses. */
  photo_school_common_name?: string | null;
};

export interface ArticleHero {
  src: string;
  /** Credit props for <PhotoCredit>, or null for the generated card (no credit). */
  credit: Omit<PhotoCreditInput, "lang"> | null;
}

export function articleHero(article: ArticlePhotoFields): ArticleHero {
  const src = safeSourceUrl(article.photo_url);
  const school = (article.photo_school ?? "").trim();
  // A photo without a known rights holder is never shown: there is no one to credit.
  if (src && school && photoAllowed(article.photo_school_permission)) {
    const credited = creditedSchoolName(school, article.photo_school_common_name);
    return {
      src,
      credit: {
        photographer: article.photo_photographer ?? null,
        schoolName: credited,
        schoolNames: { official: school, credited },
        sourceUrl: article.photo_source_url ?? null,
      },
    };
  }
  return { src: getArticleCoverUrl(article), credit: null };
}
