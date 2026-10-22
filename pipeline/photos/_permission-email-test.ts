/**
 * Test of the photo-permission email. Offline: nothing is sent.
 * What can go wrong: the forward-request not coming early, the school-wide ask
 * (all sports, all international athletes) being lost, unescaped HTML.
 */
import { buildPermissionEmail } from "./permission-email";

let passed = 0;
let failed = 0;

function eq(actual: unknown, expected: unknown, name: string) {
  if (actual === expected) passed++;
  else {
    failed++;
    console.error(`✗ ${name}\n  got:      ${actual}\n  expected: ${expected}`);
  }
}
function has(hay: string, needle: string, name: string) {
  eq(hay.includes(needle), true, `${name} (missing «${needle}»)`);
}

const sites = ["studentathlete.dk", "student-athlete.co.uk"];
const m = buildPermissionEmail({ schoolName: "NC State", contactName: "Jane Doe", liveSites: sites });
eq(m.subject, "Photo permission for international student-athletes at NC State", "subject");
has(m.text, "Hello Jane,", "first-name greeting");
has(m.text, "all international student-athletes at NC State, in every sport", "school-wide ask");
has(m.text, "photos that accompany articles about these athletes", "article photos, not headshots");
has(m.text, "name the photographer", "photographer credit");
has(m.text, "link to the source article", "source link");
has(m.text, "not celebrities", "human framing");
has(m.text, "more than willing to elaborate", "offers to elaborate");
eq(m.text.includes("draw on"), false, "no claim that stories draw on the school's material");
eq(m.text.includes("headshot"), false, "no headshot wording");
has(m.text, "only Denmark and the UK", "live markets stated");
has(m.text, "grow to more countries", "expansion stated");
has(m.text, "\"NC State Athletics\"", "school credit");
has(m.text, "studentathlete.dk and student-athlete.co.uk", "both sites");
has(m.text, "info@studentathlete.dk", "sender address");
has(m.text, "Mikkel Guldbjerg Jensen\n", "signed with full name");
// the forward request is the first paragraph after the greeting
eq(m.text.split("\n\n")[1].startsWith("If you are not the right person"), true, "forward request comes first");

eq(buildPermissionEmail({ schoolName: "UNCG", contactName: null, liveSites: sites }).text.startsWith("Hello,"), true, "generic greeting");

const evil = buildPermissionEmail({ schoolName: "A&M <b>", contactName: null, liveSites: sites });
eq(evil.html.includes("<b>"), false, "html escaped");
has(evil.html, "A&amp;M &lt;b&gt;", "escaped school name");

let threw = false;
try { buildPermissionEmail({ schoolName: "X", contactName: null, liveSites: [] }); } catch { threw = true; }
eq(threw, true, "no live sites throws");

console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
