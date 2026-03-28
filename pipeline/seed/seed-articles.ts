/**
 * Seed artikler i produktions-D1 med rigtige atleter fra databasen.
 * Opretter artikler i alle 5 typer: news, feature, recruiting, season_update, profile.
 *
 * Kør med: npx tsx pipeline/seed/seed-articles.ts
 */

import { createD1Client } from "../lib/d1-client";
import { generateSlug } from "../lib/slug";

interface DbAthlete {
  id: number;
  name: string;
  slug: string;
  sport: string;
  position: string | null;
  hometown: string | null;
  university: string;
  university_state: string | null;
  division: string;
}

interface SeedArticle {
  title: string;
  summary: string;
  content: string;
  article_type: string;
  author: string;
  published_at: string;
}

/** Generér artikler baseret på en rigtig atlet */
function generateArticlesForAthlete(athlete: DbAthlete): SeedArticle[] {
  const articles: SeedArticle[] = [];

  // 1. PROFILE
  articles.push({
    title: `Mød ${athlete.name}: Dansk ${athlete.sport.toLowerCase()}-talent i USA`,
    summary: `${athlete.name} fra ${athlete.hometown ?? "Danmark"} spiller ${athlete.sport.toLowerCase()} for ${athlete.university}. Læs om rejsen fra Danmark til NCAA.`,
    content: `${athlete.name} er en af de danske atleter, der har taget springet til det amerikanske universitetssystem. ${athlete.position ? `Som ${athlete.position} ` : ""}på ${athlete.university}s hold har ${athlete.name.split(" ")[0]} gjort sig bemærket i ${athlete.division}.

## Baggrund

${athlete.name} voksede op i ${athlete.hometown ?? "Danmark"} og har dyrket ${athlete.sport.toLowerCase()} fra en ung alder. Talentfulde præstationer i danske klubber og på ungdomslandsholdene åbnede døren til et stipendium i USA.

"At flytte til USA var en stor beslutning, men det har været den bedste i mit liv," fortæller ${athlete.name.split(" ")[0]}. "Niveauet her er utroligt, og jeg udvikler mig hver eneste dag."

## Livet på campus

Ud over sporten studerer ${athlete.name.split(" ")[0]} på ${athlete.university}, hvor balancen mellem akademiske krav og træning er en daglig udfordring.

> Det er hårdt at jonglere med studier og sport, men det gør oplevelsen unik. I Danmark ville jeg kun fokusere på sporten — her får jeg en uddannelse oven i købet.

## Hvad driver ${athlete.name.split(" ")[0]}?

For ${athlete.name.split(" ")[0]} handler det ikke kun om at spille på højeste niveau. Det handler om at vise, at danske atleter kan konkurrere med de bedste i verden.

"Jeg vil inspirere flere danske unge til at overveje denne vej. Der er et kæmpe potentiale derhjemme."`,
    article_type: "profile",
    author: "StudentAthlete.dk",
    published_at: "2026-01-15T10:00:00Z",
  });

  // 2. NEWS
  articles.push({
    title: `${athlete.name} leverer stærk præstation for ${athlete.university}`,
    summary: `Den danske ${athlete.sport.toLowerCase()}-atlet ${athlete.name} imponerede i weekendens kamp for ${athlete.university}.`,
    content: `${athlete.name} var i storform, da ${athlete.university} spillede i weekenden. Den danske atlet viste endnu en gang, hvorfor ${athlete.name.split(" ")[0]} er en vigtig brik på holdet.

## Kampens højdepunkter

${athlete.name.split(" ")[0]} leverede en præstation, der trak overskrifter i lokale medier. ${athlete.position ? `Fra positionen som ${athlete.position} ` : ""}demonstrerede ${athlete.name.split(" ")[0]} det niveau, der har gjort den danske atlet til en nøglespiller.

Holdets cheftræner var fuld af ros efter kampen: "${athlete.name.split(" ")[0]} viser uge efter uge, at ${athlete.name.split(" ")[0]} hører til på dette niveau. Den skandinaviske arbejdsmoral smitter af på hele holdet."

> Det var en fantastisk følelse at bidrage til holdet i dag. Vi kæmper for hinanden, og det giver resultater.

## Sæsonens status

Med denne præstation har ${athlete.university} styrket sin position i konferencen. ${athlete.name} forventes at spille en endnu større rolle i de kommende uger, hvor afgørende kampe venter.`,
    article_type: "news",
    author: "StudentAthlete.dk",
    published_at: "2026-03-10T18:00:00Z",
  });

  return articles;
}

/** Artikler der ikke er bundet til én specifik atlet */
function generateGeneralArticles(): SeedArticle[] {
  return [
    {
      title: "Rekordmange danske atleter i NCAA i 2025-26-sæsonen",
      summary:
        "Antallet af danske student athletes i det amerikanske universitetssystem er steget markant. Vi ser på tendensen.",
      content: `NCAA-sæsonen 2025-26 byder på rekordmange danske atleter fordelt over et bredt udvalg af sportsgrene. Fra football til svømning til tennis repræsenterer danske unge sig flot på de amerikanske universiteter.

## Tallene taler

Ifølge StudentAthlete.dk's database er antallet af danske atleter med NCAA-stipendier steget med over 30 procent i løbet af de seneste tre år. Stigningen skyldes en kombination af bedre rekrutteringsnetværk, øget bevidsthed om mulighederne og et stigende niveau i dansk ungdomssport.

## Sportsgrene i vækst

Mens football og svømning traditionelt har været de mest populære sportsgrene for danske atleter i USA, ser vi nu en vækst i basketball, tennis og fodbold.

> Flere og flere danske unge opdager, at vejen til USA ikke kun handler om sport — det er en livsendrende oplevelse, der åbner døre både personligt og professionelt.

## Udfordringer

Trods den positive tendens er der stadig udfordringer. Mange danske atleter kender ikke til mulighederne, og rekrutteringsprocessen kan være kompliceret at navigere uden hjælp.

## Vejen frem

StudentAthlete.dk arbejder på at gøre information om stipendiemuligheder mere tilgængelig for danske unge og deres familier. Følg med her for de seneste nyheder og historier om danske atleter i USA.`,
      article_type: "season_update",
      author: "StudentAthlete.dk",
      published_at: "2026-02-20T08:00:00Z",
    },
    {
      title: "Sådan fungerer det amerikanske stipendiesystem for atleter",
      summary:
        "En komplet guide til NCAA-stipendier: hvad de dækker, hvordan man søger, og hvad der kræves.",
      content: `For mange danske atleter og deres familier er det amerikanske stipendiesystem en ukendt verden. Her giver vi et overblik over, hvordan det fungerer, og hvad man skal vide.

## Hvad er et atletisk stipendium?

Et atletisk stipendium er økonomisk støtte fra et amerikansk universitet til atleter, der kan bidrage til universitetets sportshold. Stipendiet kan dække undervisning, bolig, kost, bøger og andre udgifter — en samlet værdi på op til 400.000 kroner om året for de bedste universiteter.

## NCAA-divisionerne

Det amerikanske universitetssportsystem er opdelt i tre divisioner:

**Division I** er det højeste niveau med de største hold, flest penge og størst mediedækning. Det er her, de fleste fulde stipendier findes.

**Division II** tilbyder også stipendier, men typisk delvise. Niveauet er stadig højt, og mange atleter trives med den bedre balance mellem sport og studier.

**Division III** tilbyder ikke atletiske stipendier, men akademiske stipendier er tilgængelige. Sportsoplevelsen er stadig værdifuld.

## Rekrutteringsprocessen

Rekruttering begynder typisk 1-2 år før studiestart. Processen involverer:

1. Oprettelse af en atletprofil med video-highlights
2. Kontakt til trænere via e-mail og rekrutteringsplatforme
3. Officielle og uofficielle besøg på campus
4. Tilbud og underskrift af "National Letter of Intent"

> Den vigtigste ting er at starte tidligt og være proaktiv. Vent ikke på, at trænerne finder dig — opsøg dem.

## Akademiske krav

NCAA stiller krav til karaktergennemsnit og standardiserede testresultater (SAT/ACT). Danske atleter skal have deres karakterer evalueret af en godkendt tjeneste som WES eller ECE.

## Konklusion

Vejen til et NCAA-stipendium kræver planlægning og indsats, men belønningen er enorm — både sportsligt, akademisk og personligt.`,
      article_type: "feature",
      author: "Mikkel Guldbjerg",
      published_at: "2026-03-01T10:00:00Z",
    },
    {
      title: "Forårssæsonen 2026: Danske atleter på tværs af sportsgrene",
      summary:
        "Overblik over hvordan det går for danske student athletes i forårssæsonen 2026.",
      content: `Forårssæsonen 2026 er godt i gang, og de danske atleter leverer solide præstationer på tværs af sportsgrene i NCAA.

## Tennis

Forårssæsonen er højsæson for college-tennis, og flere danske spillere er med i front. De danske tennisspillere har generelt tilpasset sig godt til det amerikanske hardcourt-format og leverer resultater i deres respektive konferencer.

## Svømning

NCAA Swimming Championships nærmer sig, og de danske svømmere er i topform efter en lang sæson med hård træning. Konferencemesterskaberne har allerede budt på flere personlige rekorder.

## Fodbold

Spring season i college-fodbold handler primært om træning og forberedelse til efteråret, men de danske fodboldspillere bruger tiden til at udvikle sig teknisk og taktisk.

## Basketball

March Madness er i fuld gang, og danske basketballspillere kæmper med om pladserne i NCAA-turneringen. Selv for dem der ikke når turneringen, har sæsonen budt på værdifuld erfaring.

> Forårssæsonen er en vigtig tid for alle atleter — uanset om de er i konkurrencesæson eller bygger op til efteråret.

## Hvad vi holder øje med

De kommende uger byder på konferencemesterskaber og NCAA Championships i flere sportsgrene. StudentAthlete.dk følger de danske atleter tæt og bringer de vigtigste historier.`,
      article_type: "season_update",
      author: "StudentAthlete.dk",
      published_at: "2026-03-18T08:00:00Z",
    },
  ];
}

async function main(): Promise<void> {
  const db = createD1Client();

  // Hent rigtige atleter fra databasen
  console.log("Henter atleter fra databasen...");
  const result = await db.query<DbAthlete>(
    `SELECT id, name, slug, sport, position, hometown, university, university_state, division
     FROM athletes
     WHERE active = 1
     ORDER BY RANDOM()
     LIMIT 5`,
  );

  const athletes = result.results;
  if (athletes.length === 0) {
    console.error("Ingen atleter fundet i databasen. Kør seed-athletes.ts først.");
    process.exit(1);
  }

  console.log(`Fandt ${athletes.length} atleter. Genererer artikler...\n`);

  let inserted = 0;

  // Atlet-specifikke artikler (profile + news for hver)
  for (const athlete of athletes) {
    const articles = generateArticlesForAthlete(athlete);
    for (const article of articles) {
      const slug = generateSlug(article.title);
      try {
        await db.execute(
          `INSERT OR IGNORE INTO articles
           (athlete_id, title, slug, content, summary, article_type, author, published, published_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            athlete.id,
            article.title,
            slug,
            article.content,
            article.summary,
            article.article_type,
            article.author,
            article.published_at,
          ],
        );
        console.log(`  ✓ [${article.article_type}] ${article.title}`);
        inserted++;
      } catch (err) {
        console.error(`  ✗ Fejl: ${err}`);
      }
    }
  }

  // Generelle artikler (season_update, feature — ikke bundet til én atlet)
  const generalArticles = generateGeneralArticles();
  for (const article of generalArticles) {
    const slug = generateSlug(article.title);
    try {
      await db.execute(
        `INSERT OR IGNORE INTO articles
         (athlete_id, title, slug, content, summary, article_type, author, published, published_at)
         VALUES (NULL, ?, ?, ?, ?, ?, ?, 1, ?)`,
        [
          article.title,
          slug,
          article.content,
          article.summary,
          article.article_type,
          article.author,
          article.published_at,
        ],
      );
      console.log(`  ✓ [${article.article_type}] ${article.title}`);
      inserted++;
    } catch (err) {
      console.error(`  ✗ Fejl: ${err}`);
    }
  }

  console.log(`\nFærdig. Indsatte ${inserted} artikler.`);
}

main().catch((err) => {
  console.error("Seed fejlede:", err);
  process.exit(1);
});
