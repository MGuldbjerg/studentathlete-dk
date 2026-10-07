/**
 * Conference websites whose story archive the conference-honours harvest reads.
 *
 * Every host here was checked on 2026-10-07 to answer the Sidearm archive API
 * (`/services/archives.ashx/stories`) with JSON. `names` are the spellings of
 * `schools.conference` that belong to the site — the column has variants
 * ("Big Ten" and "Big Ten Conference").
 *
 * Not here because they are not on Sidearm or refuse the API (checked the same
 * day): Southeastern Conference, Conference USA, Gulf South, Peach Belt,
 * Pacific West, Western Athletic, Coast to Coast, Conference of New England,
 * St. Louis Intercollegiate, SUNYAC. Their athletes keep the honours their bio
 * pages give them.
 */
export interface ConferenceSite {
  host: string;
  names: string[];
}

export const CONFERENCE_SITES: ConferenceSite[] = [
  { host: "americaeast.com", names: ["America East Conference"] },
  { host: "theamerican.org", names: ["American Conference"] },
  { host: "atlantic10.com", names: ["Atlantic 10 Conference", "Atlantic 10"] },
  { host: "theacc.com", names: ["Atlantic Coast Conference"] },
  { host: "asunsports.org", names: ["Atlantic Sun Conference"] },
  { host: "big12sports.com", names: ["Big 12 Conference"] },
  { host: "bigeast.com", names: ["Big East Conference"] },
  { host: "bigskyconf.com", names: ["Big Sky Conference"] },
  { host: "bigsouthsports.com", names: ["Big South Conference"] },
  { host: "bigten.org", names: ["Big Ten Conference", "Big Ten"] },
  { host: "bigwest.org", names: ["Big West Conference"] },
  { host: "centennial.org", names: ["Centennial Conference"] },
  { host: "caccathletics.org", names: ["Central Atlantic Collegiate Conference"] },
  { host: "caasports.com", names: ["Coastal Athletic Association"] },
  { host: "cciw.org", names: ["College Conference of Illinois and Wisconsin"] },
  { host: "conferencecarolinas.com", names: ["Conference Carolinas"] },
  { host: "eccsports.org", names: ["East Coast Conference"] },
  { host: "greatamericanconference.com", names: ["Great American Conference"] },
  { host: "gliac.org", names: ["Great Lakes Intercollegiate Athletic Conference"] },
  { host: "glvcsports.com", names: ["Great Lakes Valley Conference"] },
  { host: "greatmidwestsports.com", names: ["Great Midwest Athletic Conference"] },
  { host: "horizonleague.org", names: ["Horizon League"] },
  { host: "ivyleague.com", names: ["Ivy League"] },
  { host: "libertyleagueathletics.com", names: ["Liberty League"] },
  { host: "lonestarconference.org", names: ["Lone Star Conference"] },
  { host: "maacsports.com", names: ["Metro Atlantic Athletic Conference"] },
  { host: "themiaa.com", names: ["Mid-America Intercollegiate Athletics Association"] },
  { host: "getsomemaction.com", names: ["Mid-American Conference"] },
  { host: "meacsports.com", names: ["Mid-Eastern Athletic Conference"] },
  { host: "mvc-sports.com", names: ["Missouri Valley Conference"] },
  { host: "mountaineast.org", names: ["Mountain East Conference"] },
  { host: "themw.com", names: ["Mountain West Conference"] },
  { host: "northeastconference.org", names: ["NEC"] },
  { host: "nescac.com", names: ["New England Small College Athletic Conference"] },
  { host: "nacathletics.com", names: ["North Atlantic Conference"] },
  { host: "northeast10.org", names: ["Northeast-10 Conference"] },
  { host: "northernsun.org", names: ["Northern Sun Intercollegiate Conference"] },
  { host: "ovcsports.com", names: ["Ohio Valley Conference"] },
  { host: "odaconline.com", names: ["Old Dominion Athletic Conference"] },
  { host: "www.patriotleague.org", names: ["Patriot League"] },
  { host: "psacsports.org", names: ["Pennsylvania State Athletic Conference"] },
  { host: "rmacsports.org", names: ["Rocky Mountain Athletic Conference"] },
  { host: "thesac.com", names: ["South Atlantic Conference"] },
  { host: "saa-sports.com", names: ["Southern Athletic Association"] },
  { host: "thesciac.org", names: ["Southern California Intercollegiate Athletic Conference"] },
  { host: "soconsports.com", names: ["Southern Conference"] },
  { host: "thesiac.com", names: ["Southern Intercollegiate Athletic Conference"] },
  { host: "southland.org", names: ["Southland Conference"] },
  { host: "swac.org", names: ["Southwestern Athletic Conference"] },
  { host: "thesummitleague.org", names: ["Summit League"] },
  { host: "sunbeltsports.org", names: ["Sun Belt Conference"] },
  { host: "sunshinestateconference.com", names: ["Sunshine State Conference"] },
  { host: "uaasports.info", names: ["University Athletic Association"] },
  { host: "umacathletics.com", names: ["Upper Midwest Athletic Conference"] },
  { host: "wccsports.com", names: ["West Coast Conference"] },
  { host: "wiacsports.com", names: ["Wisconsin Intercollegiate Athletic Conference"] },
];
