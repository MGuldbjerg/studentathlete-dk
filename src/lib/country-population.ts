/**
 * Ca. befolkningstal (millioner, ~2024) pr. land — kontekst til ekspansions-kataloget.
 * Bevidst afrundede; kun til grov markeds-sizing (befolkning = loft, ikke publikum).
 * Nøglerne matcher `home_country`-værdierne i `international_athletes`.
 */
export const POPULATION_M: Record<string, number> = {
  UK: 68, Spain: 48, Germany: 84, France: 68, Australia: 27, Brazil: 216,
  Italy: 59, Sweden: 10.5, Mexico: 128, Japan: 124, Norway: 5.5, "Puerto Rico": 3.2,
  "New Zealand": 5.2, Netherlands: 17.8, Jamaica: 2.8, Colombia: 52, Argentina: 46,
  "South Africa": 60, Poland: 37, India: 1430, Serbia: 6.6, Turkey: 85, Kenya: 55,
  Venezuela: 28, Ireland: 5.3, Nigeria: 223, Belgium: 11.7, Israel: 9.8, China: 1410,
  Portugal: 10.3, Hungary: 9.6, Switzerland: 8.8, Ghana: 34, Ukraine: 38,
  "Czech Republic": 10.9, Bahamas: 0.41, Denmark: 5.9, "Dominican Republic": 11.3,
  Greece: 10.4, Austria: 9.1, Peru: 34, Chile: 19.6, Russia: 144, Croatia: 3.9,
  Finland: 5.6, Egypt: 111, Cyprus: 1.3, Slovakia: 5.4, "South Korea": 51.7,
  Taiwan: 23.4, Iceland: 0.39, Lithuania: 2.9, Latvia: 1.9, Thailand: 71.8,
  Bolivia: 12.3, Bulgaria: 6.9, Ecuador: 18, Slovenia: 2.1, Romania: 19, Senegal: 17.7,
  Morocco: 37, Philippines: 117, "Trinidad and Tobago": 1.5, Estonia: 1.4,
  Barbados: 0.28, Zimbabwe: 16.3, UAE: 9.4, Cameroon: 28, Malaysia: 34,
  Montenegro: 0.62, Bosnia: 3.2, Belarus: 9.2, Jordan: 11.3, Bermuda: 0.064,
  Indonesia: 277, Qatar: 2.7, Singapore: 5.9, Haiti: 11.6, Paraguay: 6.8,
  Luxembourg: 0.66, Uruguay: 3.4, Albania: 2.8, Cuba: 11, Iran: 89, Lebanon: 5.5,
  "North Macedonia": 2.1, Tanzania: 65, Ethiopia: 126, "Saudi Arabia": 36, Iraq: 44,
  Malta: 0.54, Moldova: 3.4,
};

export function getPopulationM(country: string): number | null {
  return POPULATION_M[country] ?? null;
}
