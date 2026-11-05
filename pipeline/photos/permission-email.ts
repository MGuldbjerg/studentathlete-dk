/**
 * The photo-permission email to a school's athletics communications office.
 * Pure text, no LLM: every word is fixed except the school name and the greeting.
 * The ask is deliberately school-wide: ALL international student-athletes, ALL sports,
 * so a later expansion market never needs a second request. It asks for photos of the athletes
 * on the school's athletics website — article photos AND the athletes' roster/profile pages —
 * credited to the photographer. Article photos stay our first choice; the profile page is the
 * backup, and is far more likely to show the right athlete (Mikkel 2026-11-05; until then the
 * ask was article photos only, 2026-10-21). Social posts are covered as part of the same
 * publishing process — a post shares a published page, never a standalone photo — and the email
 * promises the same credit there. pipeline/social carries NO photo credit today: add it before a
 * school photo ever goes into a social card (Mikkel 2026-11-05).
 * Plain text on purpose (cold one-to-one mail lands in spam less than a designed mail).
 */

export interface PermissionEmailInput {
  schoolName: string;
  /** Contact's name if known; otherwise the greeting is generic. */
  contactName: string | null;
  /** Sites that are live today, e.g. ["studentathlete.dk", "student-athlete.co.uk"]. */
  liveSites: string[];
  /** Optional one-off paragraph placed right after the greeting (e.g. a contact-name apology). */
  note?: string;
}

export interface PermissionEmail {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function buildPermissionEmail(input: PermissionEmailInput): PermissionEmail {
  if (input.liveSites.length === 0) throw new Error("permission email needs at least one live site");
  const school = input.schoolName;
  const greeting = input.contactName ? `Hello ${input.contactName.split(" ")[0]},` : "Hello,";
  const sites = input.liveSites.join(" and ");
  const paragraphs = [
    greeting,
    ...(input.note ? [input.note] : []),
    `If you are not the right person for this, I would be grateful if you could forward it to the colleague who handles photo and media rights for ${school} Athletics. Thank you.`,
    `I run ${sites}, independent news sites that follow British and Danish student-athletes at American colleges. Back home, most of these athletes are not celebrities, and we would like to shine a little more light on them for representing their flag overseas.`,
    `We would like to use photos of these athletes from your athletics website, both those that accompany your articles and those on the athletes' roster profile pages, and to credit them properly: on our page, next to the photo, we would name the photographer where your site gives a name, along with "${school} Athletics", and link to the page the photo came from.`,
    `When we publish an article on our site, we also share it on our own social media accounts, and the photo goes with that post, credited the same way. Because of this, I would like the permission to cover social media as well, to better catch the attention of sports fans on these platforms.`,
    `Rather than ask again each time we add a country, I am asking for one general permission covering photos of all international student-athletes at ${school}, in every sport. Today we cover only Denmark and the UK, but I hope to grow to more countries, so a general permission now would save us both repeat requests.`,
    `Would ${school} be happy for that? If you prefer a different credit line, or want particular photographers or photos left out, we will follow that, and we will remove any photo promptly on request.`,
    `A one-line reply is all we need, and I am more than willing to elaborate if that would help. If the answer is no, we will not use any photo from ${school}.`,
    `Thank you for your time.`,
    `Mikkel Guldbjerg Jensen\n${input.liveSites[0]}\ninfo@studentathlete.dk`,
  ];
  return {
    subject: `Photo permission for international student-athletes at ${school}`,
    text: paragraphs.join("\n\n"),
    html: paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n"),
  };
}
