/**
 * Statisk viden-/guide-indhold til /viden/[slug].
 * Evergreen baggrundsstof om NCAA + college sport, målrettet danske atleter,
 * forældre og fans. Indhold redigeres her (versionsstyret) — ikke i D1.
 *
 * Inline-links i body/list/faq skrives som [tekst](/intern-sti) og renderes
 * som <a> af guide-siden. Brug interne stier i brødteksten (vigtigt for intern
 * link-building); eksterne, autoritative kilder samles i `sources`-feltet og
 * renderes som en "Kilder"-sektion (åbner i nyt faneblad). ArticleBody markerer
 * automatisk http(s)-links som target=_blank rel=noopener.
 *
 * NB: NCAA-regler ændrer sig løbende (test-krav, transfer, NLI, conference-
 * realignment, eligibility). Teksterne er bevidst evergreen + henviser til at
 * tjekke aktuel status, men centrale fakta er kildebelagt. Opdatér `updated`
 * ved ændringer.
 */

export type GuideCategory = "system" | "begreber" | "saeson";

export interface GuideSection {
  heading: string;
  body?: string[];
  list?: string[];
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface GuideSource {
  label: string;
  url: string; // ekstern URL (http/https)
}

export interface VidenGuide {
  slug: string;
  category: GuideCategory;
  title: string;
  metaTitle: string;
  description: string;
  intro: string;
  sections: GuideSection[];
  faqs?: GuideFaq[];
  related: { label: string; href: string }[];
  /** Autoritative eksterne kilder — officielle (NCAA m.fl.) før nyhedsmedier. */
  sources?: GuideSource[];
  updated: string; // ISO
}

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  system: "NCAA-systemet",
  begreber: "Regler & begreber",
  saeson: "Sæson & events",
};

const UPDATED = "2026-06-24";

export const VIDEN_GUIDES: VidenGuide[] = [
  {
    slug: "hvad-er-ncaa",
    category: "system",
    title: "Hvad er NCAA?",
    metaTitle: "Hvad er NCAA? Guide til college sport i USA",
    description:
      "NCAA organiserer college sport i USA — over 1.000 universiteter og en halv million atleter. Forstå systemet, og hvad det betyder for danske atleter.",
    intro:
      "NCAA (National Collegiate Athletic Association) er den største organisation for universitetssport i USA. Her får du overblikket over systemet og dets betydning for danske student athletes.",
    sections: [
      {
        heading: "Hvad står NCAA for?",
        body: [
          "NCAA er en non-profit-organisation, der fastsætter regler og afvikler mesterskaber for college sport i USA. Sammenslutningen tæller over 1.100 universiteter og mere end en halv million atleter — i 2024-25 var deltagertallet rekordhøje 554.298. Der konkurreres i omkring 24 sportsgrene med omkring 90 nationale mesterskaber for både kvinder og mænd (kvindebrydning blev det 91. i 2026).",
          "Universiteterne er inddelt i tre divisioner og samlet i [conferences](/viden/conferences), der konkurrerer mod hinanden gennem sæsonen.",
        ],
      },
      {
        heading: "Hvorfor er det relevant for danske atleter?",
        body: [
          "Det amerikanske system er næsten unikt ved at kombinere studie og elitesport på samme institution. Det gør det muligt at tage en universitetsuddannelse, mens man træner og konkurrerer på højt niveau — ofte med adgang til faciliteter, trænere og akademisk støtte i topklasse.",
          "Hundredvis af danskere går denne vej hvert år. Vi følger dem løbende — se [alle danske atleter](/atleter) vi dækker.",
        ],
      },
      {
        heading: "De tre divisioner",
        body: [
          "Division I, II og III adskiller sig på niveau, økonomi og balancen mellem sport og studie. Forskellene har stor betydning for, hvor du passer ind.",
        ],
        list: [
          "Læs mere: [Divisioner i NCAA forklaret](/viden/ncaa-divisioner)",
        ],
      },
      {
        heading: "Findes der alternativer til NCAA?",
        body: [
          "Ja. NAIA og NJCAA (junior colleges) er selvstændige forbund med egne regler og kan være oplagte veje for mange danskere. Se forskellene i [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa).",
        ],
      },
      {
        heading: "Et system i hastig forandring",
        body: [
          "College sport gennemgår i disse år de største ændringer i organisationens historie. Med det såkaldte House-forlig fra 2025 må universiteter for første gang betale deres atleter direkte (revenue sharing) — det klassiske amatøridrætsprincip er reelt ophørt. Samtidig er reglerne for [transfer](/viden/transfer-portal) og [eligibility](/viden/redshirt-og-eligibility) blevet markant lempet. Tjek altid den aktuelle status, da meget stadig er under udvikling.",
        ],
      },
    ],
    faqs: [
      {
        q: "Hvad betyder NCAA?",
        a: "National Collegiate Athletic Association — den organisation, der styrer størstedelen af college sport i USA.",
      },
      {
        q: "Hvor mange danskere er i NCAA?",
        a: "Der er løbende hundredvis af danske student athletes på amerikanske universiteter. Vi samler dem på StudentAthlete.dk under [Alle atleter](/atleter).",
      },
      {
        q: "Bliver college-atleter betalt nu?",
        a: "Ja, i stigende grad. Atleter har siden 2021 kunnet tjene på deres Name, Image and Likeness (NIL), og fra 1. juli 2025 må universiteter — efter House-forliget — også dele indtægter direkte med atleterne inden for et årligt loft.",
      },
    ],
    related: [
      { label: "Divisioner i NCAA", href: "/viden/ncaa-divisioner" },
      { label: "Conferences forklaret", href: "/viden/conferences" },
      { label: "NCAA vs NAIA vs NJCAA", href: "/viden/ncaa-naia-njcaa" },
      { label: "Sæsonkalenderen", href: "/viden/saeson-kalender" },
    ],
    sources: [
      { label: "NCAA. (2025, 15. september). A record number of NCAA student-athletes participated in 2024-25.", url: "https://www.ncaa.org/news/2025/9/15/media-center-a-record-number-of-ncaa-student-athletes-participated-in-2024-25.aspx" },
      { label: "NCAA. (2021). NCAA 101: What is the NCAA?", url: "https://www.ncaa.org/sports/2021/2/10/about-resources-media-center-ncaa-101-what-ncaa.aspx" },
      { label: "ESPN. (2025). Judge grants final approval of House v. NCAA settlement.", url: "https://www.espn.com/college-sports/story/_/id/45467505/judge-grants-final-approval-house-v-ncaa-settlement" },
    ],
    updated: UPDATED,
  },
  {
    slug: "ncaa-divisioner",
    category: "system",
    title: "Divisioner i NCAA: Division I, II og III",
    metaTitle: "NCAA-divisioner: Division I, II og III forklaret",
    description:
      "Forskellen på NCAA Division I, II og III — niveau, idrætslegater og balancen mellem sport og studie. Hvad betyder det for danske atleter?",
    intro:
      "NCAA er inddelt i tre divisioner. De adskiller sig på sportsligt niveau, økonomi og hvor meget sporten fylder i hverdagen. Her er forskellene — og hvad de betyder for dig.",
    sections: [
      {
        heading: "Division I (D-I)",
        body: [
          "Den største og mest synlige division med de højeste budgetter, tv-aftaler og fuldtidstrænerstabe. Mange D-I-programmer kan tilbyde idrætslegater (athletic scholarships), og kravene til både niveau og tidsforbrug er størst her.",
          "Efter House-forliget (2025) er D-I desuden trådt ind i en ny økonomi: skoler, der vælger det til, må nu dele indtægter direkte med atleterne inden for et årligt loft (cirka 20,5 mio. dollars i første år), og de tidligere stipendie-lofter er flere steder erstattet af trup-lofter (roster limits). De fleste D-I-skoler har valgt modellen til.",
        ],
      },
      {
        heading: "Division II (D-II)",
        body: [
          "En balance mellem sport og studie. D-II-skoler kan tilbyde delvise idrætslegater og ligger ofte i mindre byer. Niveauet er højt, men hverdagen er typisk mindre presset end i D-I.",
        ],
      },
      {
        heading: "Division III (D-III)",
        body: [
          "D-III giver ikke idrætslegater — kun akademisk eller behovsbaseret støtte. Til gengæld er der stærkt fokus på studiet, og i flere sportsgrene er niveauet stadig højt. Mange danskere ender i D-III for kombinationen af god uddannelse og seriøs sport.",
        ],
      },
      {
        heading: "Hvilken division passer til dig?",
        body: [
          "Det afhænger af dit sportslige niveau, dine karakterer og din økonomi. Ingen division er objektivt 'bedst' — det handler om det rette match. Se hvilke divisioner de danske atleter vi dækker går på under [Universiteter](/skoler).",
        ],
      },
    ],
    faqs: [
      {
        q: "Giver Division III idrætslegater?",
        a: "Nej. D-III tilbyder ikke idrætslegater, men kan give akademisk og behovsbaseret støtte. Idrætslegater findes i D-I og D-II (samt i NAIA).",
      },
    ],
    related: [
      { label: "Hvad er NCAA?", href: "/viden/hvad-er-ncaa" },
      { label: "NCAA vs NAIA vs NJCAA", href: "/viden/ncaa-naia-njcaa" },
      { label: "Universiteter med danske atleter", href: "/skoler" },
    ],
    sources: [
      { label: "NCAA. (2021). NCAA 101: Our three divisions.", url: "https://www.ncaa.org/sports/2021/2/10/about-resources-media-center-ncaa-101-our-three-divisions.aspx" },
      { label: "Ropes & Gray. (2025, juni). House v. NCAA settlement approved: Era of direct payments to college athletes begins.", url: "https://www.ropesgray.com/en/insights/alerts/2025/06/house-v-ncaa-settlement-approved-era-of-direct-payments-to-college-athletes-begins" },
    ],
    updated: UPDATED,
  },
  {
    slug: "conferences",
    category: "system",
    title: "Conferences forklaret: Big Ten, SEC, ACC og resten",
    metaTitle: "NCAA conferences forklaret: Big Ten, SEC, ACC m.fl.",
    description:
      "Hvad er en conference i college sport? Big Ten, SEC, ACC og de mange andre — hvordan de fungerer, og hvorfor de betyder noget.",
    intro:
      "En conference er en sammenslutning af universiteter, der konkurrerer i samme liga. Her er, hvordan de fungerer — og hvorfor de fylder så meget i amerikansk college sport.",
    sections: [
      {
        heading: "Hvad er en conference?",
        body: [
          "En conference samler typisk universiteter ud fra geografi og historie. Holdene møder primært hinanden i conference-kampe gennem sæsonen, og de fleste conferences kårer en mester, ofte gennem et afsluttende stævne (conference tournament).",
        ],
      },
      {
        heading: "De store navne",
        body: [
          "De fire største D-I-conferences er i dag Big Ten, SEC, ACC og Big 12 — tilsammen kaldet 'Power Four' (tidligere 'Power Five') med de største tv-aftaler og budgetter. Big Ten og SEC står for de allerstørste mediekontrakter og omtales nogle gange som en 'Power Two' i en klasse for sig.",
          "Derudover findes en række mindre 'Group of Six'-conferences og mange 'mid-major'-conferences, hvor en stor del af de danske atleter spiller.",
        ],
      },
      {
        heading: "Conference-realignment",
        body: [
          "Conferences er ikke statiske. Universiteter skifter jævnligt conference (realignment), drevet af tv-penge og geografi. Den hidtil mest dramatiske bølge ramte i 2023-24, da Pac-12 — i over 100 år en af de mest prestigefyldte conferences — mistede 10 af sine 12 medlemmer til primært Big Ten, Big 12 og ACC og reelt kollapsede. Conferencen genopbygges fra 2026 med nye medlemmer.",
          "Landskabet ændrer sig altså løbende, og et holds conference kan være anderledes fra år til år — tjek altid den aktuelle status.",
        ],
      },
      {
        heading: "Hvorfor betyder det noget?",
        body: [
          "Conference afgør modstandere, rejseafstande, eksponering og ofte niveau. På profilerne under [Universiteter](/skoler) viser vi hver skoles conference og [division](/viden/ncaa-divisioner).",
        ],
      },
    ],
    related: [
      { label: "Divisioner i NCAA", href: "/viden/ncaa-divisioner" },
      { label: "Hvad er NCAA?", href: "/viden/hvad-er-ncaa" },
      { label: "Universiteter med danske atleter", href: "/skoler" },
    ],
    sources: [
      { label: "Wikipedia. (n.d.). Power conferences. Hentet juni 2026.", url: "https://en.wikipedia.org/wiki/Power_conferences" },
      { label: "Front Office Sports. (n.d.). Conference realignment and the end of the Power 5 era.", url: "https://frontofficesports.com/conference-realignment-end-of-power-5-end/" },
    ],
    updated: UPDATED,
  },
  {
    slug: "ncaa-naia-njcaa",
    category: "system",
    title: "NCAA vs NAIA vs NJCAA: Hvad er forskellen?",
    metaTitle: "NCAA vs NAIA vs NJCAA — forskellen forklaret",
    description:
      "NCAA er ikke det eneste forbund for college sport i USA. Forstå NAIA og NJCAA (junior colleges) — og hvornår de er den rigtige vej for danske atleter.",
    intro:
      "Mange tror, at college sport i USA er lig med NCAA. Men NAIA og NJCAA er selvstændige forbund, der for mange danskere er oplagte — og nogle gange bedre — veje.",
    sections: [
      {
        heading: "NCAA",
        body: [
          "Det største forbund med tre [divisioner](/viden/ncaa-divisioner) og de fleste topprogrammer. Strammest regelsæt og en central [Eligibility Center](/viden/akademiske-krav), der certificerer atleter.",
        ],
      },
      {
        heading: "NAIA",
        body: [
          "Et mindre forbund med et par hundrede universiteter. NAIA tillader idrætslegater, har et mindre stramt regelsæt og kortere optagelsesproces. Niveauet kan være højt, og for mange internationale atleter er NAIA en god indgang.",
        ],
      },
      {
        heading: "NJCAA (junior colleges / JUCO)",
        body: [
          "Toårige community colleges. JUCO bruges ofte som springbræt: man udvikler sig sportsligt og akademisk i 1-2 år og kan derefter skifte (transfer) til et fireårigt NCAA- eller NAIA-universitet. Det er typisk billigere og har lavere optagelseskrav.",
          "Et vigtigt opmærksomhedspunkt: JUCO-år har historisk talt med i NCAA's spilleberettigelse. Det har en retssag (Pavia mod NCAA, 2024-25) udfordret, og NCAA har givet midlertidige dispensationer. Samtidig indfører NCAA en ny aldersbaseret [eligibility-model](/viden/redshirt-og-eligibility), der på sigt afløser den gamle optælling af sæsoner. Reglerne er altså i bevægelse — afklar din konkrete situation tidligt.",
        ],
      },
      {
        heading: "Hvad er rigtigt for dig?",
        body: [
          "Det afhænger af niveau, karakterer, økonomi og mål. JUCO kan åbne døre, hvis karaktererne ikke rækker til NCAA endnu; NAIA kan give spilletid og legat; NCAA byder på de største rammer. Se [hvor danske atleter går](/skoler) for inspiration.",
        ],
      },
    ],
    related: [
      { label: "Divisioner i NCAA", href: "/viden/ncaa-divisioner" },
      { label: "Akademiske krav & eligibility", href: "/viden/akademiske-krav" },
      { label: "Universiteter med danske atleter", href: "/skoler" },
    ],
    sources: [
      { label: "NAIA. (n.d.). Official website.", url: "https://www.naia.org/" },
      { label: "NJCAA. (n.d.). Official website.", url: "https://www.njcaa.org/" },
      { label: "ESPN. (2024). NCAA Division I board grants waiver for former JUCO players appealing in Diego Pavia injunction.", url: "https://www.espn.com/college-football/story/_/id/43131557/ncaa-division-board-grants-waiver-former-juco-players-appealing-diego-pavia-injunction" },
    ],
    updated: UPDATED,
  },
  {
    slug: "amerikansk-universitetssystem",
    category: "system",
    title: "Det amerikanske universitetssystem for student athletes",
    metaTitle: "Det amerikanske universitetssystem — major, GPA og campus",
    description:
      "Major, credits, GPA og campus-liv: sådan fungerer amerikanske universiteter — og hvordan hverdagen ser ud som student athlete.",
    intro:
      "At være student athlete betyder fuldtidsstudie og elitesport på samme tid. Her er, hvordan det amerikanske universitetssystem er skruet sammen.",
    sections: [
      {
        heading: "Major, credits og GPA",
        body: [
          "En bachelor (undergraduate) tager typisk fire år. Man vælger en 'major' (hovedfag) og samler 'credits' for beståede fag. Karaktererne udtrykkes som et GPA på en 4,0-skala, og et vist GPA kræves for at forblive spilleberettiget.",
        ],
      },
      {
        heading: "Semester eller quarter",
        body: [
          "De fleste universiteter kører på to semestre (efterår/forår), mens nogle bruger 'quarters'. Sportssæsonen lægger sig oven på studieåret — se [sæsonkalenderen](/viden/saeson-kalender).",
        ],
      },
      {
        heading: "Hverdagen som student athlete",
        body: [
          "En typisk dag rummer træning, holdmøder, studie og ofte obligatorisk 'study hall'. Til gengæld har atleter adgang til akademisk støtte, tutorer og vejledning, der hjælper med at få studie og sport til at hænge sammen.",
          "Hertil kommer en ny dimension: siden 2021 må atleter tjene penge på deres Name, Image and Likeness (NIL), og fra 2025 deler mange universiteter også indtægter direkte med atleterne. Det giver muligheder, men også flere aftaler og forpligtelser at forholde sig til ved siden af studie og sport.",
        ],
      },
      {
        heading: "Akademiske krav",
        body: [
          "Inden man overhovedet kan konkurrere, skal man opfylde optagelses- og spilleberettigelseskrav. Det dækker vi i [akademiske krav & eligibility](/viden/akademiske-krav).",
        ],
      },
    ],
    related: [
      { label: "Akademiske krav & eligibility", href: "/viden/akademiske-krav" },
      { label: "Sæsonkalenderen", href: "/viden/saeson-kalender" },
      { label: "Alle danske atleter", href: "/atleter" },
    ],
    sources: [
      { label: "NCAA. (2014, 6. oktober). Academic standards.", url: "https://www.ncaa.org/sports/2014/10/6/academic-standards.aspx" },
      { label: "NCAA. (2018, 11. juli). Eligibility Center.", url: "https://www.ncaa.org/sports/2018/7/11/eligibility-center.aspx" },
    ],
    updated: UPDATED,
  },
  {
    slug: "saeson-kalender",
    category: "system",
    title: "Sæsonkalenderen i NCAA: hvornår spilles hvad?",
    metaTitle: "NCAA sæsonkalender — hvornår spilles hver sport?",
    description:
      "Efterår, vinter eller forår? Overblik over hvornår de enkelte NCAA-sportsgrene har sæson — fra football til roning.",
    intro:
      "College sport følger studieåret og deles groft i tre sæsoner. Her er, hvornår de enkelte sportsgrene spiller — med link til vores dækning af hver gren.",
    sections: [
      {
        heading: "Efterårssæson (ca. august–december)",
        list: [
          "[Football](/football)",
          "[Fodbold (soccer)](/fodbold)",
          "[Volleyball](/volleyball)",
          "Cross country (langdistanceløb)",
        ],
      },
      {
        heading: "Vintersæson (ca. november–marts)",
        list: [
          "[Basketball](/basketball)",
          "[Svømning](/svoemning)",
          "[Ishockey](/ishockey)",
          "[Gymnastik](/gymnastik)",
          "Indendørs [atletik](/atletik)",
        ],
      },
      {
        heading: "Forårssæson (ca. februar–juni)",
        list: [
          "[Baseball](/baseball)",
          "[Tennis](/tennis)",
          "[Golf](/golf)",
          "[Roning](/roning)",
          "Udendørs [atletik](/atletik)",
        ],
      },
      {
        heading: "Ikke kun kampsæsonen",
        body: [
          "Uden for selve kampsæsonen ('non-traditional season') trænes der videre, og flere sportsgrene har stævner i begge halvår. Mesterskaberne — som [March Madness](/viden/march-madness-forklaret) i basketball — kulminerer typisk i slutningen af sæsonen.",
        ],
      },
    ],
    related: [
      { label: "March Madness forklaret", href: "/viden/march-madness-forklaret" },
      { label: "College Football Playoff forklaret", href: "/viden/college-football-playoff-forklaret" },
      { label: "Alle sportsgrene", href: "/viden" },
    ],
    sources: [
      { label: "NCAA. (n.d.). Championships and dates.", url: "https://www.ncaa.com/" },
    ],
    updated: UPDATED,
  },
  {
    slug: "akademiske-krav",
    category: "begreber",
    title: "Akademiske krav & eligibility i NCAA",
    metaTitle: "NCAA akademiske krav & Eligibility Center forklaret",
    description:
      "NCAA Eligibility Center, core courses, GPA og amatørstatus: hvad skal danske atleter opfylde for at blive spilleberettiget?",
    intro:
      "Før man kan konkurrere i NCAA, skal man godkendes både akademisk og som amatør. Her er hovedreglerne — husk at tjekke den aktuelle status, da kravene ændrer sig.",
    sections: [
      {
        heading: "NCAA Eligibility Center",
        body: [
          "For Division I og II godkendes atleter af NCAA Eligibility Center, der gennemgår både dit akademiske grundlag og din amatørstatus. Man registrerer sig og indsender karakterer og dokumentation. Division III har egne optagelseskrav og bruger ikke Eligibility Center.",
        ],
      },
      {
        heading: "Karakterer og fag",
        body: [
          "Der stilles krav til 16 bestemte fag ('core courses') og et minimums-GPA i dem. For Division I kræves som udgangspunkt mindst 2,3 i core-GPA, for Division II mindst 2,2 (på den amerikanske 4,0-skala). Danske gymnasiekarakterer omregnes til den amerikanske skala, og et stærkt karaktergennemsnit udvider dine muligheder markant.",
        ],
      },
      {
        heading: "SAT/ACT og sprogtest",
        body: [
          "Standardiserede prøver (SAT/ACT) indgik tidligere i spilleberettigelsen, men NCAA fjernede dette krav permanent i januar 2023 (gældende fra 2023-24). Spilleberettigelsen afgøres nu af core-GPA og core courses, ikke af en testscore.",
          "Bemærk dog to ting: nogle universiteter kan stadig kræve SAT/ACT ved selve optagelsen eller til visse legater, og som ikke-engelsktalende skal du ofte dokumentere engelskniveau (fx TOEFL eller Duolingo). Tjek altid de nyeste krav hos den enkelte skole.",
        ],
      },
      {
        heading: "Amatørstatus — en regel i opbrud",
        body: [
          "Amatørprincippet, som NCAA byggede på i over 100 år, er reelt under afvikling. Siden 2021 må atleter tjene på deres Name, Image and Likeness (NIL), og efter House-forliget fra 2025 må universiteter dele indtægter direkte med atleterne. Eligibility Center vurderer dog stadig din baggrund.",
          "For europæiske atleter med klub- eller ungdomssport er det fortsat et særligt opmærksomhedspunkt: tidligere professionelle kontrakter, løn eller pengepræmier kan påvirke din status og skal afklares tidligt. Få det undersøgt, før du regner med specifikke regler.",
        ],
      },
    ],
    faqs: [
      {
        q: "Skal jeg tage SAT for at komme i NCAA?",
        a: "Nej, ikke for selve NCAA-spilleberettigelsen — NCAA fjernede SAT/ACT-kravet permanent i 2023. Men nogle skoler kan stadig kræve en testscore ved optagelse eller til legater, så tjek hos den enkelte skole.",
      },
      {
        q: "Må college-atleter tjene penge nu?",
        a: "Ja. Atleter kan tjene på NIL (Name, Image and Likeness) siden 2021, og fra 2025 må universiteter også dele indtægter direkte med atleterne. Tidligere professionel aktivitet kan dog stadig påvirke din eligibility — afklar det tidligt.",
      },
    ],
    related: [
      { label: "Det amerikanske universitetssystem", href: "/viden/amerikansk-universitetssystem" },
      { label: "Redshirt & eligibility-år", href: "/viden/redshirt-og-eligibility" },
      { label: "NCAA vs NAIA vs NJCAA", href: "/viden/ncaa-naia-njcaa" },
    ],
    sources: [
      { label: "Higher Ed Dive. (2023). NCAA permanently ends SAT/ACT eligibility requirement (Division I & II).", url: "https://www.highereddive.com/news/ncaa-permanently-ends-sat-act-eligibility-requirement-division-i-ii/642117/" },
      { label: "NCAA. (2018, 11. juli). Eligibility Center.", url: "https://www.ncaa.org/sports/2018/7/11/eligibility-center.aspx" },
      { label: "Ropes & Gray. (2025, juni). House v. NCAA settlement approved: Era of direct payments to college athletes begins.", url: "https://www.ropesgray.com/en/insights/alerts/2025/06/house-v-ncaa-settlement-approved-era-of-direct-payments-to-college-athletes-begins" },
    ],
    updated: UPDATED,
  },
  {
    slug: "transfer-portal",
    category: "begreber",
    title: "Transfer Portal forklaret",
    metaTitle: "NCAA Transfer Portal forklaret",
    description:
      "Hvad er NCAA's transfer portal, og hvordan virker den? Sådan skifter college-atleter universitet — og hvad det betyder for danske spillere.",
    intro:
      "Transfer-portalen har ændret college sport markant. Her er, hvad den er, og hvorfor den er relevant for danske atleter, der søger bedre muligheder.",
    sections: [
      {
        heading: "Hvad er portalen?",
        body: [
          "Transfer-portalen er en officiel database, hvor en atlet kan melde sig som villig til at skifte universitet. Når man er i portalen, må andre skolers trænere tage kontakt. Det er kort sagt et formaliseret 'transfervindue' for college-atleter.",
        ],
      },
      {
        heading: "Reglerne om at skifte",
        body: [
          "Reglerne er lempet markant. Siden april 2024 kan akademisk velfungerende atleter skifte og være umiddelbart spilleberettigede — også ved deres andet, tredje eller fjerde skift. Tidligere skulle man sidde en sæson over efter sit første skift. Kravet er, at man forlader sin gamle skole i god akademisk stand og lever op til 'progress-toward-degree' på den nye.",
          "Skift sker inden for fastlagte transfervinduer (windows), der varierer fra sport til sport. Man kan ikke skifte midt i en sæson og spille for to hold samme sæson. Detaljerne justeres løbende, så tjek den aktuelle status.",
        ],
      },
      {
        heading: "Hvorfor det betyder noget for danskere",
        body: [
          "Spillertrupper ændrer sig hurtigt, og portalen giver atleter mulighed for at finde bedre spilletid, et stærkere akademisk match eller en højere [division](/viden/ncaa-divisioner). Vi dækker danske spilleres skift løbende under [Alle atleter](/atleter).",
        ],
      },
    ],
    related: [
      { label: "Redshirt & eligibility-år", href: "/viden/redshirt-og-eligibility" },
      { label: "Divisioner i NCAA", href: "/viden/ncaa-divisioner" },
      { label: "Alle danske atleter", href: "/atleter" },
    ],
    sources: [
      { label: "NCAA. (2024, 17. april). Division I Council approves changes to transfer rules.", url: "https://www.ncaa.org/news/2024/4/17/media-center-division-i-council-approves-changes-to-transfer-rules.aspx" },
      { label: "ESPN. (2024). NCAA approves new transfer rule allowing immediate eligibility.", url: "https://www.espn.com/college-football/story/_/id/39963389/ncaa-approves-new-transfer-rule-allowing-immediate-eligibility" },
    ],
    updated: UPDATED,
  },
  {
    slug: "redshirt-og-eligibility",
    category: "begreber",
    title: "Redshirt og eligibility-år forklaret",
    metaTitle: "Redshirt & eligibility-år i NCAA forklaret (aldersbaseret model)",
    description:
      "NCAA udfaser redshirt og indfører en aldersbaseret model med op til fem års eligibility. Forstå både den nye og den gamle ordning — og overgangen.",
    intro:
      "Hvor mange år må man egentlig spille i NCAA? Reglerne er netop blevet lagt grundlæggende om: den klassiske 'fire sæsoner inden for fem år' og selve redshirt-begrebet er på vej ud, til fordel for en aldersbaseret model. Her er forklaringen — på både det gamle og det nye.",
    sections: [
      {
        heading: "Stor ændring: aldersbaseret model fra 2026",
        body: [
          "Division I vedtog i juni 2026 en ny aldersbaseret eligibility-model. Fremover får en atlet op til fem års spilleberettigelse, forudsat man indskrives på college senest i det akademiske år, der følger ens 19-års fødselsdag. Modellen afskaffer de sportsspecifikke regler, season-of-competition-grænser og — vigtigst — selve redshirt-reglerne og de fleste eligibility-dispensationer.",
          "Med andre ord kan man ikke længere 'redshirte' eller søge waivere for at vinde ekstra konkurrenceår. Kun snævre undtagelser kan sætte uret på pause: graviditet/barsel, aktiv militærtjeneste og officielle religiøse missioner — og kun hvis man ikke deltager i organiseret konkurrence imens.",
        ],
      },
      {
        heading: "Overgangsregler",
        body: [
          "Ændringen indfases. For atleter, der starter på fuld tid i efteråret 2026, og nuværende atleter med eligibility tilbage efter 2025-26 anvender skolerne enten den gamle model (fire sæsoner inden for fem år) eller den nye aldersbaserede model — det, der er mest fordelagtigt for den enkelte. Fra efteråret 2027 gælder kun den aldersbaserede model.",
          "Dispensationer (waivers) under de gamle regler — fx urforlængelser og hardship-waivers — skal være indsendt senest 31. juli 2026; derefter findes de ikke længere.",
        ],
      },
      {
        heading: "Den gamle model (stadig relevant i overgangen)",
        body: [
          "Hidtil har en NCAA-atlet haft fire sæsoners konkurrence at bruge inden for et vindue på fem år ('the five-year clock'), der begyndte ved fuldtidsindskrivning. At 'redshirte' betød at sidde en sæson over — fx på grund af skade eller udvikling — uden at bruge et af de fire konkurrenceår. En 'redshirt freshman' var altså i sit andet år på campus, men sit første som spillende. Begrebet vil stadig optræde, mens den gamle model fases ud.",
        ],
      },
      {
        heading: "Class year vs. eligibility",
        body: [
          "Bemærk, at en atlets studieår (freshman/sophomore/junior/senior) ikke altid følger antallet af brugte konkurrenceår. På vores profiler viser vi ofte forventet dimissionsår. Se også [akademiske krav](/viden/akademiske-krav).",
        ],
      },
    ],
    faqs: [
      {
        q: "Findes redshirt stadig?",
        a: "Den er på vej ud. Med den aldersbaserede model, som Division I vedtog i juni 2026, afskaffes redshirt-reglerne. I en overgangsperiode (efterår 2026 og nuværende atleter) kan den gamle model dog stadig bruges, hvis den er mere fordelagtig. Fra efteråret 2027 gælder kun aldersmodellen.",
      },
      {
        q: "Hvor mange år må jeg spille i NCAA fremover?",
        a: "Under den nye model op til fem år, hvis du er indskrevet på college senest i det akademiske år efter din 19-års fødselsdag.",
      },
    ],
    related: [
      { label: "Transfer Portal forklaret", href: "/viden/transfer-portal" },
      { label: "Akademiske krav & eligibility", href: "/viden/akademiske-krav" },
      { label: "Ordbog: college sport-begreber", href: "/viden/college-sport-ordbog" },
    ],
    sources: [
      { label: "NCAA. (2026, 23. juni). Division I adopts age-based eligibility model.", url: "https://www.ncaa.org/news/2026/6/23/media-center-division-i-adopts-age-based-eligibility-model.aspx" },
      { label: "CBS Sports. (2026). NCAA votes to approve age-based five-year eligibility rule.", url: "https://www.cbssports.com/college-football/news/ncaa-five-year-eligibility-rule-college-football-basketball/" },
    ],
    updated: UPDATED,
  },
  {
    slug: "college-sport-ordbog",
    category: "begreber",
    title: "Ordbog: college sport-begreber fra A til Z",
    metaTitle: "Ordbog: college sport- og NCAA-begreber forklaret",
    description:
      "Amatørstatus, FBS, mid-major, redshirt, walk-on … de vigtigste begreber i amerikansk college sport forklaret kort på dansk.",
    intro:
      "Amerikansk college sport har sit eget sprog. Her er de vigtigste begreber forklaret kort — med links til dybere guider.",
    sections: [
      { heading: "Amatørstatus (amateurism)", body: ["Det historiske NCAA-princip om, at atleter ikke måtte tjene penge på deres sport. Reelt under afvikling efter NIL (2021) og House-forliget (2025), men tidligere professionel aktivitet kan stadig påvirke din eligibility — se [akademiske krav](/viden/akademiske-krav)."] },
      { heading: "Conference", body: ["Sammenslutning af universiteter, der konkurrerer i samme liga. Se [conferences forklaret](/viden/conferences)."] },
      { heading: "Commit", body: ["Når en atlet (mundtligt) forpligter sig til en skole, før papirerne er underskrevet på [Signing Day](/viden/signing-day-og-nli)."] },
      { heading: "Division I / II / III", body: ["NCAA's tre niveauer. Se [divisioner forklaret](/viden/ncaa-divisioner)."] },
      { heading: "Eligibility", body: ["Spilleberettigelse — om du må konkurrere akademisk og som amatør. Se [redshirt & eligibility](/viden/redshirt-og-eligibility)."] },
      { heading: "FBS / FCS", body: ["De to øverste niveauer i D-I [football](/football): Football Bowl Subdivision og Football Championship Subdivision."] },
      { heading: "Freshman / sophomore / junior / senior", body: ["Studieårene 1.–4. år på et amerikansk universitet."] },
      { heading: "GPA", body: ["Grade Point Average — karaktergennemsnit på en 4,0-skala. Se [universitetssystemet](/viden/amerikansk-universitetssystem)."] },
      { heading: "JUCO", body: ["Junior college (NJCAA) — toårig skole, ofte springbræt. Se [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa)."] },
      { heading: "March Madness", body: ["D-I-basketballturneringen i marts (udvides til 76 hold fra 2026-27). Se [March Madness forklaret](/viden/march-madness-forklaret)."] },
      { heading: "Mid-major", body: ["Conference uden for de største 'power'-conferences. Se [conferences](/viden/conferences)."] },
      { heading: "NIL (Name, Image and Likeness)", body: ["Atleters ret til at tjene på eget navn, billede og omdømme — fx sponsorater. Tilladt siden 2021. Se [akademiske krav](/viden/akademiske-krav)."] },
      { heading: "Power Four", body: ["De fire største D-I-conferences: Big Ten, SEC, ACC og Big 12 (tidligere 'Power Five'). Se [conferences](/viden/conferences)."] },
      { heading: "Redshirt", body: ["At sidde en sæson over uden at bruge et konkurrenceår. Under udfasning med NCAA's nye aldersbaserede model. Se [redshirt & eligibility](/viden/redshirt-og-eligibility)."] },
      { heading: "Revenue sharing", body: ["Universiteters direkte deling af indtægter med atleterne, indført efter House-forliget (2025). Se [hvad er NCAA?](/viden/hvad-er-ncaa)."] },
      { heading: "Roster", body: ["Truppen — listen over atleter på et hold."] },
      { heading: "Signing Day", body: ["Dagen hvor rekrutter underskriver. Se [Signing Day & NLI](/viden/signing-day-og-nli)."] },
      { heading: "Transfer portal", body: ["Database for atleter, der vil skifte skole. Se [transfer portal forklaret](/viden/transfer-portal)."] },
      { heading: "Walk-on", body: ["En atlet på holdet uden idrætslegat — i modsætning til en 'scholarship'-atlet."] },
    ],
    related: [
      { label: "Hvad er NCAA?", href: "/viden/hvad-er-ncaa" },
      { label: "Divisioner i NCAA", href: "/viden/ncaa-divisioner" },
      { label: "Akademiske krav & eligibility", href: "/viden/akademiske-krav" },
    ],
    sources: [
      { label: "NCAA. (2021). NCAA 101: What is the NCAA? (glossary).", url: "https://www.ncaa.org/sports/2021/2/10/about-resources-media-center-ncaa-101-what-ncaa.aspx" },
    ],
    updated: UPDATED,
  },
  {
    slug: "march-madness-forklaret",
    category: "saeson",
    title: "March Madness forklaret",
    metaTitle: "March Madness forklaret — guide for danskere",
    description:
      "Single-elimination og en hel nation i basketball-feber. Sådan fungerer March Madness — NCAA's store basketballturnering (udvides til 76 hold fra 2026-27).",
    intro:
      "March Madness er et af USA's største sportsbegivenheder. Her er, hvordan turneringen fungerer — og hvorfor den er værd at følge for danske basketballfans.",
    sections: [
      {
        heading: "Hvad er March Madness?",
        body: [
          "March Madness er NCAA Division I's afsluttende basketballturnering for både kvinder og mænd, der spilles hen over marts og april. Holdene spiller single-elimination — taber du én kamp, er du ude. Det skaber de berømte overraskelser ('upsets'). Feltet har været på 68 hold og udvides til 76 fra sæsonen 2026-27.",
        ],
      },
      {
        heading: "Bracket og de berømte runder",
        body: [
          "Holdene seedes i et 'bracket'. Efter de indledende kampe ('First Four') følger runderne ned mod Sweet 16, Elite Eight og Final Four, inden mesteren findes. Millioner udfylder deres egen bracket og forsøger at forudsige vinderne.",
        ],
      },
      {
        heading: "Udvidelse til 76 hold fra 2026-27",
        body: [
          "NCAA besluttede i 2026 at udvide både herrernes og kvindernes turnering fra 68 til 76 hold med virkning fra sæsonen 2026-27. I praksis spiller 24 hold 12 kampe i en udvidet indledende runde (over to dage), hvorefter de velkendte 64 hold er tilbage til første runde. Det klassiske bracket-format bevares altså.",
        ],
      },
      {
        heading: "Den danske vinkel",
        body: [
          "Danske [basketball](/basketball)-atleter kan være med, når deres hold når turneringen. Vi følger danskerne gennem sæsonen — se [alle atleter](/atleter).",
        ],
      },
    ],
    related: [
      { label: "Basketball i NCAA", href: "/basketball" },
      { label: "Sæsonkalenderen", href: "/viden/saeson-kalender" },
      { label: "College Football Playoff forklaret", href: "/viden/college-football-playoff-forklaret" },
    ],
    sources: [
      { label: "NCAA. (2026, 7. maj). NCAA basketball tournaments expanding to 76 teams: What to know.", url: "https://www.ncaa.org/sports/2026/5/7/ncaa-basketball-tournaments-expanding-to-76-teams-what-to-know.aspx" },
      { label: "NCAA. (2026, 7. maj). How the 2027 expanded NCAA tournament and March Madness brackets will work.", url: "https://www.ncaa.com/news/basketball-men/article/2026-05-07/how-2027-expanded-ncaa-tournament-and-march-madness-brackets-will-work" },
    ],
    updated: UPDATED,
  },
  {
    slug: "college-football-playoff-forklaret",
    category: "saeson",
    title: "College Football Playoff forklaret",
    metaTitle: "College Football Playoff (CFP) forklaret",
    description:
      "Hvordan kåres mesteren i college football? Guide til College Football Playoff, det udvidede slutspil og bowl-systemet.",
    intro:
      "College football afgøres i et slutspil kaldet College Football Playoff (CFP). Her er, hvordan det fungerer — kort og for danskere.",
    sections: [
      {
        heading: "Hvad er CFP?",
        body: [
          "College Football Playoff er slutspillet, der kårer den nationale mester i Division I [football](/football). Et udvalg rangerer de bedste hold, der derefter spiller om titlen. Fra 2024-sæsonen blev feltet udvidet til 12 hold.",
          "12-holdsformatet fortsætter til og med 2026-sæsonen — med to justeringer, der sikrer alle fire Power Four-mestre adgang og giver Notre Dame en plads ved en top 12-placering. En yderligere udvidelse til 14 eller 16 hold diskuteres for tiden for 2027 og frem, så tjek den aktuelle struktur.",
        ],
      },
      {
        heading: "Bowl games",
        body: [
          "Ud over selve slutspillet spilles en række 'bowl games' i december og januar — enkeltstående prestigekampe mellem hold fra forskellige [conferences](/viden/conferences). Flere bowls indgår i selve playoff-strukturen.",
        ],
      },
      {
        heading: "Den danske vinkel",
        body: [
          "Danskere i college football er ofte specialister (kickere, puntere) og linemen. Følg dem under [football](/football) og [alle atleter](/atleter).",
        ],
      },
    ],
    related: [
      { label: "Football i NCAA", href: "/football" },
      { label: "Conferences forklaret", href: "/viden/conferences" },
      { label: "Sæsonkalenderen", href: "/viden/saeson-kalender" },
    ],
    sources: [
      { label: "Wikipedia. (n.d.). College Football Playoff. Hentet juni 2026.", url: "https://en.wikipedia.org/wiki/College_Football_Playoff" },
      { label: "Sports Illustrated. (2025). College Football Playoff remains 12 teams in 2026.", url: "https://www.si.com/college-football/playoffs/cfp-makes-decision-expansion-2026" },
    ],
    updated: UPDATED,
  },
  {
    slug: "signing-day-og-nli",
    category: "saeson",
    title: "Signing Day og National Letter of Intent",
    metaTitle: "Signing Day & National Letter of Intent forklaret",
    description:
      "Hvad sker der på Signing Day, og hvad er en National Letter of Intent? Sådan formaliseres aftalen mellem atlet og universitet.",
    intro:
      "Når en rekrut og et universitet bliver enige, formaliseres det på en 'signing day'. Her er, hvad det betyder — og hvorfor reglerne er værd at holde øje med.",
    sections: [
      {
        heading: "Signing Day",
        body: [
          "Signing Day er dagen, hvor rekrutter officielt underskriver med deres kommende skole. I football findes typisk en tidlig underskrivningsperiode (december) og en traditionel (februar); andre sportsgrene har deres egne datoer.",
        ],
      },
      {
        heading: "National Letter of Intent (NLI)",
        body: [
          "NLI var i 60 år (fra 1964) den bindende aftale, der knyttede atlet og skole sammen mod tilbud om idrætsstøtte for ét år. Men NCAA afskaffede NLI-programmet i Division I i oktober 2024. Det er erstattet af en ny aftale om økonomisk støtte (financial aid agreement), der ofte kobles til den nye model for indtægtsdeling (revenue sharing).",
          "Bemærk: Division II brugte fortsat NLI på tidspunktet for ændringen. Tjek den aktuelle status for netop din division og sport.",
        ],
      },
      {
        heading: "Hvad betyder det for danske atleter?",
        body: [
          "For danskere er det vigtigt at forstå, hvornår en aftale bliver bindende, og hvad den dækker — uanset om det er en NLI eller den nye financial aid agreement. Sørg for, at det akademiske er på plads først — se [akademiske krav](/viden/akademiske-krav).",
        ],
      },
    ],
    faqs: [
      {
        q: "Findes National Letter of Intent (NLI) stadig?",
        a: "Ikke i Division I — NCAA afskaffede NLI-programmet i oktober 2024 og erstattede det med en financial aid agreement. Division II brugte fortsat NLI på tidspunktet for ændringen.",
      },
    ],
    related: [
      { label: "Akademiske krav & eligibility", href: "/viden/akademiske-krav" },
      { label: "Ordbog: college sport-begreber", href: "/viden/college-sport-ordbog" },
      { label: "Alle danske atleter", href: "/atleter" },
    ],
    sources: [
      { label: "ESPN. (2024). NCAA approves elimination of National Letter of Intent program.", url: "https://www.espn.com/college-sports/story/_/id/41702974/ncaa-approves-elimination-national-letter-intent-program" },
      { label: "NCSA. (2024). NCAA eliminates the NLI: What now?", url: "https://www.ncsasports.org/blog/ncaa-eliminates-nli" },
    ],
    updated: UPDATED,
  },
];

/** Strukturen → markdown (ArticleBody-kompatibel). Delt af seed + route-fallback. */
export function guideToMarkdown(g: VidenGuide): string {
  const parts: string[] = [g.intro];
  for (const s of g.sections) {
    parts.push(`## ${s.heading}`);
    for (const p of s.body ?? []) parts.push(p);
    if (s.list?.length) parts.push(s.list.map((i) => `- ${i}`).join("\n"));
  }
  if (g.faqs?.length) {
    parts.push("## Ofte stillede spørgsmål");
    for (const f of g.faqs) {
      parts.push(`### ${f.q}`);
      parts.push(f.a);
    }
  }
  if (g.related?.length) {
    parts.push("## Læs også");
    parts.push(g.related.map((r) => `- [${r.label}](${r.href})`).join("\n"));
  }
  if (g.sources?.length) {
    parts.push("## Kilder");
    parts.push(g.sources.map((s) => `- [${s.label}](${s.url})`).join("\n"));
  }
  return parts.join("\n\n");
}

export function getGuide(slug: string): VidenGuide | undefined {
  return VIDEN_GUIDES.find((g) => g.slug === slug);
}

export function getGuideSlugs(): string[] {
  return VIDEN_GUIDES.map((g) => g.slug);
}
