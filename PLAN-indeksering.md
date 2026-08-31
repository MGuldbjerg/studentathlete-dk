# Plan: hurtigere indeksering (godkendt af Mikkel 2026-08-27)

Mikkel bad om «gratis links der peger på vores sites for at speede indeksering
op». Undersøgelsen ændrede forslaget, og planen her er den godkendte version.

## Hvad problemet ER

Search Console svarede **«URL is unknown to Google»** for .co.uk-profilerne
(2026-08-26). Forsiden er indekseret; profilerne er aldrig crawlet. Det er et
**opdagelses**-problem, ikke en kvalitetsdom — og eksterne links løser det
kun langsomt og indirekte, via crawl-budget på et tre uger gammelt domæne.

## Hvad vi IKKE gør

**Gratis link-kataloger og masseindsendelse.** Googles spampolitik regner
links fra den slags som link-spam: de ignoreres i bedste fald, og i værste
fald udløser de en manuel handling, som kræver disavow og fornyet gennemgang
at komme ud af. Downside uden upside. Et lille antal reelt redaktionelle,
relevante kataloger er i orden — men de flytter ikke 2.703 URLer.

## Hvad vi gør (godkendt: 1, 2 og 4)

**1. IndexNow ved udgivelse.** Bing, Yandex, Seznam, Naver og Yep tager imod
en direkte besked om en ny URL. Bing er ikke ligegyldigt: det er datagrundlag
for Copilot og ChatGPTs søgning, og vores trafik ER navnesøgninger.
Nøglefilen ligger i `public/`; pingen sker efter `publishArticle`.
→ `src/lib/indexnow.ts`, `announcePublishedArticle()` i `src/lib/admin.ts`.

**2. Engangs-indsendelse af hele sitemappet.** De eksisterende URLer er aldrig
annonceret nogen steder. Protokollen tager 10.000 pr. kald, så begge sites går
i én omgang hver. Dette ERSTATTER Bings separate URL Submission API — IndexNow
*er* indsendelsen til Bing, og kræver hverken konto eller API-nøgle.
→ `pipeline/report/indexnow-backfill.ts`

**4. Sitemap-hygiejne.** Gennemgået — og den var allerede i orden:
`lastModified` kommer fra `updated_at` (ikke `new Date()`), bogstavsider
udelades når de er tomme, og artikeladresser bygges med `getArticleUrl`.
Ingen ændring foretaget; se «Åbent» nedenfor for det ene hul der er tilbage.

## Det vigtige forbehold

**Google er ikke med i IndexNow**, og Googles Indexing API må kun bruges til
job-opslag og livestreams. For Google er **intern linkning og sitemap** fortsat
den eneste vej — knudepunkt-opdelingen af `/athletes` er dét greb, ikke dette.
Denne plan gør .co.uk synlig for alt ANDET end Google, hurtigt, og koster
ingenting. Den løser ikke Google-halvdelen, og det skal den ikke påstå.

## Åbent

- `staticPages`, `guidePages`, `sportPages` og `schoolPages` har intet
  `lastModified`. For skoler kræver det `updated_at` i `getAllSchoolSlugs`.
  Manglende lastmod er ikke skadeligt (Google vurderer selv), så det er
  bevidst ikke gjort som en del af denne plan.
- Google News Publisher Center: ikke undersøgt, kan være relevant for et
  nyhedssite. Kræver sin egen plan.
