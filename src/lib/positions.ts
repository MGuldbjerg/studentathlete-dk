/**
 * POSITIONS-ORDBOG — rediger frit, det er meningen.
 * ================================================
 *
 * Amerikanske rosters skriver positioner i forkortelser, og de betyder ikke det
 * samme på tværs af sportsgrene: "C" er catcher i baseball, center i basketball
 * og målmand-ish "Center" i ishockey. "F" er forward i basketball, men angriber
 * i fodbold. Uden en ordbog ender profilteksten med "spiller fodbold som F".
 *
 * SÅDAN RETTER DU (det kræver ingen kodeforståelse):
 *  · Ret et ord?      Find sporten nedenfor og skriv den tekst du vil se.
 *  · Mangler en kode? Tilføj en linje:  "kode": "det der skal stå",
 *  · Fjern en kode?   Slet linjen — så vises skolens egen tekst uændret.
 *
 * REGLER teksten her følger:
 *  1. Nøglen (til venstre) skrives med små bogstaver. Opslaget er
 *     versal-ufølsomt og ignorerer punktummer, så "C.", "c" og "C" rammer alle
 *     nøglen "c".
 *  2. Værdien (til højre) skrives med lille begyndelsesbogstav, fordi den
 *     bruges midt i en sætning: "… spiller fodbold som midtbanespiller."
 *  3. Både forkortelser OG hele engelske ord må stå som nøgler. Hele ord er
 *     pointen i fodbold og ishockey, hvor dansk har sine egne ord
 *     ("Midfielder" → "midtbanespiller").
 *  4. Kender vi ikke koden, vises skolens egen tekst uændret. Vi gætter aldrig.
 *
 * HVORFOR står der engelsk i basketball, football og baseball?
 * Fordi dansk sportssprog gør det: man siger "point guard" og "quarterback",
 * ikke "punktvogter". I fodbold og ishockey er det omvendt. Du bestemmer —
 * ret bare værdien, hvis du er uenig.
 *
 * Nøglen for sporten skal matche `athletes.sport`, som gemmes med SMÅ
 * bogstaver ("fodbold", "svømning", …).
 */

export const POSITION_TERMS: Record<string, Record<string, string>> = {
  // ── Fodbold ────────────────────────────────────────────────────────────────
  // Dansk har egne ord — derfor oversættes de hele engelske ord også.
  fodbold: {
    gk: "målmand",
    g: "målmand",
    k: "målmand",
    goalkeeper: "målmand",
    keeper: "målmand",
    d: "forsvarsspiller",
    def: "forsvarsspiller",
    defense: "forsvarsspiller",
    defence: "forsvarsspiller",
    defender: "forsvarsspiller",
    back: "forsvarsspiller",
    // Allerede dansk i vores egne seed-data — normaliseres til samme ord.
    forsvar: "forsvarsspiller",
    midtbane: "midtbanespiller",
    angreb: "angriber",
    cb: "midterforsvarer",
    "center back": "midterforsvarer",
    lb: "venstre back",
    rb: "højre back",
    fb: "back",
    "full back": "back",
    fullback: "back",
    m: "midtbanespiller",
    mf: "midtbanespiller",
    mid: "midtbanespiller",
    midfielder: "midtbanespiller",
    midfield: "midtbanespiller",
    cm: "central midtbanespiller",
    dm: "defensiv midtbanespiller",
    am: "offensiv midtbanespiller",
    wm: "kantspiller",
    winger: "kantspiller",
    w: "kantspiller",
    f: "angriber",
    fw: "angriber",
    forward: "angriber",
    st: "angriber",
    striker: "angriber",
    attacker: "angriber",
  },

  // ── Basketball ─────────────────────────────────────────────────────────────
  basketball: {
    g: "guard",
    pg: "point guard",
    sg: "shooting guard",
    f: "forward",
    sf: "small forward",
    pf: "power forward",
    c: "center",
    guard: "guard",
    forward: "forward",
    center: "center",
    wing: "wing",
  },

  // ── Baseball / softball ────────────────────────────────────────────────────
  baseball: {
    p: "pitcher",
    rhp: "højrehåndet pitcher",
    lhp: "venstrehåndet pitcher",
    sp: "starting pitcher",
    rp: "relief pitcher",
    c: "catcher",
    "1b": "first baseman",
    "2b": "second baseman",
    "3b": "third baseman",
    ss: "shortstop",
    if: "infielder",
    inf: "infielder",
    of: "outfielder",
    outf: "outfielder",
    lf: "left fielder",
    cf: "center fielder",
    rf: "right fielder",
    dh: "designated hitter",
    ut: "utility-spiller",
    util: "utility-spiller",
    // Hele ord med småt: de står midt i en dansk sætning ("… som pitcher").
    pitcher: "pitcher",
    catcher: "catcher",
    infielder: "infielder",
    outfielder: "outfielder",
    shortstop: "shortstop",
  },

  // ── Amerikansk fodbold ─────────────────────────────────────────────────────
  football: {
    qb: "quarterback",
    rb: "running back",
    hb: "halfback",
    fb: "fullback",
    wr: "wide receiver",
    te: "tight end",
    ol: "offensive lineman",
    ot: "offensive tackle",
    og: "offensive guard",
    c: "center",
    dl: "defensive lineman",
    de: "defensive end",
    dt: "defensive tackle",
    lb: "linebacker",
    olb: "outside linebacker",
    ilb: "inside linebacker",
    mlb: "middle linebacker",
    db: "defensive back",
    cb: "cornerback",
    s: "safety",
    fs: "free safety",
    ss: "strong safety",
    k: "kicker",
    pk: "placekicker",
    p: "punter",
    ls: "long snapper",
    ath: "athlete",
    // Hele ord med småt: de står midt i en dansk sætning ("… som tight end").
    quarterback: "quarterback",
    "running back": "running back",
    "wide receiver": "wide receiver",
    "tight end": "tight end",
    "offensive line": "offensive lineman",
    "offensive lineman": "offensive lineman",
    "defensive line": "defensive lineman",
    "defensive lineman": "defensive lineman",
    "defensive back": "defensive back",
    "defensive end": "defensive end",
    linebacker: "linebacker",
    cornerback: "cornerback",
    safety: "safety",
    kicker: "kicker",
    punter: "punter",
  },

  // ── Volleyball ─────────────────────────────────────────────────────────────
  volleyball: {
    oh: "outside hitter",
    mb: "middle blocker",
    mh: "middle hitter",
    opp: "opposite hitter",
    rs: "right side hitter",
    s: "setter",
    l: "libero",
    libero: "libero",
    ds: "defensiv specialist",
    // Hele ord med småt: de står midt i en dansk sætning ("… som setter").
    setter: "setter",
    "outside hitter": "outside hitter",
    "middle blocker": "middle blocker",
    "opposite hitter": "opposite hitter",
  },

  // ── Ishockey ───────────────────────────────────────────────────────────────
  // Dansk hockey-sprog: målmand, back, angriber (ikke "goalie"/"defenseman").
  ishockey: {
    g: "målmand",
    gk: "målmand",
    goalie: "målmand",
    goaltender: "målmand",
    d: "back",
    def: "back",
    defense: "back",
    defence: "back",
    defenseman: "back",
    f: "angriber",
    forward: "angriber",
    c: "center",
    lw: "venstre wing",
    rw: "højre wing",
    w: "wing",
    winger: "wing",
  },

  // ── Svømning (disciplin står i position-feltet) ────────────────────────────
  svømning: {
    fr: "freestyle",
    free: "freestyle",
    freestyle: "freestyle",
    bk: "rygcrawl",
    back: "rygcrawl",
    backstroke: "rygcrawl",
    br: "brystsvømning",
    breast: "brystsvømning",
    breaststroke: "brystsvømning",
    fl: "butterfly",
    fly: "butterfly",
    butterfly: "butterfly",
    im: "individuel medley",
    "individual medley": "individuel medley",
    sprint: "sprint",
    distance: "distance",
    mid: "mellemdistance",
    diver: "udspringer",
    diving: "udspring",
    "1m": "1-meter udspring",
    "3m": "3-meter udspring",
    platform: "tårnudspring",
  },

  // ── Roning ─────────────────────────────────────────────────────────────────
  roning: {
    cox: "styrmand",
    coxswain: "styrmand",
    coxn: "styrmand",
    port: "bagbordsåre",
    starboard: "styrbordsåre",
    sculler: "sculler",
    sculling: "sculler",
    sweep: "åreroer",
    lw: "letvægtsroer",
    lightweight: "letvægtsroer",
  },

  // ── Gymnastik (redskab står i position-feltet) ─────────────────────────────
  gymnastik: {
    aa: "allround",
    "all-around": "allround",
    "all around": "allround",
    vt: "spring",
    vault: "spring",
    ub: "barre",
    "uneven bars": "barre",
    bars: "barre",
    bb: "bom",
    beam: "bom",
    fx: "gulv",
    floor: "gulv",
    ph: "bensvingsstol",
    sr: "ringe",
    rings: "ringe",
    pb: "barre",
    hb: "reck",
  },

  // ── Atletik ────────────────────────────────────────────────────────────────
  // NB: her oversætter vi til det ENGELSKE disciplinnavn med vilje.
  // profile-baseline.ts genkender disciplinen på engelsk og vælger derefter det
  // rigtige danske verbum ("løber som sprinter" vs. "kæmper i kuglestød").
  // Skriver du dansk her, går den logik i stykker.
  atletik: {
    sp: "shot put",
    dt: "discus",
    ht: "hammer throw",
    jt: "javelin",
    hj: "high jump",
    lj: "long jump",
    tj: "triple jump",
    pv: "pole vault",
    md: "middle distance",
    ld: "distance",
    xc: "cross country",
    hurdles: "hurdles",
    hurd: "hurdles",
    dec: "decathlon",
    hep: "heptathlon",
    multi: "multi",
    thr: "throws",
    throws: "throws",
    jumps: "jumps",
    spr: "sprints",
  },
};

/** Adskillere i sammensatte positioner: "G/F", "P, OF", "F-C". */
const COMPOUND_SPLIT = /\s*[/,&]\s*|\s+-\s+/;

/** Nøgle-normalisering: små bogstaver, ingen punktummer, ét mellemrum. */
function normalizeKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Slår ét led op. Ukendt led returneres uændret (vi gætter aldrig). */
function expandOne(sportKey: string, part: string): string {
  const table = POSITION_TERMS[sportKey];
  if (!table) return part.trim();
  const key = normalizeKey(part);
  if (!key) return "";

  const hit = table[key];
  if (hit) return hit;

  // "F-C"/"G-F": kort bindestregs-par er to forkortelser, ikke ét ord.
  // Kun når begge sider er korte — ellers ville "cross-country" blive splittet.
  const dash = key.split("-");
  if (dash.length === 2 && dash.every((d) => d.length > 0 && d.length <= 3)) {
    const both = dash.map((d) => table[d] ?? d);
    if (both.some((b, i) => b !== dash[i])) return both.join("/");
  }

  return part.trim();
}

/**
 * Udvid en roster-position til noget der kan læses i en sætning.
 *
 *   expandPosition("basketball", "F")   → "forward"
 *   expandPosition("baseball", "C")     → "catcher"
 *   expandPosition("fodbold", "Midfielder") → "midtbanespiller"
 *   expandPosition("basketball", "G/F") → "guard/forward"
 *   expandPosition("golf", "Whatever")  → "Whatever"   (ukendt sport → uændret)
 *
 * Returnerer null for tomt input. Ukendte koder returneres uændret, så vi
 * aldrig opfinder en rolle atleten ikke har.
 */
export function expandPosition(sport: string, position: string | null | undefined): string | null {
  if (!position) return null;
  const raw = position.trim();
  if (!raw) return null;

  const sportKey = sport.trim().toLowerCase();
  const parts = raw.split(COMPOUND_SPLIT).filter((p) => p.trim().length > 0);
  if (parts.length === 0) return null;

  const expanded = parts.map((p) => expandOne(sportKey, p)).filter((p) => p.length > 0);
  return expanded.length > 0 ? expanded.join("/") : raw;
}
