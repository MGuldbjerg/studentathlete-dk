/**
 * SPORT-PILLARTEKSTER PÅ ENGELSK (britisk) — modstykket til `sport-content.ts`.
 *
 * Nøglerne er de ENGELSKE slugs (`i18n/en.ts` → `sportSlug`), ikke de danske:
 * `football` er her fodbold (soccer), og amerikansk fodbold ligger under
 * `american-football`. Det er derfor to adskilte tabeller og ikke én med
 * oversatte værdier — samme slug betyder forskellige sportsgrene på de to sprog.
 *
 * FAKTAGRUNDLAG: sæsonstruktur og kampformater er GENBRUGT fra de danske
 * pillartekster, som blev faktatjekket mod primærkilder i juni 2026. Kun
 * rammen er ny: britiske veje ind i NCAA i stedet for danske.
 *
 * NAVNE: kun tre navngivne atleter, alle web-verificerede 2026-08-04 —
 * Luke Donald (Northwestern, NCAA-mester 1999), Cameron Norrie (TCU 2014-17)
 * og Luol Deng (Duke 2003-04, britisk statsborger fra 2006, altså EFTER
 * college — derfor formuleringen "later represented Great Britain"). Andre
 * sportsgrene får bevidst INGEN navne: en opdigtet britisk NCAA-stjerne ville
 * være præcis den slags fejl sitet er bygget for at undgå.
 */
import type { SportContent } from "./sport-content";

export const SPORT_CONTENT_EN: Record<string, SportContent> = {
  "american-football": {
    title: "American Football",
    intro:
      "British players in college football. A small but growing pathway, driven largely by the NFL Academy in London.",
    metaDescription:
      "British players in NCAA American football — news, profiles and results from college football in the United States.",
    pillar: `## British players in college football

American football is the newest of the British routes into the NCAA, and the one that has changed fastest. Very few British teenagers grow up playing the sport, so almost everyone arrives late — often from the NFL Academy in London, which was set up expressly to move British and European players into American college programmes.

That late start is less of a handicap than it sounds. Programmes recruit specific physical profiles, and a tall, fast athlete converted from rugby, basketball or athletics can develop quickly in positions such as tight end, offensive line or edge rusher.

### The season

The college football season is short and intense. The regular season runs from late August to late November, typically twelve games, almost always on a Saturday — college football owns the day, while the NFL plays on Sunday. Conference championships are decided in early December, followed by the bowl games and the College Football Playoff, which since 2024 has had twelve teams and finishes with a national championship in January.

### Worth knowing

Crowds are unlike anything in British sport: the largest college stadiums hold more than 100,000 people for a fixture between two universities. For a British player, the adjustment is as much cultural as athletic.`,
  },

  basketball: {
    title: "Basketball",
    intro:
      "British basketball players in the NCAA. College is the established route for British talent aiming at the professional game.",
    metaDescription:
      "British basketball players in the NCAA — news, profiles and results from college basketball in the United States.",
    pillar: `## British basketball in the NCAA

Basketball has one of the clearest British pathways into American college sport. The domestic professional league is small, so ambitious British players have long looked to the United States, and a spell in the NCAA is now a normal step rather than an exotic one.

### The season

The NCAA basketball season begins in November and culminates in March Madness, the knockout tournament played through March and April. Teams usually play 30 to 35 regular-season games, with non-conference fixtures in the autumn and a dense conference programme over the winter. The conference tournaments in early March decide the last places in the national tournament.

### Notable

Luol Deng spent the 2003-04 season at Duke, averaging 15.1 points a game across 37 appearances and reaching the Final Four, before going seventh overall in the 2004 NBA draft. He became a British citizen in 2006 and went on to represent Great Britain — so his Duke season came before his British career rather than after it, but the route he took is the one many British players now follow.

### Worth knowing

March Madness is among the biggest events in American sport. A single tournament run can turn an unknown player into a national name inside three weeks.`,
  },

  baseball: {
    title: "Baseball",
    intro:
      "British players in college baseball. A rare route, but one that exists for players from Britain's small domestic baseball scene.",
    metaDescription:
      "British players in NCAA baseball — news, profiles and results from college baseball in the United States.",
    pillar: `## British players in college baseball

Baseball is one of the thinnest British pathways into the NCAA. The domestic game is small, and most British players who reach American college baseball have spent time in the United States already, or come through Great Britain's national youth programme.

### The season

The college baseball season runs from mid-February to June, one of the most demanding schedules in the NCAA with up to 56 regular-season games. Teams often play the same opponent three times over a weekend — a series — so pitching depth matters more than a single star arm. The season ends with regional play-offs and finally the College World Series in Omaha, Nebraska, where the last eight teams meet in front of full stands.

### Worth knowing

Because the schedule is so long, college baseball is as much a test of durability as of talent. Programmes in the warm south of the United States hold a structural advantage: they can play outdoors all season.`,
  },

  football: {
    title: "Football",
    intro:
      "British footballers in the NCAA. For players released by an academy, American college football is one of the few routes that keeps both the sport and the education open.",
    metaDescription:
      "British footballers in NCAA soccer — news, profiles and results from college soccer in the United States.",
    pillar: `## British footballers in the NCAA

Football is the largest British pathway into American college sport, and the reason is specific to Britain: the academy system releases a great many players at sixteen and eighteen. For a released player, the choice at home is often between non-league football and giving up. American college soccer offers a third option — a scholarship, four more years of competitive football, and a degree at the end of it.

That makes the British cohort in college soccer different in character from, say, the Scandinavian one. Many arrive having already been full-time footballers in a professional environment, and the standard of the top college programmes suits them.

### The season

The NCAA soccer season is short and intense: both the men's and women's games are played in the autumn, from August to November, with roughly 18 to 20 matches compressed into a few months. That often means two matches a week and a heavy physical load. The NCAA play-offs — the final stages are called the College Cup — involve 48 teams in the men's game and 64 in the women's, and finish in early December. Spring is used for individual development and strength work.

### Worth knowing

The compressed calendar is the biggest adjustment for British players used to a season spread across nine months. Recovery, not fitness, is usually what separates a good first year from a difficult one.`,
  },

  athletics: {
    title: "Athletics",
    intro:
      "British athletes in NCAA track and field. The American college system offers year-round competition across three seasons.",
    metaDescription:
      "British athletes in NCAA athletics — news, profiles and results from college track and field in the United States.",
    pillar: `## British athletics in the NCAA

Athletics has a long British tradition of crossing the Atlantic. The attraction is structural: British athletics is largely club-based and part-time until an athlete reaches the very top, whereas an American university offers full-time coaching, facilities and competition alongside a degree.

### The season

College athletics stretches across almost the whole academic year in three phases: cross country in the autumn (September to November), indoor athletics in the winter (January to March) and outdoor athletics in the spring (March to June). The NCAA Indoor and Outdoor Championships are the two peaks of the year, and many athletes compete in all three seasons as part of the same programme.

### How a match is decided

Although every event is an individual performance, it all adds up to a team contest through points. At a meet — whether a dual meet between two schools or a large invitational with many teams — points are awarded by finishing position in each event, and the school with the highest total wins. A broad squad scoring in many events therefore beats a team with a few big stars.

### Worth knowing

Three competitive seasons in one year is far more racing than most British athletes are used to. Programmes manage this by targeting specific championships rather than peaking continuously.`,
  },

  swimming: {
    title: "Swimming & Diving",
    intro:
      "British swimmers in the NCAA. College swimming combines full-time training with a degree, and the team scoring makes it unlike club swimming at home.",
    metaDescription:
      "British swimmers in NCAA swimming and diving — news, profiles and results from college swimming in the United States.",
    pillar: `## British swimming in the NCAA

Swimming is one of Britain's strongest Olympic sports, and the American college system is a natural fit: it offers full-time training, a competitive team environment and a degree at the same time, at an age when British swimmers otherwise have to choose between the sport and their studies.

### The season

College swimming runs from October to March, with the conference championships in February and the NCAA Championships in March as the peak of the season. Training is intensive — up to twenty hours a week in the water plus strength work. The long build is designed around tapering, so that swimmers peak precisely for the championships.

### How a match is decided

In a dual meet two schools face each other, and although each swimmer races individually, it is the team's combined points total that decides the result. Each event awards points by finishing position — for example nine points for first, then four, three, two and one — and the relays are worth double. A team can therefore win a meet without having the fastest individual swimmer, if its depth is good enough. Diving counts towards the same total.

### Worth knowing

Racing for team points rather than personal times is the biggest mental adjustment for British swimmers. A third place that scores can matter more to the team than a personal best that does not.`,
  },

  golf: {
    title: "Golf",
    intro:
      "British golfers in the NCAA. American college golf is one of the best-established routes from the British amateur game to the professional tours.",
    metaDescription:
      "British golfers in NCAA golf — news, profiles and results from college golf in the United States.",
    pillar: `## British golf in the NCAA

Golf is the sport where the British college route is most firmly established. British junior and amateur golf is strong, the university system at home offers nothing comparable in terms of coaching and year-round competition, and American programmes actively recruit from British amateur championships.

### The season

College golf splits its programme across two parts of the academic year: an autumn season (September to November) and a spring season (February to May) building towards the championships. The NCAA Championships are played at the end of May and are among the most prestigious events in college golf.

### How a match is decided

For most of the season the format is stroke play over 54 holes across three rounds: each team fields five players, but only the best four rounds count each day, so the worst score is dropped. The team with the fewest strokes wins. That means one disastrous round can be absorbed by the rest of the team — golf briefly becomes a team sport. The NCAA final changes format part-way through: after the opening stroke play, the top eight teams go into match play, where schools are drawn against each other player against player, and the team winning most of the individual duels goes through. That knockout ending was introduced in 2009.

### Notable

Luke Donald won the individual NCAA title for Northwestern in 1999 with a total of 284, four under par, beating the championship record Tiger Woods had set in 1996 by a single stroke. He went on to reach world number one.`,
  },

  tennis: {
    title: "Tennis",
    intro:
      "British tennis players in the NCAA. College tennis offers a funded, team-based alternative to the punishing economics of the junior professional tour.",
    metaDescription:
      "British tennis players in NCAA tennis — news, profiles and results from college tennis in the United States.",
    pillar: `## British tennis in the NCAA

Tennis has become one of the busiest British routes into American college sport, for a straightforward economic reason: the lower reaches of the professional tour cost more to play than they pay. A scholarship removes that problem for four years, adds daily coaching and a degree, and lets a player develop without the financial pressure that ends many careers before they start.

### The season

The team season runs from January to May and finishes with the NCAA Championships in May. The autumn is individual: players compete in tournaments on their own account to build a ranking, before coming together for the team matches in the spring.

### How a match is decided

A dual match between two schools is decided over seven available points. Three doubles matches are played first, simultaneously, and the team winning two of them takes a single combined doubles point. Six singles matches follow, each worth one point. The first team to four points overall wins — and play stops the moment the result is settled, so the remaining singles are not always finished. That makes college tennis far more of a team sport than the professional game.

### Notable

Cameron Norrie played at TCU from 2014 to 2017 and finished his final college season as the first player in the university's history to be ranked number one by the Intercollegiate Tennis Association, going 10-0 in Big 12 matches in 2016-17 before turning professional.`,
  },

  rowing: {
    title: "Rowing",
    intro:
      "British rowers in the NCAA. British school and club rowing produces exactly the experience American programmes recruit for.",
    metaDescription:
      "British rowers in NCAA rowing — news, profiles and results from college rowing in the United States.",
    pillar: `## British rowing in the NCAA

Rowing is the sport where British and American college traditions overlap most naturally. Britain has deep school and club rowing, and American universities recruit rowers who already know how to train and race in a crew — which is precisely what British junior rowing produces.

### The season

College rowing has two very different seasons. In the autumn crews race head races: long courses of four to six kilometres where boats are set off at intervals and race the clock rather than each other. In the spring the sport switches to sprint racing — short, explosive races over typically 2,000 metres, with several boats side by side racing directly to the line. The season culminates in the NCAA Championships at the end of the spring.

### How a match is decided

When two or more schools meet at a regatta, each enters several boats in different classes — typically eights with a coxswain, and fours. Each race scores points, and the school's combined result across all its boats decides the final placing. One fast boat is not enough; the depth of the whole programme counts. The coxswain does not row, but steers and directs the crew's rhythm.

### Worth knowing

American college rowing recruits heavily on erg scores and height, and it is common for programmes to take on athletes with no rowing background at all and train them from scratch.`,
  },

  gymnastics: {
    title: "Gymnastics",
    intro:
      "British gymnasts in the NCAA. College gymnastics offers competitive years beyond the age at which elite careers usually end.",
    metaDescription:
      "British gymnasts in NCAA gymnastics — news, profiles and results from college gymnastics in the United States.",
    pillar: `## British gymnastics in the NCAA

Gymnastics is a small British pathway, but a meaningful one, because of what it offers at a particular moment: elite gymnastics careers often end in the late teens, and American college gymnastics gives four more competitive years with a degree attached.

### The season

College gymnastics runs from January to April, with the conference championships and NCAA Championships as the climax in April. The season is short and dense, and because every routine counts, consistency matters more than isolated spectacular performances.

### How a match is decided

When two or more schools meet, gymnasts compete on the individual apparatus — four for women (vault, bars, beam and floor) and six for men. Each routine is scored, and the team's combined total of counting scores on each apparatus decides the result. A team usually fields several gymnasts per apparatus, but only the best scores count, so depth and reliability are decisive.

### Worth knowing

American college gymnastics is scored more generously than elite international gymnastics, and the perfect ten still exists in the women's college code — which is why crowds and broadcasters follow it closely.`,
  },

  "ice-hockey": {
    title: "Ice Hockey",
    intro:
      "British players in NCAA ice hockey. A narrow route, and one that usually runs through junior hockey in North America first.",
    metaDescription:
      "British players in NCAA ice hockey — news, profiles and results from college hockey in the United States.",
    pillar: `## British players in college hockey

Ice hockey is among the narrowest British pathways into the NCAA. The domestic game is small, and almost every British player who reaches American college hockey has played junior hockey in North America first, since that is where programmes recruit.

### The season

The college hockey season runs from October to April. Teams play around 34 regular-season games, often in series of two matches on the same weekend against the same opponent. The conference tournaments in March lead into the NCAA tournament, which culminates in the Frozen Four — the last four teams meeting for the national championship.

### Worth knowing

College hockey players are typically older than in other NCAA sports, because most spend one or more years in junior leagues before enrolling. A twenty-one-year-old first-year is entirely normal.`,
  },

  volleyball: {
    title: "Volleyball",
    intro:
      "British volleyball players in the NCAA. A small pathway from a small domestic sport, but the college game is one of the biggest in American college sport.",
    metaDescription:
      "British volleyball players in NCAA volleyball — news, profiles and results from college volleyball in the United States.",
    pillar: `## British volleyball in the NCAA

Volleyball is a small sport in Britain, so the British presence in NCAA volleyball is correspondingly modest. Those who do make the move tend to come through the national youth setup or from playing abroad, and they arrive into one of the largest spectator sports in American college athletics.

### The season

The two genders play in different halves of the year: women's volleyball is an autumn sport (August to December), while men's volleyball is played in the spring (January to May). The women's NCAA Volleyball Championship in December is one of the autumn's major television events and fills large arenas — the final stages draw crowds of roughly 18,000 to 19,000.

### Worth knowing

The scale is the shock. A British player used to sports halls will find college volleyball played in arenas, televised nationally, in front of crowds larger than most British football matches.`,
  },

  "field-hockey": {
    title: "Field Hockey",
    intro:
      "British field hockey players in the NCAA. One of the strongest British pathways into American college sport — and, in the NCAA, a women's sport only.",
    metaDescription:
      "British field hockey players in the NCAA — news, profiles and results from American college field hockey.",
    pillar: `## British field hockey in the NCAA

Field hockey is one of the most reliable British routes into American college sport. The school and club system produces players who arrive already coached, the NCAA field is unusually international, and American programmes actively recruit from England, Scotland and Wales alongside the Netherlands, Germany, Argentina and Australia.

**One thing has to be said first: NCAA field hockey is a women's sport.** There is no NCAA men's championship and no men's field hockey scholarships. For British men the route does not exist, at any standard.

### The season

Field hockey is an autumn sport. The season opens in late August, conference tournaments are played in early November, and the NCAA tournament follows in mid-November with the semi-finals and final at the end of the month. It is a short, dense season on artificial turf, often two matches a week.

### How a match is decided

Eleven players a side, played in **four quarters of 15 minutes** — not the two halves familiar from British club hockey. A level match goes to sudden-victory extra time, and then to a shoot-out. Most goals come from penalty corners, which makes set-piece specialists valuable.

### Scholarships and divisions

Division I has just over 80 programmes across roughly 33 conferences, and a D1 team may hold up to 12 full scholarships, usually split into partial awards. Division II allows up to 6.3, while Division III offers no athletic scholarships at all — though academic and need-based aid is common there. All three divisions play for a national championship.

### Worth knowing

The international share is remarkable even by NCAA standards: by 2015 more than 10 per cent of all college field hockey players came from outside the United States, and the proportion has grown since. The Northeast and Mid-Atlantic have long dominated — in 2025 Northwestern won a third national title, beating North Carolina in the semi-final in overtime.

### Sources

- [NCAA. (n.d.). Division I field hockey.](https://www.ncaa.org/championship/division-i/field-hockey/)
- [USA Field Hockey. (2025, August 25). 2025 NCAA field hockey season preview: Division I.](https://www.usafieldhockey.com/news/2025/august/25/2025-ncaa-field-hockey-season-preview-division-i)
- [ScholarshipStats.com. (n.d.). Field hockey scholarships.](https://scholarshipstats.com/fieldhockey)`,
  },
  other: {
    title: "Other sports",
    intro:
      "British athletes in the NCAA sports we do not yet cover with their own section.",
    metaDescription:
      "British athletes in other NCAA sports — news, profiles and results from college sport in the United States.",
    pillar: `## Other sports

The NCAA sponsors championships in far more sports than the ones with their own section here — among them lacrosse, water polo, wrestling, fencing, skiing, cross country as a separate championship, and several others.

British athletes turn up across that whole range, sometimes in ones and twos. This section collects them until a sport has enough British representation to deserve a section of its own.

Know a British athlete at an American university who we are not covering? [Tell us](/kontakt) — the name, the university and the sport is enough.`,
  },
};
