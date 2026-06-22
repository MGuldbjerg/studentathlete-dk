/**
 * Statisk viden-/guide-indhold til /viden/[slug].
 * Evergreen baggrundsstof om NCAA + college sport, målrettet danske atleter,
 * forældre og fans. Indhold redigeres her (versionsstyret) — ikke i D1.
 *
 * Inline-links i body/list/faq skrives som [tekst](/intern-sti) og renderes
 * som <a> af guide-siden (kun interne stier — vigtigt for intern link-building).
 *
 * NB: NCAA-regler ændrer sig løbende (test-krav, transfer, NLI, conference-
 * realignment). Teksterne er bevidst evergreen + henviser til at tjekke
 * aktuel status. Opdatér `updated` ved ændringer.
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
  updated: string; // ISO
}

export const CATEGORY_LABELS: Record<GuideCategory, string> = {
  system: "NCAA-systemet",
  begreber: "Regler & begreber",
  saeson: "Sæson & events",
};

const UPDATED = "2026-06-22";

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
          "NCAA er en non-profit-organisation, der fastsætter regler og afvikler mesterskaber for college sport i USA. Sammenslutningen tæller over 1.000 universiteter, omkring en halv million atleter og knap 24 sportsgrene for både kvinder og mænd.",
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
    ],
    related: [
      { label: "Divisioner i NCAA", href: "/viden/ncaa-divisioner" },
      { label: "Conferences forklaret", href: "/viden/conferences" },
      { label: "NCAA vs NAIA vs NJCAA", href: "/viden/ncaa-naia-njcaa" },
      { label: "Sæsonkalenderen", href: "/viden/saeson-kalender" },
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
          "Blandt de mest kendte D-I-conferences er Big Ten, SEC, ACC og Big 12 — ofte omtalt som 'power'-conferences med de største tv-aftaler og budgetter. Derudover findes mange 'mid-major'-conferences, hvor en stor del af de danske atleter spiller.",
        ],
      },
      {
        heading: "Conference-realignment",
        body: [
          "Conferences er ikke statiske. Universiteter skifter jævnligt conference (realignment), drevet af tv-penge og geografi. Det ændrer løbende landskabet, så et holds conference kan være anderledes fra år til år — tjek altid den aktuelle status.",
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
          "Der stilles krav til bestemte fag ('core courses') og et minimums-GPA. Danske gymnasiekarakterer omregnes til den amerikanske skala. Et stærkt karaktergennemsnit udvider dine muligheder markant.",
        ],
      },
      {
        heading: "SAT/ACT og sprogtest",
        body: [
          "Standardiserede prøver (SAT/ACT) har historisk indgået i spilleberettigelsen, men kravene er under forandring, og mange skoler er blevet test-optional ved optagelse. Som ikke-engelsktalende skal du ofte dokumentere engelskniveau (fx TOEFL/Duolingo). Tjek altid de nyeste krav hos den enkelte skole og hos NCAA.",
        ],
      },
      {
        heading: "Amatørstatus",
        body: [
          "NCAA har regler om tidligere professionel aktivitet og betaling. For europæiske atleter med klub- eller ungdomssport kan det være et særligt opmærksomhedspunkt, da fx kontrakter eller pengepræmier kan påvirke status. Få det afklaret tidligt.",
        ],
      },
    ],
    faqs: [
      {
        q: "Skal jeg tage SAT for at komme i NCAA?",
        a: "Kravene har ændret sig, og mange skoler er test-optional. Det varierer mellem skoler og kan ændre sig fra år til år — tjek den aktuelle status hos den enkelte skole og NCAA.",
      },
    ],
    related: [
      { label: "Det amerikanske universitetssystem", href: "/viden/amerikansk-universitetssystem" },
      { label: "Redshirt & eligibility-år", href: "/viden/redshirt-og-eligibility" },
      { label: "NCAA vs NAIA vs NJCAA", href: "/viden/ncaa-naia-njcaa" },
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
          "Reglerne er løbende blevet lempet, og atleter kan i dag typisk skifte uden at skulle sidde en sæson over, som man tidligere skulle. Detaljerne — og antal tilladte skift — ændrer sig dog, så tjek den aktuelle status.",
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
    updated: UPDATED,
  },
  {
    slug: "redshirt-og-eligibility",
    category: "begreber",
    title: "Redshirt og eligibility-år forklaret",
    metaTitle: "Redshirt & eligibility-år i NCAA forklaret",
    description:
      "Hvad er en redshirt, og hvordan fungerer de fire eligibility-år inden for fem? Forstå reglerne for, hvor længe man må konkurrere i NCAA.",
    intro:
      "Hvor mange år må man egentlig spille i NCAA? Begreberne 'eligibility' og 'redshirt' forvirrer mange — her er forklaringen.",
    sections: [
      {
        heading: "Fire sæsoner inden for fem år",
        body: [
          "Som udgangspunkt har en NCAA-atlet fire sæsoners konkurrence at bruge, typisk inden for et vindue på fem år ('the five-year clock'). Uret begynder at tikke, når man indskrives på fuld tid.",
        ],
      },
      {
        heading: "Hvad er en redshirt?",
        body: [
          "At 'redshirte' betyder at sidde en sæson over — fx på grund af skade eller for at udvikle sig — uden at bruge et af sine fire konkurrenceår. En 'redshirt freshman' er altså i sit andet år på campus, men sit første som spillende.",
        ],
      },
      {
        heading: "Ændringer og undtagelser",
        body: [
          "Reglerne har været under forandring (bl.a. ekstra år givet under COVID, og løbende justeringer for JUCO- og transfer-atleter). Der findes også medicinske dispensationer ('medical redshirt'). Tjek den aktuelle status for din situation.",
        ],
      },
      {
        heading: "Class year vs. eligibility",
        body: [
          "Bemærk, at en atlets studieår (freshman/sophomore/junior/senior) ikke altid følger antallet af brugte konkurrenceår. På vores profiler viser vi ofte forventet dimissionsår. Se også [akademiske krav](/viden/akademiske-krav).",
        ],
      },
    ],
    related: [
      { label: "Transfer Portal forklaret", href: "/viden/transfer-portal" },
      { label: "Akademiske krav & eligibility", href: "/viden/akademiske-krav" },
      { label: "Ordbog: college sport-begreber", href: "/viden/college-sport-ordbog" },
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
      { heading: "Amatørstatus (amateurism)", body: ["NCAA-regler om, at atleter ikke må have tjent penge som professionelle. Vigtigt for mange europæere — se [akademiske krav](/viden/akademiske-krav)."] },
      { heading: "Conference", body: ["Sammenslutning af universiteter, der konkurrerer i samme liga. Se [conferences forklaret](/viden/conferences)."] },
      { heading: "Commit", body: ["Når en atlet (mundtligt) forpligter sig til en skole, før papirerne er underskrevet på [Signing Day](/viden/signing-day-og-nli)."] },
      { heading: "Division I / II / III", body: ["NCAA's tre niveauer. Se [divisioner forklaret](/viden/ncaa-divisioner)."] },
      { heading: "Eligibility", body: ["Spilleberettigelse — om du må konkurrere akademisk og som amatør. Se [redshirt & eligibility](/viden/redshirt-og-eligibility)."] },
      { heading: "FBS / FCS", body: ["De to øverste niveauer i D-I [football](/football): Football Bowl Subdivision og Football Championship Subdivision."] },
      { heading: "Freshman / sophomore / junior / senior", body: ["Studieårene 1.–4. år på et amerikansk universitet."] },
      { heading: "GPA", body: ["Grade Point Average — karaktergennemsnit på en 4,0-skala. Se [universitetssystemet](/viden/amerikansk-universitetssystem)."] },
      { heading: "JUCO", body: ["Junior college (NJCAA) — toårig skole, ofte springbræt. Se [NCAA vs NAIA vs NJCAA](/viden/ncaa-naia-njcaa)."] },
      { heading: "March Madness", body: ["D-I-basketballturneringen i marts. Se [March Madness forklaret](/viden/march-madness-forklaret)."] },
      { heading: "Mid-major", body: ["Conference uden for de største 'power'-conferences. Se [conferences](/viden/conferences)."] },
      { heading: "Redshirt", body: ["At sidde en sæson over uden at bruge et konkurrenceår. Se [redshirt & eligibility](/viden/redshirt-og-eligibility)."] },
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
    updated: UPDATED,
  },
  {
    slug: "march-madness-forklaret",
    category: "saeson",
    title: "March Madness forklaret",
    metaTitle: "March Madness forklaret — guide for danskere",
    description:
      "68 hold, single-elimination og en hel nation i basketball-feber. Sådan fungerer March Madness — NCAA's store basketballturnering.",
    intro:
      "March Madness er et af USA's største sportsbegivenheder. Her er, hvordan turneringen fungerer — og hvorfor den er værd at følge for danske basketballfans.",
    sections: [
      {
        heading: "Hvad er March Madness?",
        body: [
          "March Madness er NCAA Division I's afsluttende basketballturnering for både kvinder og mænd, der spilles hen over marts og april. 68 hold spiller single-elimination — taber du én kamp, er du ude. Det skaber de berømte overraskelser ('upsets').",
        ],
      },
      {
        heading: "Bracket og de berømte runder",
        body: [
          "Holdene seedes i et 'bracket'. Efter de indledende kampe ('First Four') følger runderne ned mod Sweet 16, Elite Eight og Final Four, inden mesteren findes. Millioner udfylder deres egen bracket og forsøger at forudsige vinderne.",
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
          "College Football Playoff er slutspillet, der kårer den nationale mester i Division I [football](/football). Et udvalg rangerer de bedste hold, der derefter spiller om titlen. Fra 2024-sæsonen blev feltet udvidet til 12 hold — formatet har ændret sig over tid, så tjek den aktuelle struktur.",
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
          "NLI har historisk været den bindende aftale, der knytter atlet og skole sammen mod tilbud om idrætsstøtte. Systemet er imidlertid under forandring, og dele af det er ved at blive erstattet af andre aftaleformer. Tjek den aktuelle status, før du regner med specifikke regler.",
        ],
      },
      {
        heading: "Hvad betyder det for danske atleter?",
        body: [
          "For danskere er det vigtigt at forstå, hvornår en aftale bliver bindende, og hvad den dækker. Sørg for, at det akademiske er på plads først — se [akademiske krav](/viden/akademiske-krav).",
        ],
      },
    ],
    related: [
      { label: "Akademiske krav & eligibility", href: "/viden/akademiske-krav" },
      { label: "Ordbog: college sport-begreber", href: "/viden/college-sport-ordbog" },
      { label: "Alle danske atleter", href: "/atleter" },
    ],
    updated: UPDATED,
  },
];

export function getGuide(slug: string): VidenGuide | undefined {
  return VIDEN_GUIDES.find((g) => g.slug === slug);
}

export function getGuideSlugs(): string[] {
  return VIDEN_GUIDES.map((g) => g.slug);
}
