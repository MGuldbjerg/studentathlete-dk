/** Platformen — altså API'et. Flere kanaler kan dele én. */
export type Platform = "bluesky" | "x" | "facebook";

/**
 * En KANAL er en konto, ikke en platform. Derfor har hvert land sit eget navn:
 * pacing, kø-dybde og "hvornår postede vi sidst" slås alle op på kanalnavnet,
 * så to konti med samme navn ville stå i vejen for hinanden i køen.
 */
export type ChannelName = "bluesky" | "bluesky_uk" | "x" | "facebook";

/**
 * Kanal → platform. Eksplicit tabel frem for navne-gætteri: en ny kanal uden
 * platform er en typefejl, og hverken opslagsteksten eller sletningen kan
 * komme til at gætte forkert på hvilket API der skal bruges.
 */
export const CHANNEL_PLATFORM: Record<ChannelName, Platform> = {
  bluesky: "bluesky",
  bluesky_uk: "bluesky",
  x: "x",
  facebook: "facebook",
};

export interface PostContent {
  /** Færdigbygget opslagstekst (se copy.ts) */
  text: string;
  /** Absolut artikel-URL */
  url: string;
  title: string;
  summary: string | null;
  /** Absolut URL til kampkort/cover (bruges som Bluesky-thumb) */
  imageUrl: string;
}

export interface SocialChannel {
  name: ChannelName;
  /**
   * Hvilket lands konto er det? En kanal er en KONTO, ikke en platform:
   * @studentathlete.dk på Bluesky og den danske Facebook-side er danske
   * kanaler og må kun få danske artikler. Uden dette felt postede den danske
   * konto en britisk artikel (2026-08-05).
   */
  country: string;
  /** Er de nødvendige secrets sat? Ukonfigurerede kanaler springes helt over. */
  isConfigured(): boolean;
  /** Post opslaget. Kaster ved fejl. Returnerer link til opslaget hvis kendt. */
  post(content: PostContent): Promise<{ postUrl: string | null }>;
}

/**
 * Kanalen kunne ikke logge ind. Det er en KONTO-fejl, ikke en opslags-fejl.
 *
 * Forskellen er ikke akademisk. 31. august skiftede den britiske konto handle
 * til sit domæne; `BLUESKY_UK_HANDLE` pegede stadig på det gamle
 * `*.bsky.social`, som holdt op med at eksistere i samme sekund. Køen tolkede
 * 401'eren som "dette opslag fejlede", talte forsøg op og ville efter tre
 * timer have markeret artiklen `failed` — og derefter gjort det samme ved den
 * næste. Et forkert kodeord ville altså have slettet en hel kø, én artikel i
 * timen, uden at noget var galt med artiklerne.
 *
 * Kaster en adapter denne, står kø-rækken urørt: intet forsøg brugt, status
 * uændret. Kørslen fejler stadig, så Discord-beskeden kommer.
 */
export class ChannelAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChannelAuthError";
  }
}
