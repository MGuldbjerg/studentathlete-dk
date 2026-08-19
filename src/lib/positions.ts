/**
 * KERNE: roster-forkortelse → sprogfrit position-BEGREB.
 * ======================================================
 *
 * "C" betyder ikke det samme på tværs af sportsgrene: catcher i baseball,
 * center i basketball. Den viden er universel — den er lige sand for et tysk
 * site — så den bor her, i kernen, og oversættes ikke.
 *
 * Selve ORDET læseren ser ("midtbanespiller") står i sprogpakken
 * (`src/lib/i18n/da.ts` → `positionPhrase`). Nyt sprog = oversæt begreberne,
 * ikke tabellen nedenfor.
 *
 * SÅDAN RETTER DU:
 *  · Mangler en kode?  Tilføj `"kode": "begreb",` under den rigtige sport.
 *  · Forkert ord?      Ret formuleringen i sprogpakken, ikke her.
 *  · Nyt begreb?       Tilføj det begge steder — ellers vises begrebets id råt.
 *
 * REGLER:
 *  1. Nøgler med små bogstaver. Opslag er versal-ufølsomt og ignorerer punktummer.
 *  2. Begreber er sprogfri id'er med understreg ("attacking_midfielder").
 *  3. Ukendt kode → skolens egen tekst vises uændret. Vi gætter aldrig.
 *  4. Ukendt BEGREB (mangler i sprogpakken) → id'et bruges som det er. Det er
 *     med vilje sådan atletik virker: disciplin-id'erne ER de engelske
 *     øvelsesnavne ("shot put"), fordi den danske profil-grammatik genkender
 *     dem og selv vælger "kæmper i kuglestød". Oversætter man dem, går det i stykker.
 */
import type { SportKey } from "./sports";
import { languagePack } from "./i18n";

export const POSITION_CODES: Record<SportKey, Record<string, string>> = {
  // ── Fodbold ────────────────────────────────────────────────────────────────
  soccer: {
    gk: "goalkeeper",
    g: "goalkeeper",
    k: "goalkeeper",
    goalkeeper: "goalkeeper",
    keeper: "goalkeeper",
    d: "defender",
    def: "defender",
    defense: "defender",
    defence: "defender",
    defender: "defender",
    back: "defender",
    forsvar: "defender",
    cb: "centre_back",
    "center back": "centre_back",
    lb: "left_back",
    rb: "right_back",
    fb: "fullback",
    "full back": "fullback",
    fullback: "fullback",
    m: "midfielder",
    mf: "midfielder",
    mid: "midfielder",
    midfielder: "midfielder",
    midfield: "midfielder",
    midtbane: "midfielder",
    cm: "central_midfielder",
    dm: "defensive_midfielder",
    am: "attacking_midfielder",
    wm: "winger",
    winger: "winger",
    w: "winger",
    f: "striker",
    fw: "striker",
    forward: "striker",
    st: "striker",
    striker: "striker",
    attacker: "striker",
    angreb: "striker",
  },

  // ── Basketball ─────────────────────────────────────────────────────────────
  basketball: {
    g: "guard",
    pg: "point_guard",
    sg: "shooting_guard",
    f: "forward",
    sf: "small_forward",
    pf: "power_forward",
    c: "center",
    guard: "guard",
    forward: "forward",
    center: "center",
    wing: "wing",
  },

  // ── Baseball / softball ────────────────────────────────────────────────────
  baseball: {
    p: "pitcher",
    rhp: "right_handed_pitcher",
    lhp: "left_handed_pitcher",
    sp: "starting_pitcher",
    rp: "relief_pitcher",
    c: "catcher",
    "1b": "first_baseman",
    "2b": "second_baseman",
    "3b": "third_baseman",
    ss: "shortstop",
    if: "infielder",
    inf: "infielder",
    of: "outfielder",
    outf: "outfielder",
    lf: "left_fielder",
    cf: "center_fielder",
    rf: "right_fielder",
    dh: "designated_hitter",
    ut: "utility",
    util: "utility",
    pitcher: "pitcher",
    catcher: "catcher",
    infielder: "infielder",
    outfielder: "outfielder",
    shortstop: "shortstop",
  },

  // ── Amerikansk fodbold ─────────────────────────────────────────────────────
  football: {
    qb: "quarterback",
    rb: "running_back",
    hb: "halfback",
    fb: "am_fullback",
    wr: "wide_receiver",
    te: "tight_end",
    ol: "offensive_lineman",
    ot: "offensive_tackle",
    og: "offensive_guard",
    c: "center",
    dl: "defensive_lineman",
    de: "defensive_end",
    dt: "defensive_tackle",
    lb: "linebacker",
    olb: "outside_linebacker",
    ilb: "inside_linebacker",
    mlb: "middle_linebacker",
    db: "defensive_back",
    cb: "cornerback",
    s: "safety",
    fs: "free_safety",
    ss: "strong_safety",
    k: "kicker",
    pk: "placekicker",
    p: "punter",
    ls: "long_snapper",
    ath: "athlete",
    quarterback: "quarterback",
    "running back": "running_back",
    "wide receiver": "wide_receiver",
    "tight end": "tight_end",
    "offensive line": "offensive_lineman",
    "offensive lineman": "offensive_lineman",
    "defensive line": "defensive_lineman",
    "defensive lineman": "defensive_lineman",
    "defensive back": "defensive_back",
    "defensive end": "defensive_end",
    linebacker: "linebacker",
    cornerback: "cornerback",
    safety: "safety",
    kicker: "kicker",
    punter: "punter",
  },

  // ── Volleyball ─────────────────────────────────────────────────────────────
  // ── Landhockey ─────────────────────────────────────────────────────────────
  // Begreberne er DE SAMME som fodboldens (målmand, forsvar, midtbane,
  // angriber), så sprogpakkerne har dem allerede. Kun "sweeper" er ny — den
  // rolle bruges stadig i landhockey, hvor fodbolden har forlagt den.
  "field-hockey": {
    gk: "goalkeeper",
    g: "goalkeeper",
    goalkeeper: "goalkeeper",
    keeper: "goalkeeper",
    d: "defender",
    def: "defender",
    defense: "defender",
    defence: "defender",
    defender: "defender",
    back: "defender",
    b: "defender",
    fb: "fullback",
    fullback: "fullback",
    "full back": "fullback",
    cb: "centre_back",
    "center back": "centre_back",
    "centre back": "centre_back",
    sw: "sweeper",
    sweeper: "sweeper",
    m: "midfielder",
    mf: "midfielder",
    mid: "midfielder",
    midfield: "midfielder",
    midfielder: "midfielder",
    cm: "central_midfielder",
    dm: "defensive_midfielder",
    am: "attacking_midfielder",
    w: "winger",
    wing: "winger",
    winger: "winger",
    f: "striker",
    fw: "striker",
    forward: "striker",
    st: "striker",
    striker: "striker",
    attacker: "striker",
  },

  volleyball: {
    oh: "outside_hitter",
    mb: "middle_blocker",
    mh: "middle_hitter",
    opp: "opposite_hitter",
    rs: "right_side_hitter",
    s: "setter",
    l: "libero",
    libero: "libero",
    ds: "defensive_specialist",
    setter: "setter",
    "outside hitter": "outside_hitter",
    "middle blocker": "middle_blocker",
    "opposite hitter": "opposite_hitter",
  },

  // ── Ishockey ───────────────────────────────────────────────────────────────
  "ice-hockey": {
    g: "goalkeeper",
    gk: "goalkeeper",
    goalie: "goalkeeper",
    goaltender: "goalkeeper",
    d: "defenseman",
    def: "defenseman",
    defense: "defenseman",
    defence: "defenseman",
    defenseman: "defenseman",
    f: "hockey_forward",
    forward: "hockey_forward",
    c: "center",
    lw: "left_wing",
    rw: "right_wing",
    w: "wing",
    winger: "wing",
  },

  // ── Svømning (disciplin står i position-feltet) ────────────────────────────
  "swimming-and-diving": {
    fr: "freestyle",
    free: "freestyle",
    freestyle: "freestyle",
    bk: "backstroke",
    back: "backstroke",
    backstroke: "backstroke",
    br: "breaststroke",
    breast: "breaststroke",
    breaststroke: "breaststroke",
    fl: "butterfly",
    fly: "butterfly",
    butterfly: "butterfly",
    im: "individual_medley",
    "individual medley": "individual_medley",
    sprint: "sprint",
    distance: "distance",
    mid: "mid_distance",
    diver: "diver",
    diving: "diving",
    "1m": "diving_1m",
    "3m": "diving_3m",
    platform: "platform_diving",
  },

  // ── Roning ─────────────────────────────────────────────────────────────────
  rowing: {
    cox: "coxswain",
    coxswain: "coxswain",
    coxn: "coxswain",
    port: "port_side",
    starboard: "starboard_side",
    sculler: "sculler",
    sculling: "sculler",
    sweep: "sweep_rower",
    lw: "lightweight",
    lightweight: "lightweight",
  },

  // ── Gymnastik (redskab står i position-feltet) ─────────────────────────────
  gymnastics: {
    aa: "all_around",
    "all-around": "all_around",
    "all around": "all_around",
    vt: "vault",
    vault: "vault",
    ub: "uneven_bars",
    "uneven bars": "uneven_bars",
    bars: "uneven_bars",
    bb: "balance_beam",
    beam: "balance_beam",
    fx: "floor_exercise",
    floor: "floor_exercise",
    ph: "pommel_horse",
    sr: "rings",
    rings: "rings",
    pb: "parallel_bars",
    hb: "high_bar",
  },

  // ── Atletik ────────────────────────────────────────────────────────────────
  // Begreberne ER de engelske øvelsesnavne, og de oversættes IKKE i sprogpakken
  // (se regel 4 i toppen). Profil-grammatikken genkender dem og vælger selv
  // "løber som sprinter" vs. "kæmper i kuglestød".
  "track-and-field": {
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

  // ── Rugby ──────────────────────────────────────────────────────────────────
  // Rosterne skriver enten trøjenummer-rollen ("No. 8") eller gruppen
  // ("Forward"/"Back"). Begge dele er ægte information for en rugbylæser.
  rugby: {
    p: "prop",
    prop: "prop",
    lh: "loosehead_prop",
    "loosehead prop": "loosehead_prop",
    loosehead: "loosehead_prop",
    th: "tighthead_prop",
    "tighthead prop": "tighthead_prop",
    tighthead: "tighthead_prop",
    h: "hooker",
    hooker: "hooker",
    l: "lock",
    lock: "lock",
    "second row": "lock",
    fl: "flanker",
    flank: "flanker",
    flanker: "flanker",
    "no 8": "number_eight",
    "no. 8": "number_eight",
    "number 8": "number_eight",
    n8: "number_eight",
    eightman: "number_eight",
    sh: "scrum_half",
    "scrum half": "scrum_half",
    "scrum-half": "scrum_half",
    fh: "fly_half",
    "fly half": "fly_half",
    "fly-half": "fly_half",
    "outside half": "fly_half",
    c: "centre",
    centre: "centre",
    center: "centre",
    ic: "inside_centre",
    "inside centre": "inside_centre",
    oc: "outside_centre",
    "outside centre": "outside_centre",
    w: "winger",
    wing: "winger",
    winger: "winger",
    fb: "fullback",
    fullback: "fullback",
    "full back": "fullback",
    forward: "front_row",
    "front row": "front_row",
    "back row": "back_row",
    "loose forward": "back_row",
    back: "back",
  },

  // ── Vandpolo ───────────────────────────────────────────────────────────────
  // "2-Meter" er den amerikanske betegnelse for centerspilleren og står på
  // rosterne både som angrebs- og forsvarsrolle.
  "water-polo": {
    gk: "goalkeeper",
    g: "goalkeeper",
    goalie: "goalkeeper",
    goalkeeper: "goalkeeper",
    d: "driver",
    driver: "driver",
    a: "attacker",
    attacker: "attacker",
    cf: "hole_set",
    "center forward": "hole_set",
    "centre forward": "hole_set",
    set: "hole_set",
    "hole set": "hole_set",
    "2m": "two_meter",
    "2 meter": "two_meter",
    "2-meter": "two_meter",
    "2md": "hole_defender",
    "2 meter defender": "hole_defender",
    cd: "hole_defender",
    "center defender": "hole_defender",
    u: "utility",
    util: "utility",
    utility: "utility",
    def: "defender",
    defender: "defender",
  },

  // ── Fægtning (våbnet står i position-feltet) ───────────────────────────────
  fencing: {
    e: "epee",
    ep: "epee",
    epee: "epee",
    "épée": "epee",
    f: "foil",
    fo: "foil",
    foil: "foil",
    s: "sabre",
    sa: "sabre",
    sabre: "sabre",
    saber: "sabre",
  },

  // ── Squash ─────────────────────────────────────────────────────────────────
  // Rosterne skriver stigepladsen ("#3"), ikke en position. Et tal er ikke en
  // rolle, så feltet forbliver tomt — som golf og tennis.
  squash: {},

  // ── Esport ─────────────────────────────────────────────────────────────────
  // Position-feltet er rollen i spillet. League of Legends-rollerne er de mest
  // udbredte; Valorant-rollerne står med, fordi holdene rekrutterer på dem.
  esports: {
    top: "top_lane",
    "top lane": "top_lane",
    toplane: "top_lane",
    jgl: "jungle",
    jng: "jungle",
    jungle: "jungle",
    jungler: "jungle",
    mid: "mid_lane",
    "mid lane": "mid_lane",
    midlane: "mid_lane",
    bot: "bot_lane",
    "bot lane": "bot_lane",
    adc: "ad_carry",
    "ad carry": "ad_carry",
    marksman: "ad_carry",
    sup: "support",
    supp: "support",
    support: "support",
    igl: "in_game_leader",
    "in-game leader": "in_game_leader",
    duelist: "duelist",
    controller: "controller",
    sentinel: "sentinel",
    initiator: "initiator",
  },

  // ── Lacrosse ───────────────────────────────────────────────────────────────
  // Herre- og damelacrosse har forskellige specialistroller: FOGO tager
  // opkastet hos herrerne, draw-specialisten gør det hos damerne.
  lacrosse: {
    a: "attackman",
    att: "attackman",
    attack: "attackman",
    attacker: "attackman",
    attackman: "attackman",
    m: "midfielder",
    mid: "midfielder",
    midfield: "midfielder",
    midfielder: "midfielder",
    lsm: "long_stick_midfielder",
    "long stick midfield": "long_stick_midfielder",
    ssdm: "defensive_midfielder",
    fo: "faceoff_specialist",
    fogo: "faceoff_specialist",
    faceoff: "faceoff_specialist",
    draw: "draw_specialist",
    "draw specialist": "draw_specialist",
    d: "defender",
    def: "defender",
    defense: "defender",
    defender: "defender",
    g: "goalkeeper",
    gk: "goalkeeper",
    goalie: "goalkeeper",
    goalkeeper: "goalkeeper",
  },

  // ── Softball (begreberne deles med baseball) ───────────────────────────────
  softball: {
    p: "pitcher",
    rhp: "right_handed_pitcher",
    lhp: "left_handed_pitcher",
    pitcher: "pitcher",
    c: "catcher",
    catcher: "catcher",
    "1b": "first_baseman",
    "2b": "second_baseman",
    "3b": "third_baseman",
    ss: "shortstop",
    inf: "infielder",
    if: "infielder",
    infield: "infielder",
    infielder: "infielder",
    of: "outfielder",
    outfield: "outfielder",
    outfielder: "outfielder",
    lf: "left_fielder",
    cf: "center_fielder",
    rf: "right_fielder",
    dp: "designated_player",
    "designated player": "designated_player",
    flex: "flex",
    util: "utility",
    utility: "utility",
  },

  // ── Brydning ───────────────────────────────────────────────────────────────
  // Vægtklassen ER positionen, og den er et tal ("125", "174"). Tal oversættes
  // ikke; kun sværvægt har et navn i stedet for et tal.
  wrestling: {
    hwt: "heavyweight",
    hvy: "heavyweight",
    heavyweight: "heavyweight",
  },

  // ── Bowling (ingen positioner — holdet spiller Baker-format) ───────────────
  bowling: {},

  // ── Sejlsport ──────────────────────────────────────────────────────────────
  sailing: {
    s: "skipper",
    skip: "skipper",
    skipper: "skipper",
    c: "crew",
    crew: "crew",
  },

  // ── Skydning (disciplinen står i position-feltet) ──────────────────────────
  shooting: {
    sb: "smallbore",
    smallbore: "smallbore",
    "small bore": "smallbore",
    ar: "air_rifle",
    "air rifle": "air_rifle",
    airrifle: "air_rifle",
    rifle: "air_rifle",
    ap: "air_pistol",
    "air pistol": "air_pistol",
    p: "pistol",
    pistol: "pistol",
    "free pistol": "pistol",
    "standard pistol": "pistol",
    trap: "trap",
    skeet: "skeet",
  },

  // ── Skisport ───────────────────────────────────────────────────────────────
  // NCAA-mesterskabet er ét hold af alpint og langrend, så disciplinen er den
  // eneste måde at se, hvad en skiløber egentlig laver.
  skiing: {
    alpine: "alpine",
    nordic: "nordic",
    "cross country": "nordic",
    xc: "nordic",
    sl: "slalom",
    slalom: "slalom",
    gs: "giant_slalom",
    "giant slalom": "giant_slalom",
    classic: "classic",
    classical: "classic",
    freestyle: "freestyle",
    skate: "freestyle",
  },

  // ── Triatlon (én disciplin, tre grene — ingen positioner) ──────────────────
  triathlon: {},

  // ── Hestepolo (spillerne står som numre 1-4, og et tal er ikke en rolle) ───
  polo: {},

  golf: {},
  tennis: {},
  other: {},
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

/** Slår ét led op → begreb, eller null hvis koden er ukendt. */
function conceptFor(sport: string, part: string): string | null {
  const table = POSITION_CODES[sport as SportKey];
  if (!table) return null;
  const key = normalizeKey(part);
  if (!key) return null;

  const hit = table[key];
  if (hit) return hit;

  // "F-C"/"G-F": kort bindestregs-par er to forkortelser, ikke ét ord.
  // Kun når begge sider er korte — ellers ville "cross-country" blive splittet.
  const dash = key.split("-");
  if (dash.length === 2 && dash.every((d) => d.length > 0 && d.length <= 3)) {
    const both = dash.map((d) => table[d]);
    if (both.every(Boolean)) return both.join("|");
  }

  return null;
}

/**
 * Udvid en roster-position til noget der kan læses i en sætning.
 *
 *   expandPosition("basketball", "F")   → "forward"
 *   expandPosition("baseball", "C")     → "catcher"
 *   expandPosition("soccer", "Midfielder") → "midtbanespiller"   (dansk pakke)
 *   expandPosition("basketball", "G/F") → "guard/forward"
 *   expandPosition("golf", "Whatever")  → "Whatever"   (ingen koder → uændret)
 *
 * Returnerer null for tomt input. Ukendte koder returneres uændret, så vi
 * aldrig opfinder en rolle atleten ikke har.
 */
export function expandPosition(
  sport: string,
  position: string | null | undefined,
  lang?: string,
): string | null {
  if (!position) return null;
  const raw = position.trim();
  if (!raw) return null;

  const { positionPhrase } = languagePack(lang);
  const sportKey = sport.trim().toLowerCase();
  const parts = raw.split(COMPOUND_SPLIT).filter((p) => p.trim().length > 0);
  if (parts.length === 0) return null;

  const out = parts.map((part) => {
    const concept = conceptFor(sportKey, part);
    if (!concept) return part.trim(); // ukendt kode → skolens egen tekst
    // "|" = et bindestregs-par blev slået op som to begreber.
    return concept
      .split("|")
      .map((c) => positionPhrase[c] ?? c) // ukendt begreb → id'et som det er
      .join("/");
  });

  const joined = out.filter((p) => p.length > 0).join("/");
  return joined.length > 0 ? joined : raw;
}
