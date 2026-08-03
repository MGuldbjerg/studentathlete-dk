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
