/**
 * VIDEN-GUIDER PÅ ENGELSK (britisk) — modstykket til `viden-content.ts`.
 *
 * VIGTIG KORREKTION til den oprindelige vurdering: jeg skrev først, at alle 13
 * guider var "fulde af danmarks-specifikke fakta". Det holdt ikke ved et nærmere
 * eftersyn. Elleve af dem forklarer det AMERIKANSKE system (divisioner,
 * conferences, transfer portal, March Madness …) og er landeneutrale — den
 * danske ramme var et tyndt lag ovenpå, ikke en faktuel afhængighed.
 *
 * KUN TO var reelt danske: de akademiske krav (gymnasium vs. A-levels) og
 * sammenligningen med hjemlandets universitetssystem. Dem er der researchet
 * britiske fakta til; resten er skrevet om med britisk ramme.
 *
 * WEB-VERIFICERET 2026-08-04 (kilder står i hver guides `sources`):
 *  · UK-specifikke optagelseskrav: mindst FEM akademiske GCSE-beståelser i
 *    gennemsnit E eller bedre (Skotland: Standard Grade 6), og de skal dække
 *    engelsk, matematik, et naturfag og et samfundsfag. PE, media studies,
 *    ICT, D&T, musik, kunst, applied science/maths og short-course GCSE'er
 *    tæller IKKE. Kilde: NCAA's egen International Guide.
 *  · 16 NCAA-godkendte core courses + mindst 2,3 i core-GPA til Division I.
 *  · SAT/ACT er PERMANENT afskaffet som eligibility-krav (besluttet januar
 *    2023, gældende fra skoleåret 2023-24) — men universiteterne kan stadig
 *    kræve dem til OPTAGELSE og legater. Den skelnen er vigtig og misforstås tit.
 *  · Sliding scale (GPA vejet mod testscore) findes ikke længere.
 *
 * IKKE PÅSTÅET: præcise NIL-regler for internationale atleter på F-1-visum.
 * Reglerne er restriktive og omdiskuterede, og en forkert påstand dér kan koste
 * en læser hans visum. Guiden siger derfor at man skal søge rådgivning — ikke
 * hvad svaret er.
 *
 * SLUGS er engelske. Ruten hedder stadig /viden (dansk mappenavn) — se
 * SETUP-uk-launch.md om engelske alias-ruter.
 */
import type { VidenGuide, GuideCategory } from "./viden-content";

export const CATEGORY_LABELS_EN: Record<GuideCategory, string> = {
  system: "The system",
  begreber: "Key concepts",
  saeson: "The season",
};

export const VIDEN_GUIDES_EN: VidenGuide[] = [
  {
    slug: "what-is-the-ncaa",
    category: "system",
    title: "What is the NCAA?",
    metaTitle: "What is the NCAA? A British guide to American college sport",
    description:
      "The NCAA governs university sport in the United States. Here is what it is, how it is organised, and why British athletes end up there.",
    intro:
      "The National Collegiate Athletic Association is the body that organises competitive sport at American universities. For a British reader the closest comparison is BUCS — but the scale is so different that the comparison breaks down quickly.",
    sections: [
      {
        heading: "What the NCAA actually is",
        body: [
          "The NCAA is a membership organisation of around 1,100 universities and colleges. It writes the rules for competition, sets the academic standards athletes must meet, and runs the national championships in each sport.",
          "It is not a league. The universities compete inside conferences, and the NCAA sits above those conferences as rule-maker and championship organiser.",
        ],
      },
      {
        heading: "Why the scale surprises British readers",
        body: [
          "American university sport is a mass spectator business. The largest American football stadiums hold more than 100,000 people for a fixture between two universities, and the national basketball tournament is one of the biggest events in American sport.",
          "British university sport, by contrast, is played almost entirely for participation. BUCS fixtures are rarely broadcast and rarely ticketed. The NCAA operates in a different economic universe, which is why a scholarship there can be worth a great deal of money.",
        ],
      },
      {
        heading: "What it means for a British athlete",
        body: [
          "For a British athlete, the NCAA offers something the domestic system generally does not: full-time coaching, facilities and competition, alongside a degree, funded in whole or in part.",
          "The trade is that you are bound by NCAA rules on eligibility, amateurism and academic progress for the whole of your time there.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the NCAA the only option?",
        a: "No. The NAIA and the junior-college association NJCAA run their own competitions with their own rules, and for some athletes they are a better fit. See the separate guide comparing the three.",
      },
      {
        q: "Do I have to be exceptional to get in?",
        a: "Not necessarily. The NCAA spans three divisions and more than a thousand institutions, so the standard ranges from near-professional to genuinely recreational. The question is which level fits you.",
      },
    ],
    related: [
      { label: "Divisions in the NCAA", href: "/viden/ncaa-divisions" },
      { label: "Academic requirements & eligibility", href: "/viden/academic-requirements" },
    ],
    sources: [
      { label: "NCAA — official site", url: "https://www.ncaa.org/" },
      {
        label: "NCAA Eligibility Center — Guide to International Academic Standards",
        url: "http://fs.ncaa.org/Docs/eligibility_center/International_Information/International_Guide.pdf",
      },
    ],
    updated: "2026-08-04",
  },

  {
    slug: "ncaa-divisions",
    category: "system",
    title: "Divisions in the NCAA: I, II and III",
    metaTitle: "NCAA Division I, II and III explained — for British athletes",
    description:
      "The three NCAA divisions differ in funding, time commitment and standard. Which one suits you is not simply a question of how good you are.",
    intro:
      "The NCAA is split into three divisions. The obvious difference is standard, but the more consequential differences are money and time — and those cut in directions British athletes do not always expect.",
    sections: [
      {
        heading: "Division I",
        body: [
          "The highest level, and the one people picture when they think of American college sport: the largest budgets, the televised fixtures, the full scholarships. It is also the heaviest time commitment, and in the biggest programmes the demands are close to professional.",
        ],
      },
      {
        heading: "Division II",
        body: [
          "A genuine middle ground. Athletic scholarships exist but are usually partial, and are often combined with academic awards. The competitive standard in many sports is high, while the time demands are lighter than in Division I.",
          "For British athletes this is frequently the most realistic target, and in several sports it is where the largest number of Britons actually end up.",
        ],
      },
      {
        heading: "Division III",
        body: [
          "No athletic scholarships at all — but Division III institutions include some of the most academically prestigious universities in the United States, and they award substantial academic and need-based aid. The sport is competitive; the balance tilts towards study.",
        ],
      },
      {
        heading: "Choosing between them",
        list: [
          "How much of your week do you want sport to take?",
          "Do you need the money to come from athletics, or could academic aid do the same job?",
          "Would you rather play regularly at a lower level, or fight for minutes at a higher one?",
          "What happens to your degree if the sport goes badly?",
        ],
      },
    ],
    faqs: [
      {
        q: "Is Division III weak?",
        a: "No. The standard varies enormously, and strong Division III programmes would beat weak Division I ones in several sports. What is consistent is the absence of athletic scholarships.",
      },
      {
        q: "Can I move up a division later?",
        a: "Yes. Transferring between divisions is common, and the transfer portal has made it more so. See the transfer portal guide.",
      },
    ],
    related: [
      { label: "NCAA vs NAIA vs NJCAA", href: "/viden/ncaa-naia-njcaa" },
      { label: "Transfer portal explained", href: "/viden/transfer-portal" },
    ],
    sources: [{ label: "NCAA — divisional differences", url: "https://www.ncaa.org/sports/2021/2/16/about-resources-media-center-ncaa-101-what-differences-between-divisions-i-ii-and-iii.aspx" }],
    updated: "2026-08-04",
  },

  {
    slug: "conferences",
    category: "system",
    title: "Conferences explained: the SEC, Big Ten, ACC and the rest",
    metaTitle: "NCAA conferences explained — SEC, Big Ten, ACC and the others",
    description:
      "Universities compete inside conferences, which shape the fixture list, the money and the route to a national championship.",
    intro:
      "A conference is a group of universities that play each other regularly and share broadcasting money. It is the closest thing American college sport has to a league table, and it matters more to an athlete's daily life than the NCAA itself.",
    sections: [
      {
        heading: "What a conference does",
        body: [
          "The conference sets most of the fixture list, runs its own championship, and — crucially — negotiates the television deal. That money is why conference membership is fought over so bitterly.",
        ],
      },
      {
        heading: "The big ones",
        body: [
          "The wealthiest conferences, chiefly the SEC and the Big Ten, dominate American football and the revenue that flows from it. The ACC and Big 12 sit alongside them. Below that are conferences whose budgets are a small fraction of the same size.",
          "Conference membership shifts: universities have moved between conferences repeatedly in recent years, sometimes across the entire continent, chasing broadcast income.",
        ],
      },
      {
        heading: "Why it matters to you",
        body: [
          "The conference determines how far you travel, how often you miss teaching, who you play, and how much exposure you get. A mid-table team in a strong conference may face a harder schedule than a champion in a weak one.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does a strong conference mean a better experience?",
        a: "Not automatically. Stronger conferences mean tougher opposition and more travel, which can mean less playing time and more missed teaching.",
      },
    ],
    related: [
      { label: "Divisions in the NCAA", href: "/viden/ncaa-divisions" },
      { label: "The NCAA season calendar", href: "/viden/season-calendar" },
    ],
    sources: [{ label: "NCAA — official site", url: "https://www.ncaa.org/" }],
    updated: "2026-08-04",
  },

  {
    slug: "ncaa-naia-njcaa",
    category: "system",
    title: "NCAA, NAIA and NJCAA: what is the difference?",
    metaTitle: "NCAA vs NAIA vs NJCAA — which route suits a British athlete?",
    description:
      "Three separate organisations run American college sport. They have different rules, different standards and different entry requirements.",
    intro:
      "Most British athletes have heard of the NCAA and nothing else. In practice there are three organisations, and for some athletes the other two are the better route — or the only realistic one.",
    sections: [
      {
        heading: "NCAA",
        body: [
          "The largest and best known, with around 1,100 member institutions across three divisions. The strictest academic entry requirements of the three, administered centrally through the Eligibility Center.",
        ],
      },
      {
        heading: "NAIA",
        body: [
          "A separate association of smaller universities, with its own championships and its own eligibility system. The academic entry requirements are generally more flexible than the NCAA's, and scholarships are available.",
          "For a British athlete whose qualifications do not map cleanly onto the NCAA's core-course rules, the NAIA is often worth investigating rather than treating as a consolation prize.",
        ],
      },
      {
        heading: "NJCAA — junior college",
        body: [
          "Two-year institutions. Athletes typically spend one or two years there and then transfer to an NCAA or NAIA university for the remainder of their degree.",
          "This is a genuinely useful route for athletes who need to improve academically, adapt to the country, or simply mature physically before facing four-year competition. It carries no stigma in the American system.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does junior college harm my chances?",
        a: "No. Transferring from junior college into a four-year programme is a well-worn path, and for some athletes it produces better offers than they would have received straight from school.",
      },
    ],
    related: [
      { label: "Academic requirements & eligibility", href: "/viden/academic-requirements" },
      { label: "Divisions in the NCAA", href: "/viden/ncaa-divisions" },
    ],
    sources: [
      { label: "NAIA — official site", url: "https://www.naia.org/" },
      { label: "NJCAA — official site", url: "https://www.njcaa.org/" },
    ],
    updated: "2026-08-04",
  },

  {
    slug: "american-university-system",
    category: "system",
    title: "The American university system — and how it differs from a UK degree",
    metaTitle: "American universities vs UK universities for student athletes",
    description:
      "Four years instead of three, a later choice of subject, and a very different funding model. What changes if you study in the United States.",
    intro:
      "The academic side of the move is easy to underestimate. An American degree is structured differently from a British one, and the differences interact with sport in ways that matter.",
    sections: [
      {
        heading: "Four years, not three",
        body: [
          "An American bachelor's degree normally takes four years, against three for most English, Welsh and Northern Irish degrees, or four in Scotland. Athletic eligibility is also counted in years, which is why the two line up as neatly as they do.",
        ],
      },
      {
        heading: "You choose your subject later",
        body: [
          "British students apply to read a specific subject and start it immediately. American students take broad courses across several fields for the first year or two and declare a major later.",
          "For an athlete this is genuinely useful: it spreads the academic load and lets you change direction without starting again.",
        ],
      },
      {
        heading: "The money works differently",
        body: [
          "In the UK, tuition is largely covered by a student loan repaid through the tax system once you earn above a threshold. In the United States, the sticker price is far higher, and the question is how much of it is discounted by athletic scholarships, academic awards and need-based aid.",
          "A full scholarship at an expensive private university can be worth more than the entire cost of a UK degree. A partial scholarship at the same university can still leave you badly out of pocket. Read the offer, not the label.",
        ],
      },
      {
        heading: "Sport is inside the university, not beside it",
        body: [
          "This is the deepest difference. In Britain, serious sport happens at a club and university sport is largely social. In the United States the university IS the club: your coaches, facilities, medical staff, strength programme and much of your social life sit inside the institution.",
          "BUCS has no equivalent to that integration, which is why the American system can feel simultaneously more supportive and more total.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I still use Student Finance?",
        a: "No. UK student finance does not fund degrees taken at American universities. Funding must come from scholarships, aid, family or savings.",
      },
      {
        q: "Will an American degree be recognised in the UK?",
        a: "Degrees from accredited American universities are widely recognised. Check accreditation before committing, particularly for regulated professions.",
      },
    ],
    related: [
      { label: "Academic requirements & eligibility", href: "/viden/academic-requirements" },
      { label: "What is the NCAA?", href: "/viden/what-is-the-ncaa" },
    ],
    sources: [{ label: "NCAA — official site", url: "https://www.ncaa.org/" }],
    updated: "2026-08-04",
  },

  {
    slug: "season-calendar",
    category: "system",
    title: "The NCAA season calendar: what is played when",
    metaTitle: "The NCAA season calendar — when each college sport is played",
    description:
      "American college sport runs on an academic year, and each sport has its own window. Here is how the year is laid out.",
    intro:
      "The NCAA calendar follows the academic year, roughly from August to May, and each sport occupies its own part of it. Knowing the shape helps make sense of when results appear.",
    sections: [
      {
        heading: "Autumn",
        list: [
          "American football: late August to late November, then bowls and the play-off",
          "Soccer: August to November, finishing with the College Cup in early December",
          "Women's volleyball: August to December",
          "Cross country: September to November",
        ],
      },
      {
        heading: "Winter",
        list: [
          "Basketball: November to April, culminating in March Madness",
          "Swimming: October to March",
          "Indoor athletics: January to March",
          "Ice hockey: October to April, ending with the Frozen Four",
        ],
      },
      {
        heading: "Spring",
        list: [
          "Baseball and softball: mid-February to June",
          "Tennis team season: January to May",
          "Golf: an autumn half and a spring half, championships in late May",
          "Outdoor athletics: March to June",
          "Rowing: head races in autumn, sprint racing in spring",
        ],
      },
      {
        heading: "Out of season is not off season",
        body: [
          "Even outside the competitive window, athletes train with the programme, lift, and take part in limited organised practice. The NCAA caps the hours, but the year is close to continuous.",
        ],
      },
    ],
    related: [
      { label: "March Madness explained", href: "/viden/march-madness" },
      { label: "College Football Playoff explained", href: "/viden/college-football-playoff" },
    ],
    sources: [{ label: "NCAA — championships", url: "https://www.ncaa.com/" }],
    updated: "2026-08-04",
  },
{
    slug: "academic-requirements",
    category: "begreber",
    title: "Academic requirements & eligibility — what British qualifications need to show",
    metaTitle: "NCAA academic requirements for British students — GCSEs, A-levels and eligibility",
    description:
      "The NCAA sets its own academic entry standard, and it maps onto GCSEs and A-levels in a specific way. Here is what British qualifications must cover.",
    intro:
      "This is the guide that differs most for a British reader, because the NCAA judges your school record against its own rules rather than against UCAS points. Getting it wrong is the most common reason a capable athlete never makes it across.",
    sections: [
      {
        heading: "What the NCAA requires of everyone",
        body: [
          "Every prospective athlete must complete 16 NCAA-approved core courses before finishing secondary school, and earn a minimum core-course grade point average of 2.3 for Division I. Ten of those core courses, seven of them in English, maths and science, must be completed before the start of the final year.",
          "Note that this is a grade point average across NCAA-approved subjects only. Subjects the NCAA does not count simply do not appear in the calculation, in either direction.",
        ],
      },
      {
        heading: "What that means for GCSEs specifically",
        body: [
          "The NCAA publishes country-by-country standards, and for the United Kingdom the requirement is a minimum of five academic GCSE passes at an average of grade E or better, or Standard Grade passes at 6 in Scotland.",
          "Those five must cover English, maths, a science, and a social studies subject such as history, geography, modern studies, sociology or psychology. A foreign language, philosophy or non-doctrinal religious education can count as the fifth, provided the other four areas are covered.",
        ],
      },
      {
        heading: "Subjects that do not count",
        body: [
          "This is where British applicants are most often caught out. The following do not satisfy NCAA core requirements: GCSE PE, media studies, ICT, design and technology, music and art, along with applied science, applied maths and any short-course GCSE.",
          "A student with excellent grades in a timetable weighted towards those subjects can fail the NCAA standard while comfortably meeting UCAS requirements. If you are still choosing options, choose with this in mind.",
        ],
      },
      {
        heading: "SAT and ACT: no longer needed for eligibility",
        body: [
          "The NCAA permanently removed the standardised test requirement for Division I and Division II initial eligibility in January 2023, effective from the 2023-24 academic year. The old sliding scale, which traded grade point average against test score, no longer exists.",
          "But this exemption is for NCAA eligibility only. Individual universities may still require an SAT or ACT score for admission or for academic scholarships, and coaches may still ask to see one. Do not assume the test is irrelevant to your application just because it is irrelevant to your eligibility.",
        ],
      },
      {
        heading: "Registering",
        body: [
          "You register with the NCAA Eligibility Center and arrange for your school to send an official transcript covering year nine upwards. British applicants have one clear advantage here: no certified translation is required, and no English language test is needed.",
          "Register early. Certification takes time, and offers can depend on it.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do A-levels matter?",
        a: "Yes, for university admission and often for scholarships, and strong A-levels help. But NCAA eligibility is assessed primarily against the core-course and GCSE standards described above, so good A-levels do not compensate for a GCSE record that misses the required subjects.",
      },
      {
        q: "My GCSE grades are numbers, not letters. How does that map?",
        a: "English GCSEs moved to a 9-1 scale, while the NCAA guidance is written in the older A*-G terms. Do not guess the conversion — the Eligibility Center makes the determination, and its International Guide is the authority.",
      },
      {
        q: "What if I fall short?",
        a: "The NAIA and the junior-college route have different requirements and are genuinely viable. See the comparison guide.",
      },
    ],
    related: [
      { label: "NCAA vs NAIA vs NJCAA", href: "/viden/ncaa-naia-njcaa" },
      { label: "Redshirt and years of eligibility", href: "/viden/redshirt-and-eligibility" },
    ],
    sources: [
      {
        label: "NCAA Eligibility Center — Guide to International Academic Standards 2025-26",
        url: "http://fs.ncaa.org/Docs/eligibility_center/International_Information/International_Guide.pdf",
      },
      {
        label: "NCAA Eligibility Center — initial-eligibility standards for international students",
        url: "http://fs.ncaa.org.s3.amazonaws.com/Docs/eligibility_center/International_Information/Intl_IE_Flyer.pdf",
      },
      {
        label: "NCAA permanently ends SAT/ACT eligibility requirement (January 2023)",
        url: "https://www.highereddive.com/news/ncaa-permanently-ends-sat-act-eligibility-requirement-division-i-ii/642117/",
      },
    ],
    updated: "2026-08-04",
  },

  {
    slug: "transfer-portal",
    category: "begreber",
    title: "The transfer portal explained",
    metaTitle: "The NCAA transfer portal explained — how college athletes move",
    description:
      "The transfer portal is the database through which college athletes move between universities. It has reshaped American college sport.",
    intro:
      "The transfer portal is a formal database an athlete enters to signal that they are open to moving. Once you are in it, other programmes may contact you. It has turned college rosters over far faster than they used to.",
    sections: [
      {
        heading: "How it works",
        body: [
          "An athlete tells their compliance office they wish to enter the portal, and their name is added. Coaches at other institutions can then approach them directly. There are defined windows during the year for entering, which vary by sport.",
        ],
      },
      {
        heading: "Why it matters",
        body: [
          "Athletes now change university far more freely than a decade ago, and squads can look substantially different from one season to the next. For an athlete who is not playing, it is a real second chance rather than a theoretical one.",
        ],
      },
      {
        heading: "The risk",
        body: [
          "Entering the portal does not guarantee an offer. Some athletes enter and find nothing, having already given up their place. Your scholarship at the original institution is not protected once you have signalled you are leaving.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does transferring cost me a year?",
        a: "Not usually now. Rules on sitting out have loosened considerably, but they vary by division and circumstance — check with a compliance officer rather than relying on what a team-mate tells you.",
      },
    ],
    related: [
      { label: "Redshirt and years of eligibility", href: "/viden/redshirt-and-eligibility" },
      { label: "College sport glossary", href: "/viden/glossary" },
    ],
    sources: [{ label: "NCAA — transfer rules", url: "https://www.ncaa.org/sports/2021/5/20/transfer-terms.aspx" }],
    updated: "2026-08-04",
  },

  {
    slug: "redshirt-and-eligibility",
    category: "begreber",
    title: "Redshirt and years of eligibility explained",
    metaTitle: "Redshirt explained — how NCAA years of eligibility work",
    description:
      "You get four playing seasons within a five-year window. Redshirting is how a year gets set aside without being spent.",
    intro:
      "Eligibility is counted in seasons, not in years enrolled. Understanding the difference is what lets athletes take a year to develop, or to recover from injury, without losing anything.",
    sections: [
      {
        heading: "Four seasons in five years",
        body: [
          "The basic rule is four seasons of competition, to be used within a five-year window from first enrolment. The extra year is what makes redshirting possible.",
        ],
      },
      {
        heading: "What redshirting is",
        body: [
          "A redshirt year is one in which an athlete trains fully with the squad but does not compete, so no season of eligibility is used. It is common for athletes who arrive needing physical development, or who are behind an established player in their position.",
          "For British athletes arriving in an unfamiliar sport or a much stronger competitive environment, a redshirt year can be the difference between adapting and drowning.",
        ],
      },
      {
        heading: "Medical redshirt",
        body: [
          "If an injury ends a season early and few games have been played, an athlete can apply for a medical hardship waiver so the season does not count. The criteria are specific, and it is granted rather than assumed.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is redshirting a demotion?",
        a: "No. It is a normal planning tool, and in some sports the majority of athletes redshirt at some point.",
      },
    ],
    related: [
      { label: "Transfer portal explained", href: "/viden/transfer-portal" },
      { label: "Academic requirements & eligibility", href: "/viden/academic-requirements" },
    ],
    sources: [{ label: "NCAA — eligibility", url: "https://www.ncaa.org/sports/2014/10/6/remaining-eligible-academics.aspx" }],
    updated: "2026-08-04",
  },

  {
    slug: "glossary",
    category: "begreber",
    title: "Glossary: college sport terms from A to Z",
    metaTitle: "College sport glossary — American university sport terms explained",
    description:
      "American college sport has a vocabulary of its own. Here are the terms that appear most often in our coverage.",
    intro:
      "Much of the confusion around American college sport is vocabulary rather than substance. These are the terms you will meet most often.",
    sections: [
      {
        heading: "The essentials",
        list: [
          "Box score — the official statistical record of a fixture",
          "Conference — the group of universities a school competes against regularly",
          "Commit — to accept an offer from a university",
          "Eligibility — the right to compete, dependent on academic and NCAA rules",
          "Freshman, sophomore, junior, senior — first through fourth year students",
          "Letterman — an athlete who has competed enough to earn a varsity award",
          "Redshirt — a year of training without competing, preserving eligibility",
          "Roster — the squad list",
          "Scholarship — athletic financial aid, full or partial",
          "Signing Day — the day athletes formally sign with a university",
          "Transfer portal — the database through which athletes move between universities",
          "Varsity — the university's first team",
          "Walk-on — an athlete on the squad without an athletic scholarship",
        ],
      },
      {
        heading: "Competition formats",
        list: [
          "Bowl game — a post-season American football fixture outside the play-off",
          "College Cup — the final stages of the NCAA soccer championship",
          "College World Series — the baseball finals, held in Omaha",
          "Dual meet — a head-to-head fixture between two schools, common in swimming, athletics and tennis",
          "Frozen Four — the last four in the ice hockey championship",
          "March Madness — the national basketball knockout tournament",
        ],
      },
    ],
    related: [
      { label: "What is the NCAA?", href: "/viden/what-is-the-ncaa" },
      { label: "The NCAA season calendar", href: "/viden/season-calendar" },
    ],
    sources: [{ label: "NCAA — official site", url: "https://www.ncaa.org/" }],
    updated: "2026-08-04",
  },

  {
    slug: "march-madness",
    category: "saeson",
    title: "March Madness explained",
    metaTitle: "March Madness explained — the NCAA basketball tournament",
    description:
      "The national college basketball tournament: 68 teams, single elimination, three weeks, and an entire country filling in a bracket.",
    intro:
      "March Madness is the NCAA basketball championship, and one of the largest events in American sport. Its appeal is structural: it is a single-elimination knockout in which anyone can lose to anyone.",
    sections: [
      {
        heading: "The format",
        body: [
          "Sixty-eight teams qualify, some by winning their conference and the rest by selection. They are seeded and drawn into a bracket, and from there it is straight knockout — one defeat and the season is over.",
          "The last four teams meet at the Final Four, and the winners contest the national championship.",
        ],
      },
      {
        heading: "Why upsets define it",
        body: [
          "Because every tie is decided by a single match, small universities regularly beat famous ones. That possibility is the whole appeal, and it is why filling in a bracket is a national habit.",
        ],
      },
      {
        heading: "What it means for a player",
        body: [
          "Three weeks of national television can change a career. For a British player in a smaller programme, a tournament run is the single most likely route to being widely noticed.",
        ],
      },
    ],
    related: [
      { label: "The NCAA season calendar", href: "/viden/season-calendar" },
      { label: "Conferences explained", href: "/viden/conferences" },
    ],
    sources: [{ label: "NCAA — March Madness", url: "https://www.ncaa.com/march-madness-live" }],
    updated: "2026-08-04",
  },

  {
    slug: "college-football-playoff",
    category: "saeson",
    title: "The College Football Playoff explained",
    metaTitle: "College Football Playoff explained — how the champion is decided",
    description:
      "American college football decides its champion through a play-off that expanded to twelve teams in 2024.",
    intro:
      "College football took an unusually long time to adopt a play-off, and the current twelve-team format arrived only in 2024. Before that, the champion was decided by polls and then by a four-team bracket.",
    sections: [
      {
        heading: "How it works now",
        body: [
          "Since 2024 the play-off has had twelve teams, selected by a committee, with the highest-ranked conference champions receiving byes. It runs through December and January and ends with the national championship.",
        ],
      },
      {
        heading: "Bowl games",
        body: [
          "Separately from the play-off, dozens of bowl games are played in December and January. These are one-off fixtures with their own sponsors and long histories, and for most teams a bowl appearance is the season's reward.",
        ],
      },
    ],
    related: [
      { label: "The NCAA season calendar", href: "/viden/season-calendar" },
      { label: "Conferences explained", href: "/viden/conferences" },
    ],
    sources: [{ label: "College Football Playoff — official site", url: "https://collegefootballplayoff.com/" }],
    updated: "2026-08-04",
  },

  {
    slug: "signing-day-and-nli",
    category: "saeson",
    title: "Signing Day and the National Letter of Intent",
    metaTitle: "Signing Day and the National Letter of Intent explained",
    description:
      "The point at which a verbal promise becomes a binding agreement between athlete and university.",
    intro:
      "Recruitment in American college sport runs on verbal commitments for a long time before anything is signed. Signing Day is when it becomes formal.",
    sections: [
      {
        heading: "Commitment versus signature",
        body: [
          "A verbal commitment binds nobody. Athletes change their minds, and so do programmes. Only the signed agreement carries weight.",
        ],
      },
      {
        heading: "The National Letter of Intent",
        body: [
          "The NLI is the agreement between athlete and institution. Signing it commits the athlete to that university, and commits the university to providing the agreed financial aid for a full academic year.",
          "The signing windows differ by sport, and the December period has become the main one for American football.",
        ],
      },
      {
        heading: "Read it before you sign",
        body: [
          "The document specifies the aid for one academic year. What happens in subsequent years, and what happens if you are injured or the coach leaves, is worth understanding before signing rather than after.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I get out of an NLI?",
        a: "There is a release process, but it is not automatic and can carry consequences. Take advice before signing rather than afterwards.",
      },
    ],
    related: [
      { label: "Academic requirements & eligibility", href: "/viden/academic-requirements" },
      { label: "Transfer portal explained", href: "/viden/transfer-portal" },
    ],
    sources: [{ label: "NCAA — National Letter of Intent", url: "https://www.ncaa.org/sports/2014/9/15/national-letter-of-intent.aspx" }],
    updated: "2026-08-04",
  },
];
