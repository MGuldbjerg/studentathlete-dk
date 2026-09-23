import type { Article, Athlete, School } from "./types";
import { dbSportToUrlSlug } from "./types";
import { countryProfile } from "./countries";
import type { CountryProfile } from "./countries/types";
import { siteBaseUrl } from "./site";
import { sportLabel, t, languagePack, routePath } from "./i18n";
import { cardAssetPath, genericAssetPath, genericQuery } from "./og-static";

/**
 * Standardsitets base-URL. Værten står ét sted — landeprofilen — så et nyt site
 * er en profilfil, ikke en jagt efter hardkodede domæner.
 *
 * Til absolutte URL'er i en request-kontekst med flere sites: brug
 * `siteBaseUrl(siteFromHost(host))`, som giver det site læseren faktisk er på.
 */
export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? siteBaseUrl(countryProfile());

export function getReadingTime(content: string): number {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(wordCount / 200));
}

/**
 * Meta-beskrivelser: artiklens egne ord, aldrig en skabelon.
 * ===========================================================================
 *
 * Målt 2026-09-14: **17 af 27 danske artikler havde ingen `summary`** og faldt
 * derfor tilbage på «Læs om {navn} på {brand}» — den samme sætning på hver af
 * dem, uden ét ord om hvad artiklen handler om. Samtidig var **55 af 67
 * britiske manchetter længere** end det Google viser, så de blev klippet midt
 * i et ord.
 *
 * Begge dele har samme svar: manchetten hvis den findes, ellers artiklens eget
 * første afsnit — og altid klippet ved en sætning, ellers ved et ord.
 *
 * `summary` bliver IKKE ændret. Feltet er også artiklens synlige manchet, hvor
 * der ikke er nogen længdegrænse; det er kun meta-tagget der har en. Derfor er
 * det her en visningsregel og ikke en migrering: den gælder med det samme for
 * alle artikler, også dem der bliver skrevet i morgen, og den kan ikke komme
 * til at overskrive noget et menneske har godkendt.
 */
export const META_DESCRIPTION_MAX = 155;

/** Markdown og HTML ud — en meta-tag viser tegnene råt. */
function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")      // billeder
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")    // links → deres tekst
    .replace(/<[^>]+>/g, " ")                   // html (kladde #253 skrev <br><br>)
    .replace(/[*_`]{1,3}/g, "")                 // fed, kursiv, kode
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Første afsnit der faktisk er brødtekst.
 *
 * Overskrifter springes over: en artikel der åbner med «## Weekendens kampe»
 * skal ikke have den linje som beskrivelse. Det samme gælder citatblokke og
 * vandrette streger — de siger intet om indholdet.
 */
function firstProseBlock(content: string): string {
  for (const block of content.split(/\n\s*\n/)) {
    const line = block.trim();
    if (!line || /^(#{1,6}\s|>|[-*_]{3,}$|\|)/.test(line)) continue;
    const text = plainText(line);
    if (text) return text;
  }
  return "";
}

/**
 * Klip til grænsen — helst efter en sætning, ellers efter et helt ord.
 *
 * Et afsnit på to sætninger, hvor kun den første er inden for grænsen, giver
 * en beskrivelse der slutter naturligt. Rækker ikke engang den første sætning,
 * klippes der ved sidste hele ord og der sættes ellipse. Det sidste værn er
 * ét ord længere end hele grænsen: så bliver det et hårdt klip, for en tom
 * beskrivelse er værre end en afkortet.
 */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;

  const window = text.slice(0, max);
  const sentenceEnd = Math.max(
    window.lastIndexOf(". "),
    window.lastIndexOf("! "),
    window.lastIndexOf("? "),
  );
  // Halvdelen: en beskrivelse på ét kort indskud siger mindre end en afkortet
  // sætning, så en meget tidlig sætningsgrænse bruges ikke.
  if (sentenceEnd > max * 0.5) return window.slice(0, sentenceEnd + 1).trim();

  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace > 0) return `${window.slice(0, lastSpace).trim()}…`;
  return window.trim();
}

/**
 * Artiklens meta-beskrivelse, eller `null` hvis den ikke har ét brugbart ord.
 * Kalderen bestemmer selv hvad der så skal ske — teksten her er altid
 * artiklens egen.
 */
export function metaDescription(
  article: { summary?: string | null; content?: string | null },
): string | null {
  const summary = plainText(article.summary ?? "");
  if (summary) return clamp(summary, META_DESCRIPTION_MAX);

  const body = firstProseBlock(article.content ?? "");
  return body ? clamp(body, META_DESCRIPTION_MAX) : null;
}

/**
 * Datoer er læservendte — og derfor sprogbestemte.
 *
 * Her stod `"da-DK"` hårdkodet, så det britiske site skrev «19. august 2026».
 * Locale'en ligger i sprogpakken (`da-DK` / `en-GB`), præcis som navne og
 * slugs gør. `lang` er påkrævet: en glemt parameter må ikke kunne blive til
 * dansk på et engelsk site (se `LÆSERVENDT.md`).
 */
export function formatDate(
  dateStr: string | null,
  lang: string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  }
): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString(languagePack(lang).locale, options);
}

export function formatDateShort(dateStr: string | null, lang: string): string {
  return formatDate(dateStr, lang, { day: "numeric", month: "short", year: "numeric" });
}

export function formatRelativeTime(dateStr: string | null, lang: string): string {
  if (!dateStr) return "";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return t("time.now", lang);
  if (diffMin < 60) return t("time.minutes_ago", lang, { n: diffMin });
  if (diffHours < 24) return t("time.hours_ago", lang, { n: diffHours });
  if (diffDays < 7) return t("time.days_ago", lang, { n: diffDays });
  return formatDate(dateStr, lang, { day: "numeric", month: "short" });
}

// ─── URL-hjælpere ────────────────────────────────────────────────────────────

/**
 * Synligt cover for en artikel: rigtigt foto hvis sat, ellers genereret
 * kampkort (skolefarve + piktogram + score fra faktaarket). Gamle meta-OG-URLs
 * i cover_image_url ignoreres (de er ikke kampkort).
 */
// Bump ved design-ændringer i kampkortet — buster edge-cachen (s-maxage 7 dage)
// OG matcher pre-render-nøglen i card_blobs (migration-029): pipeline-rendrede
// 1200×630-kort gemmes som `card-{id}-v{CARD_VERSION}` og serveres af /api/og
// før on-the-fly-fallbacket (600×315 — fuldsize on-the-fly (v6) sprængte
// free-plan CPU). R2 var førstevalget men kræver dashboard-aktivering af
// R2 på kontoen (fejl 10042) → D1-blobs, samme resultat på $0.
// v9 (2026-08-30): kortene er WebP i stedet for PNG. Formatskiftet SKAL have
// et versionsbump — nøglen i card_blobs og adressen i /api/og deler dette tal,
// og uden bumpet serverer Cloudflares kant den gamle PNG i op til en uge
// (s-maxage=604800), uanset hvad der ligger i basen.
export const CARD_VERSION = 9;

/** Nøgle i card_blobs for et pre-rendret kampkort (delt mellem Worker og pipeline). */
export function cardBlobKey(articleId: number): string {
  return `card-${articleId}-v${CARD_VERSION}`;
}

/**
 * Nøgle for Instagram-kortet — 1080×1350 JPEG, eget lærred (se CARD_FORMATS).
 *
 * Egen nøgle og ikke en variant af `cardBlobKey`, fordi de to kort har hver sin
 * livscyklus: delekortet skal findes FØR et opslag kan komme ud af social-køen
 * (`cardReadyClause`), mens IG-kortet kun bremser Instagram-kanalen.
 */
export function igCardBlobKey(articleId: number): string {
  return `ig-${articleId}-v${CARD_VERSION}`;
}

/**
 * Instagram-kortets offentlige adresse.
 *
 * Den SKAL være offentligt hentbar: Meta henter billedet selv ud fra `image_url`
 * når containeren oprettes — vi uploader ikke bytes. (Og derfor er /api/ i
 * robots.txt en fælde her på samme måde som ved Facebooks OG-scrape 18-08.)
 */
export function getArticleIgCardUrl(article: Pick<Article, "id">): string {
  return `/api/og?type=ig&article=${article.id}&v=${CARD_VERSION}`;
}

/**
 * Cover til lister/karrusel/thumbnails er ALTID det genererede 16:9 kampkort:
 * ensartede dimensioner + skarpt på store skærme. Rigtige profilfotos (typisk
 * portræt-headshots i lav opløsning) vises KUN på atletprofilen og inde i
 * artiklen — som listevisnings-cover ødelagde de kort-formatet, så
 * cover_image_url bruges bevidst ikke her.
 */
export function getArticleCoverUrl(article: Pick<Article, "id">): string {
  // Static file first (no Worker, no CPU); the query string is what /api/og
  // needs if the file is not in the build yet. See src/lib/og-static.ts.
  return `${cardAssetPath(article.id, CARD_VERSION)}?type=card&article=${article.id}&v=${CARD_VERSION}`;
}

/**
 * Artiklens adresse på SITETS sprog: `/football/…` på .co.uk, `/fodbold/…` på .dk.
 *
 * `lang` er ikke valgfri i praksis — udelades den, får man standardsitets slug,
 * og så stod britiske artikler på danske adresser (rettet 2026-08-21). Kalderen
 * kender altid sproget: server-komponenter via `currentLanguage()`, klient- og
 * skabelonkomponenter får det ind som prop (samme regel som for oversatte
 * strenge), og pipelinen via landeprofilen.
 */
export function getArticleUrl(article: Pick<Article, "slug" | "sport">, lang: string): string {
  const sport = dbSportToUrlSlug(article.sport ?? "sport", lang);
  return `/${sport}/${article.slug}`;
}

export function getAthleteUrl(slug: string, lang: string): string {
  return `${routePath("athletes", lang)}/${slug}`;
}

export function getSchoolUrl(slug: string, lang: string): string {
  return `${routePath("schools", lang)}/${slug}`;
}

/** Guide-siden (viden/guides) på sitets sprog. */
export function getGuideUrl(slug: string, lang: string): string {
  return `${routePath("guides", lang)}/${slug}`;
}

// ─── OG-billeder ─────────────────────────────────────────────────────────────

/**
 * Bump when the generic OG design in /api/og changes. The version is part of
 * the static file name, so old files stop being referenced at once.
 */
export const GENERIC_OG_VERSION = 1;

export function getOgImageUrl(params: {
  title: string;
  subtitle?: string;
  sport?: string | null;
  type?: "article" | "athlete" | "sport";
}): string {
  // Static file, pre-rendered at deploy by pipeline/render/export-og-assets.ts.
  // A miss falls through to /api/og with this same query string.
  const p = { ...params, version: GENERIC_OG_VERSION };
  const url = new URL(genericAssetPath(p), BASE_URL);
  url.search = genericQuery(p).toString();
  return url.toString();
}

/**
 * The OG parameters for an athlete WITHOUT a photo. One function, because the
 * deploy-time export must compute the exact same file name as the page does —
 * a mismatch would not break anything, but every image would silently fall
 * back to the Worker again.
 */
export function athleteOgParams(
  athlete: Pick<Athlete, "name" | "university" | "sport">,
  lang: string,
): Parameters<typeof getOgImageUrl>[0] {
  return {
    title: athlete.name,
    subtitle: `${athlete.university} · ${sportLabel(athlete.sport, lang)}`,
    sport: athlete.sport,
    type: "athlete",
  };
}

// ─── JSON-LD structured data ─────────────────────────────────────────────────
//
// JSON-LD er det Google LÆSER — og indtil 2026-08-21 var hver eneste linje her
// dansk uanset site: absolutte URL'er på .dk (`BASE_URL`), `inLanguage: "da"`,
// `nationality: Denmark` på britiske atleter og "StudentAthlete.dk" i navnet.
// Derfor tager de nu sitet ind som argument. `site` er IKKE valgfri.

export function articleStructuredData(
  article: Article,
  athlete: Athlete | null | undefined,
  site: CountryProfile,
): object {
  const base = siteBaseUrl(site);
  const lang = site.language;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.summary ?? undefined,
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at,
    url: `${base}${getArticleUrl(article, lang)}`,
    image: article.cover_image_url
      ? [{ "@type": "ImageObject", url: article.cover_image_url }]
      : undefined,
    publisher: {
      "@type": "Organization",
      name: site.brand,
      url: base,
    },
    author: article.author
      ? { "@type": "Person", name: article.author }
      : { "@type": "Organization", name: site.brand },
    about: athlete
      ? {
          "@type": "Person",
          name: athlete.name,
          url: `${base}${getAthleteUrl(athlete.slug, lang)}`,
          sport: sportLabel(athlete.sport, lang),
          affiliation: { "@type": "CollegeOrUniversity", name: athlete.university },
        }
      : undefined,
    keywords: [article.sport, article.article_type, "student athlete", site.code.toLowerCase()]
      .filter(Boolean)
      .join(", "),
    inLanguage: lang,
  };
}

/**
 * Udgiver-identiteten: `Organization` + `WebSite` på forsiden.
 *
 * Artikler og profiler har haft fyldig schema hele tiden — det var de to
 * mest linkede sider på hvert site, forsiderne, der ingen havde (målt
 * 2026-09-14). Det er her Google henter hvem der udgiver, og det er
 * forudsætningen for et vidensfelt.
 *
 * De to sites er SØSKENDE, ikke oversættelser: DK dækker danske atleter, UK
 * dækker britiske, og de 2.879 atleter fordeler sig disjunkt mellem dem. Derfor
 * ingen `hreflang` og ingen fælles `Organization` med to `url` — hver udgiver
 * står for sig, præcis som `sameAs` ville have været forkert.
 *
 * `SearchAction` peger på forsidens egen søgning (`/?q=`), som den faktisk
 * virker — ikke på en søgeside vi ikke har.
 */
export function siteStructuredData(site: CountryProfile): object {
  const base = siteBaseUrl(site);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#organization`,
        name: site.brand,
        url: base,
        email: site.contactEmail,
      },
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        name: site.brand,
        url: base,
        inLanguage: site.language,
        publisher: { "@id": `${base}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${base}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function athleteStructuredData(
  athlete: Athlete,
  articles: Article[],
  site: CountryProfile,
): object {
  const base = siteBaseUrl(site);
  const lang = site.language;
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    name: `${athlete.name} – ${site.brand}`,
    url: `${base}${getAthleteUrl(athlete.slug, lang)}`,
    mainEntity: {
      "@type": "Person",
      name: athlete.name,
      sport: sportLabel(athlete.sport, lang),
      image: athlete.photo_url ?? undefined,
      description: athlete.profile_summary ?? undefined,
      affiliation: {
        "@type": "CollegeOrUniversity",
        name: athlete.university,
        address: { "@type": "PostalAddress", addressCountry: "US" },
      },
      homeLocation: athlete.hometown
        ? { "@type": "Place", name: athlete.hometown }
        : undefined,
      nationality: { "@type": "Country", name: site.nationalityName },
    },
    about: articles.map((a) => ({
      "@type": "NewsArticle",
      headline: a.title,
      url: `${base}${getArticleUrl(a, lang)}`,
    })),
    inLanguage: lang,
  };
}

export function schoolStructuredData(school: School, site: CountryProfile): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: school.name,
    url: school.website ?? `${siteBaseUrl(site)}${getSchoolUrl(school.slug, site.language)}`,
    address: school.state
      ? { "@type": "PostalAddress", addressRegion: school.state, addressCountry: "US" }
      : undefined,
    description: `${school.division}${school.conference ? ` – ${school.conference}` : ""}`,
  };
}

export function breadcrumbStructuredData(
  crumbs: { name: string; url: string }[]
): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
