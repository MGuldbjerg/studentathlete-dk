/**
 * Regelbaseret opslagstekst pr. kanal — ingen LLM-kald.
 *
 * Hvert opslag bærer BÅDE overskrift og beskrivelse. Før stod der kun titlen på
 * Bluesky, ud fra at embed-kortet alligevel viste resten — men kortet er ikke
 * garanteret (thumb-upload kan fejle, og Facebooks scrape har været tom før),
 * og et opslag skal kunne læses uden det. Beskrivelsen er artiklens
 * `metaDescription()`: klippet ved en sætningsgrænse, og med artiklens brødtekst
 * som reserve når ingressen er tom — så et opslag ikke kan ende nøgent.
 */

import { languagePack } from "../../src/lib/i18n";
import { CHANNEL_PLATFORM, type ChannelName } from "./types";
import { hashtagLine, hashtagsFor } from "./hashtags";

/** Klip ved ordgrænse og tilføj ellipse hvis teksten er for lang. */
export function truncate(text: string, max: number): string {
  if ([...text].length <= max) return text;
  const cut = [...text].slice(0, max - 1).join("");
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut) + "…";
}

export interface PostCopyInput {
  title: string;
  /** Artiklens meta-beskrivelse (se seo.ts), ikke den rå ingress. */
  description: string | null;
  url: string;
  /**
   * Artiklens sprog. PÅKRÆVET, ikke valgfrit med dansk standard — kampkortet
   * sagde «mod Brown» på britiske artikler netop fordi en sprogværdi havde en
   * dansk standardværdi (rettet 2026-09-14).
   */
  lang: string;
  /**
   * Atletens sport og artiklens land — udelukkende til hashtags på Bluesky.
   *
   * VALGFRIE, modsat `lang`, og det er ikke slendrian: mangler de, udelades
   * tagget. Standardværdien er «intet tag», ikke et gæt. Den fælde `lang` faldt
   * i var en FORKERT standardværdi, ikke en manglende.
   */
  sport?: string | null;
  country?: string;
}

/**
 * Titel + beskrivelse inden for et tegnbudget.
 *
 * Titlen vinder: den klippes kun hvis den alene sprænger budgettet. Er der
 * mindre end 40 tegn tilbage til beskrivelsen, udelades den helt — en
 * tolv-tegns stump af en sætning er støj, ikke information.
 */
export function withDescription(title: string, description: string | null, max: number): string {
  const head = truncate(title, max);
  if (!description) return head;
  const room = max - [...head].length - 2; // de to linjeskift
  if (room < 40) return head;
  return `${head}\n\n${truncate(description, room)}`;
}

/**
 * Bluesky: 300 tegn i alt, link ligger i embed-kortet — ikke i teksten.
 * X: 280 tegn, hvor et link altid tæller 23 (t.co) — titel klippes til 250.
 * Facebook: message + link sendes som separate felter; rigelig plads til ingress.
 * Instagram: captions gør IKKE links klikbare — derfor ingen URL i teksten, men
 *   en henvisning til bio-linket. Grænsen er 2.200 tegn.
 */
export function buildPostText(input: PostCopyInput, channel: ChannelName): string {
  // Teksten hører til PLATFORMEN (tegngrænser, hvor linket må stå), ikke til
  // kontoen — den danske og den britiske Bluesky-konto skriver ens.
  switch (CHANNEL_PLATFORM[channel]) {
    case "bluesky": {
      // Tags'ene får deres plads FØR teksten fylder resten. Lagt i enden ville
      // afkortningen spise dem, og et halvt hashtag er hverken tekst eller tag.
      const line = hashtagLine(hashtagsFor(input.sport, input.country));
      if (!line) return withDescription(input.title, input.description, 300);
      const body = withDescription(input.title, input.description, 300 - line.length - 2);
      return `${body}

${line}`;
    }
    case "x":
      return `${truncate(input.title, 250)}\n\n${input.url}`;
    case "facebook":
      // Facebook har rigelig plads, og linket sendes som sit eget felt.
      return withDescription(input.title, input.description, 2000);
    case "instagram": {
      // Grænsen er 2.200 tegn; bio-linjen skal ALTID med, så den får sin plads
      // reserveret før teksten fylder resten.
      const bio = languagePack(input.lang).ui["social.link_in_bio"];
      const body = withDescription(input.title, input.description, 2200 - bio.length - 2);
      return `${body}\n\n${bio}`;
    }
  }
}
