/**
 * LANDEPROFIL: Storbritannien (UK).
 * =================================
 *
 * ⚠️ FORBEREDT, MEN IKKE AKTIVERET. Profilen er BEVIDST ikke registreret i
 * `COUNTRIES` (countries/index.ts). Registreringen er én linje, men den sætter
 * UK i `activeCountries()` — og så begynder næste roster-scrape at klassificere
 * og indsætte ~1.000 UK-atleter i den levende `athletes`-tabel. Aktivér først
 * når ALT dette er på plads:
 *
 *   1. Domænet student-athlete.co.uk er købt, DNS/zone sat op i Cloudflare,
 *      route tilføjet i wrangler.toml.
 *   2. Engelske genererings-prompts (pipeline/generate/prompts/ er i dag
 *      hardcodet dansk — "Skriv ALTID på dansk").
 *   3. Engelske UI-strenge (~400 danske strenge i JSX) + engelske route-slugs
 *      (/atleter, /viden, /skoler er fysiske mapper i src/app/).
 *   4. Mikkels go efter DK's in-season-validering (beslutning 2026-08-03).
 *
 * KLASSIFIKATION: UK-rosters skriver næsten altid nation eksplicit
 * ("London, England" · "Falkirk, Scotland" · "Worcester, United Kingdom"),
 * så `countryMarkers` bærer genkendelsen. Bylisten er med vilje KORT og
 * indeholder KUN navne uden amerikansk/canadisk navnebror — næsten alle store
 * britiske bynavne (London, Birmingham, Manchester, Boston, York, Oxford …)
 * findes også som byer i USA og fanges derfor kun via markers + US-stat-guard.
 * En bar "London" klassificeres altså IKKE — hellere et miss end en
 * amerikaner i kataloget (samme princip som Elsinore-lærdommen i dk.ts).
 */
import type { CountryProfile } from "./types";

const cities: string[] = [
  // England — kun navne uden kendt US-navnebror
  "Milton Keynes",
  "Wolverhampton",
  "Middlesbrough",
  "Doncaster",
  "Rotherham",
  "Barnsley",
  "Huddersfield",
  "Oldham",
  "Rochdale",
  "Stockport",
  "Wigan",
  "Solihull",
  "Walsall",
  "Sutton Coldfield",
  "Stoke-on-Trent",
  "Nuneaton",
  "Grimsby",
  "Scunthorpe",
  "Slough",
  "Basingstoke",
  "High Wycombe",
  "Aldershot",
  "Gateshead",
  "Hartlepool",
  "Blackpool",
  "Bournemouth",
  "Torquay",
  "Eastbourne",
  "Basildon",
  "Southend-on-Sea",
  "Woking",
  "Dartford",
  "Swindon",
  "Chessington",
  "Loughborough",
  "Guildford",
  "Maidenhead",
  "Stevenage",
  "Harlow",
  "Salford",
  "Newcastle upon Tyne",
  "Kingston upon Hull",
  // Skotland
  "Motherwell",
  "Falkirk",
  "Kirkcaldy",
  "Cumbernauld",
  "East Kilbride",
  "Dunfermline",
  "Kilmarnock",
  "Greenock",
  "Coatbridge",
  "Glenrothes",
  // Wales
  "Llanelli",
  "Wrexham",
  "Merthyr Tydfil",
  "Caerphilly",
  "Pontypridd",
  "Cwmbran",
  "Neath",
  "Port Talbot",
  "Bridgend",
  "Aberystwyth",
  // Nordirland
  "Ballymena",
  "Craigavon",
  "Enniskillen",
  "Newtownabbey",
  "Carrickfergus",
  "Omagh",
  "Lisburn",
  "Strabane",
  "Larne",
  // BEVIDST UDELADT (US/CA-navnebrødre uden stat i strengen ville give false
  // positives): London (KY/OH/Ontario), Birmingham (AL), Manchester (NH),
  // Boston (MA), York (PA), Cambridge (MA), Oxford (MS), Bristol (CT/TN),
  // Leeds (AL), Sheffield (AL), Liverpool (NY), Glasgow (KY/MT),
  // Edinburgh (IN), Aberdeen (SD/WA), Dundee (MI), Perth (NY), Stirling (NJ),
  // Paisley (OR), Cardiff (CA), Swansea (IL/MA), Newport, Bangor (ME),
  // Belfast (ME), Derry/Londonderry (NH), Newry (ME), Armagh (PA),
  // Coleraine (MN), Watford (City, ND), Bradford (PA), Warrington (PA),
  // Bolton (MA), Dudley (MA), Coventry (RI), Leicester (MA), Ipswich (MA),
  // Norwich (CT), Peterborough (NH/Ontario), Northampton (MA),
  // Southampton (NY), Portsmouth (NH/VA), Plymouth (MA), Derby (KS),
  // Hastings (NE), Colchester (VT), Chelmsford (MA), St Albans (VT),
  // Harrogate (TN), Telford (PA), Carlisle (PA), Darlington (SC),
  // Wakefield (MA), Sunderland (MA), Hamilton (OH), Livingston (NJ).
];

export const uk: CountryProfile = {
  // "UK" frem for ISO'ens "GB": kataloget (`international_athletes.home_country`
  // + pipeline/catalogue/country-language.ts) bruger allerede "UK", og
  // athletes.home_country skal tale samme vokabular. "UK" er i øvrigt
  // ISO 3166's exceptionally-reserved alias for GB.
  code: "UK",
  language: "en",
  host: "student-athlete.co.uk",
  // Dark launch 2026-08-05 → 2026-08-21. Begge grunde er væk: forespørgslerne
  // filtrerer nu på land (`a.country` / `home_country` i src/lib/db.ts), og
  // sitet har sit eget indhold. Verificeret før flaget blev slået fra: en dansk
  // atlet svarer 404 på .co.uk, en britisk artikel 404 på .dk, sitemappet på
  // .co.uk er britisk (2.092 atleter), og canonical peger på .co.uk selv.
  //
  // Flaget spærrede TO ting (playbook §5): indeksering OG distribution. Med det
  // væk er UK også tilladt i social-køen — der er blot ingen britisk konto
  // endnu, og kanalerne poster kun deres eget lands artikler.
  darkLaunch: false,
  brand: "Student-Athlete.co.uk",
  nationalityName: "United Kingdom",
  contactEmail: "info@student-athlete.co.uk",
  cities,
  countryMarkers: [
    "England",
    "Scotland",
    "Wales",
    "Northern Ireland",
    "United Kingdom",
    "Great Britain",
    "Britain",
    "U.K.",
    "UK",
  ],
  falsePositivePatterns: [
    // Australien: "Sydney, New South Wales" ville ellers matche "Wales".
    /new\s+south\s+wales/i,
    // US-regioner/byer der indeholder et marker-ord.
    /new\s+england/i,
    /new\s+britain/i,
    // Canadiske provinser — ingen US-stat-guard dækker dem ("Scotland, Ontario").
    /\b(ontario|quebec|québec|alberta|manitoba|saskatchewan|nova\s+scotia|new\s+brunswick|newfoundland|british\s+columbia|yukon|nunavut)\b/i,
    // US-skoler opkaldt efter nationerne ("Scotland High School").
    /\b(england|scotland|wales)\s+(hs|high|h\.s\.|academy|school|prep)\b/i,
  ],
};
