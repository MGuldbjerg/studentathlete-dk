/**
 * YouTube-URL-genkendelse til artikel-embeds (interviews m.m.).
 * En blok i artikel-markdown der KUN består af en YouTube-URL renderes som
 * privatlivsvenlig iframe (youtube-nocookie.com — sætter først cookies ved
 * afspilning, så sitets cookieløse status bevares).
 */

const YT_PATTERNS = [
  // youtube.com/watch?v=ID (evt. flere query-params)
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#\s]*&)?v=([A-Za-z0-9_-]{11})(?:[&#]\S*)?$/,
  // youtu.be/ID
  /^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{11})(?:[?#]\S*)?$/,
  // youtube.com/shorts/ID eller /embed/ID eller /live/ID
  /^https?:\/\/(?:www\.|m\.)?youtube\.com\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})(?:[?#]\S*)?$/,
];

/**
 * Video-ID hvis strengen er en ren YouTube-URL (hele blokken), ellers null.
 * Bevidst streng: URL'er inde i løbende tekst embeddes IKKE (de forbliver links).
 */
export function youtubeIdFromUrl(text: string): string | null {
  const t = text.trim();
  for (const re of YT_PATTERNS) {
    const m = re.exec(t);
    if (m) return m[1];
  }
  return null;
}

/** Privatlivsvenlig embed-URL for et video-ID. */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`;
}
