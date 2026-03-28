/**
 * Statisk indhold til sport-landingssider (/{sport}/).
 * Intro vises i hero-banneret, pillar er evergreen SEO-tekst i bunden.
 */

export interface SportContent {
  /** Visningsnavn */
  title: string;
  /** 1-2 sætninger til hero-banneret */
  intro: string;
  /** SEO meta-description */
  metaDescription: string;
  /** Evergreen pillar-tekst (markdown). Placeres i bunden af siden. */
  pillar: string;
}

export const SPORT_CONTENT: Record<string, SportContent> = {
  football: {
    title: "Football",
    intro:
      "Danske kickers, punters og wide receivers på NCAA-hold i hele USA. Følg deres kampe, resultater og vejen fra Danmark til college football.",
    metaDescription:
      "Danske football-atleter i NCAA – nyheder, profiler og resultater fra college football i USA.",
    pillar: `## Dansk football i NCAA

Amerikansk football er den sportsgren, der har åbnet flest døre for danske atleter i USA. Særligt kicker- og punter-positionen er blevet en dansk specialitet — det kræver præcision og is i maven, og den danske fodboldtradition giver et solidt fundament for sparketeknik.

### Sæsonens gang

College football-sæsonen løber fra september til december, med bowl games og playoffs i januar. Forårssemestret bruges til styrketræning og spring practice. Holdene spiller typisk 12 kampe i den regulære sæson plus eventuelle postseason-kampe.

### Kendte danske football-atleter

Danmark har en stolt tradition for at sende spillere til topniveauet. Morten Andersen — "The Great Dane" — er den mest berømte, men nye generationer følger i hans fodspor på universiteter i Power Five-conferences og beyond.`,
  },

  basketball: {
    title: "Basketball",
    intro:
      "Danske basketballspillere på amerikanske universiteter. Fra danske klubber til NCAA-parkettet — følg deres udvikling og resultater.",
    metaDescription:
      "Danske basketball-atleter i NCAA – nyheder, profiler og resultater fra college basketball i USA.",
    pillar: `## Dansk basketball i NCAA

Basketball har i de seneste år set en stigende interesse fra danske atleter, der drømmer om at spille på højt niveau i USA. Den danske liga giver et godt fundament, og flere spillere har gjort springet til NCAA Division I og II.

### Sæsonens gang

NCAA basketball-sæsonen begynder i november og kulminerer med March Madness — det legendariske slutspil i marts og april. Holdene spiller 25-35 kampe, og conference-turneringer afgør de sidste pladser i NCAA-turneringen.

### Danske spilleres styrke

Danske spillere har typisk fordel af deres alsidighed og holdspilsmentalitet. Flere har opnået startpladser på Division I-hold, og det tekniske niveau og den taktiske forståelse fra dansk basketball vurderes positivt af amerikanske trænere.`,
  },

  baseball: {
    title: "Baseball",
    intro:
      "Danske baseball-spillere i NCAA. Følg danskerne, der har taget springet fra dansk baseball til amerikanske college-hold.",
    metaDescription:
      "Danske baseball-atleter i NCAA – nyheder, profiler og resultater fra college baseball i USA.",
    pillar: `## Dansk baseball i NCAA

Baseball er en nichesport i Danmark, men det lille danske baseballmiljø har alligevel produceret atleter, der kan konkurrere på NCAA-niveau. Den voksende interesse for sporten har åbnet døre for danske talenter.

### Sæsonens gang

College baseball-sæsonen løber fra februar til juni, med College World Series i Omaha som sæsonens absolutte højdepunkt. Holdene spiller op til 56 kampe i den regulære sæson — et af de mest intense programmer i NCAA.

### Dansk baseball på vej frem

Softball og baseball er voksende sportsgrene i Danmark, og med flere og flere unge, der tager sporten op, kan vi forvente at se flere danskere på amerikanske college-hold i de kommende år.`,
  },

  fodbold: {
    title: "Fodbold",
    intro:
      "Danske fodboldspillere på NCAA-hold. Fodbold (soccer) er en af de mest populære sportsgrene for danske atleter i USA.",
    metaDescription:
      "Danske fodboldspillere (soccer) i NCAA – nyheder, profiler og resultater fra college soccer i USA.",
    pillar: `## Dansk fodbold i NCAA (soccer)

Fodbold — eller soccer, som det hedder i USA — er en af de mest populære veje for danske atleter til amerikanske universiteter. Med et af verdens stærkeste ungdomssystemer har danske fodboldspillere et naturligt forspring.

### Sæsonens gang

NCAA soccer-sæsonen er kort og intens: august til december, med ca. 20 kampe. Forårssemestret bruges til individuel udvikling og forårsturneringer. College Cup — NCAAʼs slutspil — afgøres i december.

### Danske spilleres styrke

Den danske fodboldtradition med fokus på boldbehandling, positionsspil og taktisk disciplin passer godt til college soccer. Mange danske spillere opnår startpladser fra dag ét og bidrager til deres holds succes på højeste niveau.`,
  },

  svoemning: {
    title: "Svømning",
    intro:
      "Danske svømmere på NCAA-hold i USA. Fra danske svømmeklubber til college pools — følg de danske talenter.",
    metaDescription:
      "Danske svømmere i NCAA – nyheder, profiler og resultater fra college-svømning i USA.",
    pillar: `## Dansk svømning i NCAA

Danmark har en stærk svømmetradition, og NCAA tilbyder en unik mulighed for danske svømmere til at kombinere sport på højt niveau med en amerikansk universitetsuddannelse. Flere danske svømmere har opnået imponerende resultater i college-regi.

### Sæsonens gang

College-svømning løber fra oktober til marts, med NCAA Championships som sæsonens højdepunkt. Træningen er intensiv — op til 20 timer om ugen i vandet plus styrketræning. Forårssemestret bruges til træning og off-season-stævner.

### Dansk svømnings styrke

Den danske svømmeskole, med fokus på teknik og udholdenhed, forbereder atleterne godt til det amerikanske college-system. Flere danskere har sat universitetsrekorder og kvalificeret sig til NCAA Championships.`,
  },

  atletik: {
    title: "Atletik",
    intro:
      "Danske atletikudøvere i NCAA. Sprint, spring, kast og mellemdistance — følg danskere på college-hold i USA.",
    metaDescription:
      "Danske atletikudøvere i NCAA – nyheder, profiler og resultater fra track and field i USA.",
    pillar: `## Dansk atletik i NCAA (track & field)

Atletik er en af de største sportsgrene i NCAA, og danske atleter har gode muligheder for at konkurrere på højt niveau. Fra sprint til kast, fra spring til mellemdistance — der er plads til danske talenter i alle discipliner.

### Sæsonens gang

College atletik har to sæsoner: indendørs (januar-marts) og udendørs (marts-juni). NCAA Indoor og Outdoor Championships er sæsonens højdepunkter. Kryds- og tværtræning med cross country (efterår) er almindeligt.

### Danske atleter i topklassen

Flere danske atletikudøvere har sat sig spor i NCAA med All-American-udnævnelser og conference-mesterskaber. Den danske atletiktradition, særligt inden for mellemdistance og spring, passer godt til det amerikanske college-system.`,
  },

  golf: {
    title: "Golf",
    intro:
      "Danske golfspillere på NCAA-hold. Danmark har en stærk golftradition, og flere talenter spiller på amerikanske universiteter.",
    metaDescription:
      "Danske golfspillere i NCAA – nyheder, profiler og resultater fra college golf i USA.",
    pillar: `## Dansk golf i NCAA

Golf er en af de sportsgrene, hvor danske atleter har markeret sig allermest i NCAA. Danmarks stærke golftradition og høje niveau i ungdomsgolf gør det til en naturlig vej til amerikanske universiteter.

### Sæsonens gang

College golf har to sæsoner: efterår (september-november) og forår (februar-maj). NCAA Championships spilles i maj og er en af golfsportens mest prestigefyldte college-begivenheder.

### Dansk succes på green

Flere danskere har vundet individuelle NCAA-turneringer og bidraget til holdets succes i conference-mesterskaber. Vejen fra dansk ungdomsgolf til NCAA er veletableret, og mange bruger college golf som springbræt til professionel golf.`,
  },

  tennis: {
    title: "Tennis",
    intro:
      "Danske tennisspillere i NCAA. Følg de danske talenter, der kombinerer topsport og uddannelse på amerikanske universiteter.",
    metaDescription:
      "Danske tennisspillere i NCAA – nyheder, profiler og resultater fra college tennis i USA.",
    pillar: `## Dansk tennis i NCAA

Tennis er en af de mest populære sportsgrene for internationale atleter i NCAA, og danske spillere har en stærk tilstedeværelse. Det individuelle format og det høje niveau i dansk tennis gør det til en oplagt mulighed.

### Sæsonens gang

College tennis-sæsonen løber fra januar til maj, med NCAA Championships i maj. Holdene spiller dual matches (hold mod hold), og individuel ranking spiller en central rolle. Efteråret bruges til individuelle turneringer og træning.

### Dansk tennis i USA

Danske tennisspillere har tradition for at klare sig godt i det amerikanske college-system. Den tekniske træning og kamperfaring fra dansk og europæisk tennis giver et solidt fundament for NCAA-konkurrence.`,
  },

  roning: {
    title: "Roning",
    intro:
      "Danske roere på NCAA-hold. Roning er en stor sport i det amerikanske college-system, og danske roere er eftertragtede.",
    metaDescription:
      "Danske roere i NCAA – nyheder, profiler og resultater fra college rowing i USA.",
    pillar: `## Dansk roning i NCAA

Roning har en særlig plads i NCAA, især for kvinder, og Danmarks stærke roklubber og traditioner gør det til en naturlig base for atleter, der vil konkurrere i USA.

### Sæsonens gang

College-roning har to sæsoner: efterår (head races) og forår (sprint racing). NCAA Championships afholdes i maj/juni. Træningen er intensiv med morgen- og eftermiddagssessioner.

### Dansk roning internationalt

Den danske roningstradition er stærk, og flere danskere har brugt NCAA som springbræt til international konkurrence. College-roning tilbyder en unik kombination af holdsport og individuel udvikling.`,
  },

  gymnastik: {
    title: "Gymnastik",
    intro:
      "Danske gymnaster på NCAA-hold. Følg de danske talenter inden for kunstnerisk gymnastik og rytmisk gymnastik i USA.",
    metaDescription:
      "Danske gymnaster i NCAA – nyheder, profiler og resultater fra college gymnastics i USA.",
    pillar: `## Dansk gymnastik i NCAA

Gymnastik er en af NCAAʼs mest populære sportsgrene med stor publikumsinteresse. Danske gymnaster, der har trænet på højt niveau i Danmark eller Skandinavien, kan finde gode muligheder i det amerikanske college-system.

### Sæsonens gang

College-gymnastik løber fra januar til april, med NCAA Championships i april. Holdene konkurrerer i fire apparater (kvinder) eller seks apparater (herrer), og holdscoren afgør placeringen.

### Dansk gymnastiktradition

Danmarks gymnastiktradition er bred — fra folkelig gymnastik til konkurrencegymnastik. De atleter, der tager springet til NCAA, kommer typisk fra konkurrencemiljøet og bringer en stærk teknisk baggrund med sig.`,
  },

  ishockey: {
    title: "Ishockey",
    intro:
      "Danske ishockeyspillere på amerikanske universiteter. Følg danskerne i NCAA og college hockey.",
    metaDescription:
      "Danske ishockeyspillere i NCAA – nyheder, profiler og resultater fra college hockey i USA.",
    pillar: `## Dansk ishockey i NCAA

Ishockey er en stor sport i det amerikanske college-system, med intense rivaliseringer og høj kvalitet. Danske ishockeyspillere, der har udviklet sig i Metal Ligaen eller danske ungdomsprogrammer, kan finde en vej til NCAA.

### Sæsonens gang

College hockey-sæsonen løber fra oktober til april, med Frozen Four som det store klimaks. Holdene spiller ca. 34 kampe i den regulære sæson, efterfulgt af conference-turneringer og NCAA-turneringen.

### Dansk ishockey i vækst

Med den danske ishockeys stigende niveau og flere danske spillere i professionelle ligaer verden over, er NCAA-vejen en attraktiv mulighed for unge danske spillere, der vil kombinere sport og uddannelse.`,
  },

  volleyball: {
    title: "Volleyball",
    intro:
      "Danske volleyballspillere i NCAA. Følg de danske talenter på amerikanske universitetshold.",
    metaDescription:
      "Danske volleyballspillere i NCAA – nyheder, profiler og resultater fra college volleyball i USA.",
    pillar: `## Dansk volleyball i NCAA

Volleyball er en af NCAAʼs største sportsgrene, især for kvinder, med tusindvis af hold på tværs af divisioner. Danske volleyballspillere har gode muligheder, da sporten er mindre eksponeret internationalt end fx fodbold.

### Sæsonens gang

Kvindevolleyball spilles i efteråret (august-december), mens herrevolleyball er en forårssport (januar-maj). NCAA Volleyball Championship er en af efterårets store begivenheder med stor mediedækning.

### Danske spillere i NCAA

Den danske volleyballtradition med fokus på teknik og taktik passer godt til college-sporten. Flere danske spillere har opnået startpladser og gjort sig bemærket med All-Conference-udnævnelser.`,
  },

  andet: {
    title: "Andre sportsgrene",
    intro:
      "Danske atleter i mindre repræsenterede sportsgrene i NCAA — fra lacrosse til fægtning.",
    metaDescription:
      "Danske atleter i øvrige NCAA-sportsgrene – nyheder og profiler fra niche-sportsgrene i USA.",
    pillar: `## Andre sportsgrene i NCAA

NCAA dækker over 20 sportsgrene, og danske atleter kan findes i mange af dem. Fra lacrosse til fægtning, fra vandsport til vintersport — mulighederne er bredere, end de fleste tror.

### Nye veje til USA

Efterhånden som kendskabet til NCAA-systemet vokser i Danmark, ser vi atleter fra stadig flere sportsgrene tage springet. Mange af NCAAʼs mindre sportsgrene har mindre konkurrence om pladserne, hvilket kan være en fordel for danske atleter med talent inden for nichesportsgrene.`,
  },
};

/** Hent indhold for en sport — returnerer undefined hvis sporten ikke findes */
export function getSportContent(sport: string): SportContent | undefined {
  return SPORT_CONTENT[sport.toLowerCase()];
}

/** Alle sport-slugs der har en landingsside */
export function getSportSlugs(): string[] {
  return Object.keys(SPORT_CONTENT);
}
