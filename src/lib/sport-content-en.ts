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
  rugby: {
    title: "Rugby",
    intro:
      "British rugby players in American college sport. Two separate worlds: the women's game is on its way into the NCAA, the men's game sits outside it.",
    metaDescription:
      "British rugby players in American college sport — news, profiles and results from NCAA and college rugby in the United States.",
    pillar: `## British rugby in American college sport

**The first thing to understand is that college rugby is not one system but two.** For women, rugby is one of the NCAA's four current emerging sports — a recognised route towards a full championship, with scholarships under NCAA rules and championship matches run by the National Intercollegiate Rugby Association. For men, rugby is not an NCAA sport at all. The men's programmes play under National Collegiate Rugby and the Collegiate Rugby Association of America, and varsity sides generally do not award athletic scholarships.

### The season

Fifteens is an autumn sport. Matches begin in late August and the championship is settled in November — in 2025 with semi-finals on 15 November and finals on 22 November at Harvard. Spring and early summer belong to sevens, where National Collegiate Rugby's championship is the largest collegiate rugby event in the world.

### How a match is decided

Fifteen a side, two halves of 40 minutes, and the familiar arithmetic: five for a try, two for the conversion, three for a penalty or a drop goal. Eight forwards win the ball and seven backs are meant to use it — and American programmes recruit the two groups as if they were different sports.

### Programmes and standards

58 American colleges field varsity rugby: 35 men's teams and 43 women's, spread across the three NCAA divisions, the NAIA and a handful of others. The NCAA's own listing counts around 30 institutions sponsoring women's rugby as an emerging sport, and NIRA's top division held 13 teams in 2025. Women's rugby is an equivalency sport, so scholarships can be divided into partial awards.

### Worth knowing

Rugby shares emerging-sport status with equestrian, flag football and triathlon. That list is worth taking seriously: since 1994 eight sports have travelled the whole way from emerging sport to full NCAA championship — rowing, ice hockey and water polo among them.

### Sources

- [NCAA. (n.d.). Emerging sports for women.](https://www.ncaa.org/championships/emerging-sports-for-women/)
- [ScholarshipStats.com. (n.d.). Rugby scholarships and college varsity teams.](https://scholarshipstats.com/rugby)
- [The Rugby Breakdown. (n.d.). Tracking: NCAA varsity programs.](https://therugbybreakdown.com/tracking-ncaa-varsity-programs/)
- [National Collegiate Rugby. (2026). NCR partners with the All Women's Sports Network for the 2026 National 7s Championships.](https://www.ncr.rugby/news/national-collegiate-rugby-partners-with-the-all-womens-sports-network-for-global-broadcast-of-2026-national-7s-championships/)`,
  },

  "water-polo": {
    title: "Water Polo",
    intro:
      "British water polo players in the NCAA. The men play in the autumn, the women in the spring, and every division competes for the same title.",
    metaDescription:
      "British water polo players in the NCAA — news, profiles and results from American college water polo.",
    pillar: `## British water polo in the NCAA

Water polo is a full NCAA sport for both men and women, with one feature few college sports share: the title is a National Collegiate championship. Teams from Divisions I, II and III play for the same trophy in the same eight-team knockout bracket.

### The season

The two programmes split the calendar. The men play in the autumn and finish with the championship in December — in 2026 at UC San Diego from 18 to 20 December. The women play in the spring; their 2026 championship was decided in the same pool from 22 to 26 April.

### How a match is decided

Seven players in the water at a time, one of them a goalkeeper, and the match is played in **four quarters of eight minutes**. Attacks are built around the centre — listed on American rosters as "2-meter" or "hole set" — while the drivers carry the ball forward from wide.

### Scholarships and divisions

77 NCAA schools sponsor water polo: 42 in Division I (29 men's teams and 37 women's), 10 in Division II and 25 in Division III, together around 1,900 male and 2,050 female athletes. Following the House settlement, Division I programmes may from 2025-26 award up to 24 scholarships within a roster limit of 24 — where the old caps were 4.5 for men and 8 for women. Division II allows 4.5, and Division III offers no athletic scholarships.

### Worth knowing

Water polo is itself proof of what an emerging sport can become: the women's game entered by that route and now has a championship of its own. The centre of gravity remains California — UCLA opened the 2026 season as men's champions for the second year running.

### Sources

- [ScholarshipStats.com. (n.d.). Water polo scholarships.](https://scholarshipstats.com/waterpolo)
- [Collegiate Water Polo Association. (n.d.). NCAA announces sites of the 2026-2028 men's and women's water polo championships.](https://collegiatewaterpolo.org/national-collegiate-athletic-association-announces-sites-of-2026-to-2028-national-collegiate-athletic-association-mens-womens-water-polo-championships/)
- [NCAA.com. (2026, April 13). 2026 National Collegiate women's water polo championship selections.](https://www.ncaa.com/news/waterpolo-women/article/2026-04-13/2026-national-collegiate-womens-water-polo-championship-selections)
- [NCAA. (n.d.). National Collegiate men's water polo.](https://www.ncaa.org/championship/national-collegiate/mens-water-polo/)`,
  },

  fencing: {
    title: "Fencing",
    intro:
      "British fencers in the NCAA. One of the few championships where Division I, II and III meet on the same piste.",
    metaDescription:
      "British fencers in the NCAA — news, profiles and results from American college fencing.",
    pillar: `## British fencing in the NCAA

Fencing has one of the most unusual championships in the NCAA: there is no split by division. Teams from Divisions I, II and III qualify for the same National Collegiate championship and meet head to head — a small Division III squad can end up fencing a scholarship-funded Division I programme for the same title.

### The season

Winter is the season for dual meets, where programmes gather for days of bout after bout, and it builds towards March. The 2026 championships were held from 19 to 22 March at Notre Dame, with 144 competitors from 26 institutions.

### How a championship is decided

Three weapons — foil, épée and sabre — and individual titles in all six events, each weapon for both men and women. The team championship has just changed shape: from 1990 to 2025 the team title was decided on the combined score of both sexes, but from 2026 separate men's and women's team titles are awarded again. The change settles an old inequity, since a programme fielding only a women's squad could never win the combined title.

### Programmes and standards

45 institutions across the three divisions sponsor fencing, holding roughly 1,400 student-athletes between them. It is a small, tightly connected world, concentrated in the Northeast and around a few large Midwestern universities.

### Worth knowing

Notre Dame won both team titles in 2026 — and so became the first winner of the standalone three-weapon women's championship.

### Sources

- [NCAA. (n.d.). National Collegiate fencing.](https://www.ncaa.org/championship/national-collegiate/fencing/)
- [USA Fencing. (2026, March 11). 2026 NCAA championships preview: A historic new era begins.](https://www.usafencing.org/news/2026/march/11/2026-ncaa-championships-preview)
- [NCAA.com. (2026, March 10). NCAA men's and women's fencing committee selects championships participants.](https://www.ncaa.com/news/fencing/article/2026-03-10/ncaa-mens-and-womens-fencing-committee-selects-championships-participants)
- [NCAA.com. (2026, March 3). Notre Dame wins the 2026 NC men's and women's fencing championships.](https://www.ncaa.com/news/fencing/article/2026-03-03/notre-dame-wins-2026-nc-mens-and-womens-fencing-championships)`,
  },

  squash: {
    title: "Squash",
    intro:
      "British squash players in American college sport. A varsity sport at some of the oldest universities in the country — and outside the NCAA.",
    metaDescription:
      "British squash players in American college sport — news, profiles and results from college squash in the United States.",
    pillar: `## British squash in American college sport

**Squash is not an NCAA sport.** It is governed by the College Squash Association, a body of its own — though every CSA member institution is an NCAA member, and the association leans heavily on NCAA legislation for its own compliance rules. In practice squash is a varsity sport with coaching, dual matches and national championships, but without an NCAA title and outside the NCAA scholarship system.

### The season

Dual matches run through the winter and the season gathers into the national team championships in February. Varsity teams are placed in playoff divisions of eight — although the top men's division, the Potter Cup, holds twelve.

### How a team match is decided

Nine players from each side meet in nine individual matches, and the team result is the sum of them. Squads usually run to 12-14 players to cover injuries, and the tenth-ranked players often meet in an exhibition outside the scoring. A place on the ladder is the currency of the whole squad.

### Programmes and standards

37 American colleges field varsity squash — 33 men's teams and 32 women's, with around 500 male and 428 female players. Fourteen of the schools are Division I institutions and 23 are Division III, and the sport is concentrated in the Northeast. Only a handful of CSA teams can offer athletic scholarships at all: Ivy League and Division III schools are not permitted to, and between them they make up most of the field.

### Worth knowing

The absence of the NCAA says nothing about the standard. American college squash is one of the deepest squash environments in the world, and the matches between Harvard, Trinity and Princeton have decided the national pecking order for years.

### Sources

- [College Squash Association. (n.d.). College squash recruiting FAQ.](https://csasquash.com/college-squash-recruiting-faq-2/)
- [College Squash Association. (2026). 2026 CSA national team championships.](https://csasquash.com/2026-national-team-championship/)
- [ScholarshipStats.com. (n.d.). Colleges with varsity squash teams.](https://scholarshipstats.com/squash)`,
  },

  esports: {
    title: "Esports",
    intro:
      "British players on American college esports teams. Varsity programmes with coaches, team rooms and scholarships — entirely outside the NCAA.",
    metaDescription:
      "British players in American college esports — news, profiles and results from varsity college esports in the United States.",
    pillar: `## British players in American college esports

**Esports sits outside the NCAA.** There is no NCAA championship in League of Legends and no NCAA rulebook to stay inside. The scene has built its own governing bodies instead — the National Association of Collegiate Esports and the National Esports Collegiate Conference — while the game publishers run parallel circuits of their own, the largest being Riot Games' College League of Legends.

### The season

The season follows the academic year: conference play in the autumn, playoffs in the spring, with College League of Legends building to its championship in the spring semester. Because matches are played online, most fixtures fall on weekday evenings; travel is reserved for LAN finals.

### How a squad is put together

The roster looks unlike any other college sport: players are listed by title and role rather than position. League of Legends fields five roles — top, jungle, mid, bot and support — and a programme with several titles will run separate squads in Valorant, Rocket League, Overwatch 2 and Counter-Strike. NECC's core titles also include Rainbow Six: Siege, Marvel Rivals and Super Smash Bros.

### Money and programmes

More than 300 North American programmes provide financial support to varsity players, and over 280 institutions offer esports scholarships through NACE. The sums are modest next to the major sports: the average award is around $4,800 a year, while the best-funded programmes go considerably higher. NECC alone counts more than 500 participating colleges and universities.

### Worth knowing

The largest pots follow the largest titles — League of Legends, Valorant and Rocket League — because those are the ones that fill an arena and a stream. And with no NCAA rulebook, the rules belong to the institutions: entry requirements, playing time and prize money are settled programme by programme.

### Sources

- [National Esports Collegiate Conference. (2026). NECC announces 2026-2027 competition calendar.](https://necc.gg/blogs/news/necc-announces-2026-2027-competition-calendar)
- [Esports Insider. (2026). Esports scholarships in 2026: How gaming can put you through school.](https://esportsinsider.com/esports-scholarships)
- [Liquipedia. (2026). Collegiate League of Legends 2026 championship.](https://liquipedia.net/leagueoflegends/CLOL/2026/Championship)`,
  },

  lacrosse: {
    title: "Lacrosse",
    intro:
      "British lacrosse players in the NCAA. One of the largest team sports in American college sport, and one of its broadest fields.",
    metaDescription:
      "British lacrosse players in the NCAA — news, profiles and results from American college lacrosse.",
    pillar: `## British lacrosse in the NCAA

Lacrosse is among the largest team sports in American college sport by number of programmes, played across all three NCAA divisions for both men and women. For British players it is a genuine route: the English university and club game feeds the American college system, and the Northeast in particular recruits abroad.

### The season

Lacrosse is a spring sport. The regular season runs from February, and the NCAA tournaments are decided in May. In 2026, 18 men's teams contested the Division I title from 6 to 25 May and 29 women's teams played from 8 to 24 May. Princeton took the men's title, Northwestern the women's.

### How a match is decided

Men play **ten a side**, women **twelve**, and both play four quarters of 15 minutes — the women's two-half format was retired in 2022. The real difference is contact: the men's game allows body checks and firm stick checks, with helmets and shoulder pads, while the women's game bans body checking and permits only controlled stick checks away from the head and body.

### Scholarships and divisions

The field is large: 77 men's teams in Division I, 82 in Division II and 247 in Division III — and on the women's side 130, 119 and 290, with the NAIA and junior colleges beyond that. Division I programmes hold up to 48 scholarships for men and 38 for women, Division II 10.8 and 9.9, and Division III none.

### Worth knowing

The Division III count is what makes the sport distinctive: the weight sits in the small Northeastern colleges where lacrosse is the flagship sport, and where squads recruit heavily from England, Canada and Australia.

### Sources

- [ScholarshipStats.com. (n.d.). Lacrosse scholarships and college programs.](https://scholarshipstats.com/lacrosse)
- [NCAA.com. (2026, May 3). NCAA Division I women's lacrosse championship subcommittee announces 2026 field.](https://www.ncaa.com/news/lacrosse-women/article/2026-05-03/ncaa-division-i-womens-lacrosse-championship-subcommittee-announces-2026-field)
- [USA Lacrosse. (2026). NCAA 2026 preview: Your guide to the college lacrosse season.](https://www.usalacrosse.com/magazine/college/ncaa-2026-preview-your-guide-college-lacrosse-season)`,
  },

  softball: {
    title: "Softball",
    intro:
      "British softball players in the NCAA. The most widely sponsored women's team sport in American college sport.",
    metaDescription:
      "British softball players in the NCAA — news, profiles and results from American college softball.",
    pillar: `## British softball in the NCAA

Softball is the women's sport with the most programmes in American college sport. It is not women's baseball: the diamond is smaller, the pitch is underarm and the game is shorter — but the recruiting, the season and the championship mirror baseball's closely.

### The season

The season opens in early February and finishes in June. The 2026 Division I season ran from 5 February to 5 June with 309 teams. The postseason starts with 16 regionals in mid-May, continues through super regionals, and the last eight teams meet at the Women's College World Series in Oklahoma City — in 2026 from 28 May to 5 June, won by Texas.

### How a game is decided

Seven innings, not nine. The pitcher throws underarm from a shorter distance than in baseball, and the combination of a short diamond and fast pitching makes the game tight: one error in the infield often settles it.

### Scholarships and divisions

1,673 American colleges sponsor softball across the three NCAA divisions, the NAIA, junior colleges and a few smaller associations — nearly 35,000 players in total. Division I has 310 schools, Division II 277 and Division III 401. Following the House settlement, Division I's scholarship cap has given way to a roster limit of 25, all of whom may hold full scholarships; Division II allows 7.2 and Division III none.

### Worth knowing

The Women's College World Series is among the best-attended NCAA championships of any sport — Devon Park in Oklahoma City is its permanent home, and the finals go out on ESPN in prime time.

### Sources

- [ScholarshipStats.com. (n.d.). Softball scholarships and college programs.](https://scholarshipstats.com/softball)
- [NCAA.com. (2026, June 4). Texas wins the 2026 NCAA DI softball championship.](https://www.ncaa.com/news/softball/article/2026-06-04/2026-ncaa-softball-tournament-bracket-schedule-womens-college-world-series-scores)`,
  },

  wrestling: {
    title: "Wrestling",
    intro:
      "British wrestlers in the NCAA. One of college sport's oldest disciplines — and since 2026 an NCAA championship sport for women too.",
    metaDescription:
      "British wrestlers in the NCAA — news, profiles and results from American college wrestling.",
    pillar: `## British wrestling in the NCAA

Wrestling is an American winter sport and one of the most thoroughly organised: weight classes, dual meets between schools, and a championship that fills an NBA arena. **The big news is the women's game.** The NCAA held its first women's wrestling championship on 6-7 March 2026 in Coralville, Iowa, making wrestling the NCAA's 91st championship sport. McKendree took the inaugural title, 171-166 over Iowa.

### The season

Duals and open tournaments fill the winter from November, conference championships fall in early March, and the NCAA championship follows mid-month — the 2026 Division I men's championship was decided from 19 to 21 March in Cleveland.

### How a dual is decided

Wrestlers compete in weight classes, and a dual is the sum of the individual bouts. The first NCAA women's championship crowned champions in ten classes from 103 to 207 pounds. A bout is won on points, by technical superiority or by pin — and the pin ends it on the spot, whatever the score.

### Scholarships and divisions

440 American colleges sponsor wrestling: 433 men's teams and 170 women's across the NCAA, NAIA and junior colleges, with some 12,400 male and 2,050 female wrestlers. Division I programmes hold up to 30 scholarships per gender, Division II 9 and 10, and Division III none.

### Worth knowing

Women's wrestling is among the fastest-growing college sports anywhere in the United States — and its arrival at championship status in 2026 is a reminder that the NCAA's list of sports is not fixed.

### Sources

- [NCAA. (2026, March 4). NCAA's first women's wrestling championships: What to know.](https://www.ncaa.org/media-center-ncaas-first-womens-wrestling-championships-what-to-know/)
- [NCAA.com. (2026, March 7). McKendree clinches the 2026 NC women's wrestling championship.](https://www.ncaa.com/news/wrestling-women/article/2026-03-07/mckendree-clinches-2026-nc-womens-wrestling-championship)
- [ScholarshipStats.com. (n.d.). Wrestling scholarships and college programs.](https://scholarshipstats.com/wrestling)`,
  },

  bowling: {
    title: "Bowling",
    intro:
      "British bowlers in the NCAA. A women's championship where all three divisions play for the same title.",
    metaDescription:
      "British bowlers in the NCAA — news, profiles and results from American college bowling.",
    pillar: `## British bowling in the NCAA

Bowling is an NCAA sport for women and, like fencing and water polo, has a single championship: teams from Divisions I, II and III play for the same title. Men's bowling exists at a number of schools but has no NCAA championship.

### The season

Competition runs through the autumn and winter in tournament form, and the championship is decided in April. The 22nd NCAA championship was bowled on 10-11 April 2026 in Parma Heights, Ohio, with 19 teams — Jacksonville State beat Wichita State in the final for its second title.

### How a team match is decided

Not five individual games added together. The championship uses the **Baker format**, in which the five bowlers share a single game and take alternate frames — the team is one game, not five. Regional matches are best of three: a five-person team game, Baker total pinfall, then Baker match play, with the title itself settled in a best-of-seven Baker match.

### Scholarships and divisions

37 Division I schools, 43 in Division II and 34 in Division III sponsor women's bowling. Division I programmes hold up to 10 scholarships, Division II 5, and Division III offers no athletic scholarships.

### Worth knowing

The Baker format is why college bowling looks different on television from every other kind: one bad frame belongs to the whole team, and a final can turn on two deliveries.

### Sources

- [NCAA. (n.d.). National Collegiate bowling.](https://www.ncaa.org/championship/national-collegiate/womens-bowling/)
- [NCAA.com. (2026, April 11). Jax State wins 2026 NC bowling championship.](https://www.ncaa.com/news/bowling/article/2026-04-11/jax-state-wins-2026-nc-bowling-championship)
- [ScholarshipStats.com. (n.d.). Bowling scholarships and college programs.](https://scholarshipstats.com/bowling)`,
  },

  sailing: {
    title: "Sailing",
    intro:
      "British sailors in American college sport. A varsity sport with national championships — run outside the NCAA, by sailing's own association.",
    metaDescription:
      "British sailors in American college sport — news, profiles and results from college sailing in the United States.",
    pillar: `## British sailing in American college sport

**College sailing sits outside the NCAA.** It is governed by the Inter-Collegiate Sailing Association, the sport's own college body, and it is the ICSA rather than the NCAA that runs the national championships. Sailing is a varsity sport at a long list of schools, with coaches, boat parks and full regatta programmes.

### The season

There is racing in both autumn and spring. The autumn is given over to ranking regattas, while the national championships fall in May. In 2026 the fleet race championships were sailed at St Petersburg, Florida: the women's from 15 May, the open from 19 May, each with a 36-boat field split into two divisions, the top nine in each advancing to the closing days.

### How the sport is organised

The ICSA crowns national champions in seven categories: open and women's fleet racing, open and women's team racing, men's and women's singlehanded, and match racing. "Open" means mixed — men and women race in the same boats and against each other, which is rare in American college sport. Team racing, where three boats from a school race tactically against three from another, is the sport's most distinctive discipline.

### Programmes and standards

Programmes cluster on the East and West coasts and around the Great Lakes, and the strongest sit at schools with long maritime traditions. The women's team racing championship is new — founded in 2022 — and Stanford won it in 2026, while Brown took the open fleet race title for the first time since 1948.

### Sources

- [Inter-Collegiate Sailing Association. (n.d.). Championships.](https://www.collegesailing.org/championships/coed)
- [College Sailing National Championships. (2026). National championship regatta.](https://nationals.collegesailing.org/)
- [Inter-Collegiate Sailing Association. (n.d.). Women's team race championships.](https://www.collegesailing.org/championships/womens-team-race)`,
  },

  shooting: {
    title: "Shooting",
    intro:
      "British shooters in American college sport. Rifle is an NCAA sport contested by men and women together; pistol has championships of its own.",
    metaDescription:
      "British shooters in American college sport — news, profiles and results from college rifle and pistol in the United States.",
    pillar: `## British shooting in American college sport

Shooting covers two closely related college sports with separate governing bodies. **Rifle is an NCAA sport** with one championship across all divisions — and a rarity in American college sport: men and women shoot in the same competition for the same titles. Formally rifle is recorded as a men's sport in the NCAA rulebook, but it has been mixed since 1980. **Pistol is not an NCAA sport**; the collegiate pistol championships are run by the NRA.

### The season

The rifle season runs through the winter and the NCAA championship is decided in March. Ohio State hosted in 2026 on 13-14 March: smallbore three-position on the first day, air rifle on the second. West Virginia won for the second year running — the programme's 21st rifle title. The pistol shooters met the same spring for their intercollegiate championship in Columbia, Missouri, won by Ohio State.

### How a competition is decided

The rifle championship is an aggregate score over two days: smallbore is shot in three positions — prone, standing and kneeling — while air rifle is standing only. Eight teams qualify, and both team and individual titles are settled on the aggregate. Pistol shooting is contested in disciplines including free pistol, standard pistol and open air pistol.

### Programmes and standards

The field is small and tight: the 2026 NCAA championship had eight qualified teams — Kentucky, Nebraska, TCU, West Virginia, Ole Miss, Alaska-Fairbanks, Navy and Georgia Southern. Precisely because the competition is mixed and the field narrow, international shooters are a fixture in the strongest programmes.

### Worth knowing

The NRA returned to collegiate pistol in 2026 after a seven-year absence — a championship that had gone quiet, back on the same range as the rest of the shooting sports on the same weekend.

### Sources

- [NCAA.com. (2026, March 14). West Virginia wins 2026 NCAA rifle championship.](https://www.ncaa.com/news/rifle/article/2026-03-14/west-virginia-wins-2026-ncaa-rifle-championship)
- [NCAA.com. (2026, February 23). 2026 National Collegiate men's and women's rifle selections.](https://www.ncaa.com/news/rifle/article/2026-02-23/2026-national-collegiate-mens-and-womens-rifle-selections)
- [NRA Shooting Sports USA. (2026). Ohio State captures 2026 intercollegiate pistol crown as NRA returns to the range.](https://www.ssusa.org/content/ohio-state-captures-2026-intercollegiate-pistol-crown-as-nra-returns-to-the-range/)`,
  },

  skiing: {
    title: "Skiing",
    intro:
      "British skiers in the NCAA. Alpine and nordic are one team and one championship — and the field is among the most international in college sport.",
    metaDescription:
      "British skiers in the NCAA — news, profiles and results from American college skiing.",
    pillar: `## British skiing in the NCAA

NCAA skiing is built unlike any other American winter sport: **alpine and nordic are the same team**, men and women score towards the same title, and there is a single championship across the divisions. A university cannot win on slalom alone — it needs speed skiers and distance skiers both.

### The season

The season runs through the winter on a regional circuit, and the championship is decided in March. In 2026 it was held from 11 to 14 March in Utah: alpine at Utah Olympic Park in Park City, nordic at Soldier Hollow. Utah won for the second year running — the programme's 18th NCAA title.

### How a championship is decided

Eight events are contested: slalom and giant slalom for both sexes, and classic and freestyle nordic races for both. 74 men and 74 women are selected regionally — two regions in alpine, three in nordic — and no school may enter more than twelve skiers, three per gender per discipline. The points are added across the lot.

### Programmes and standards

Programmes cluster in the Rockies, New England and Alaska, where the snow is, and the field is among the most international in college sport: Norwegian, Swedish and Finnish skiers are heavily represented at the top, precisely because the Nordic training culture fits the format directly.

### Worth knowing

Combining alpine and nordic in a single team score is unique to the United States. Nowhere else is a university championship decided on whether the same school can both run giant slalom and ski classic.

### Sources

- [NCAA.com. (2026, March 4). 2026 NCAA skiing championships: Schedule, selections, results, how to watch.](https://www.ncaa.com/news/skiing/article/2026-03-04/2026-ncaa-skiing-championships-schedule-selections-results-how-to-watch)
- [NCAA.com. (2026, March 14). Utah wins 2026 NCAA skiing championship.](https://www.ncaa.com/news/skiing/article/2026-03-14/utah-wins-2026-ncaa-skiing-championship)
- [NCAA.com. (2026, March 4). NC men's and women's skiing committee selects 2026 championship field.](https://www.ncaa.com/news/skiing/article/2026-03-04/nc-mens-and-womens-skiing-committee-selects-2026-championship-field)`,
  },

  triathlon: {
    title: "Triathlon",
    intro:
      "British triathletes in American college sport. An NCAA emerging sport for women, raced draft-legal, with the championship in November.",
    metaDescription:
      "British triathletes in American college sport — news, profiles and results from college triathlon in the United States.",
    pillar: `## British triathlon in American college sport

Triathlon is one of the NCAA's four current emerging sports for women — a recognised sport on its way to a full championship, but not there yet. It was adopted in 2014, and in 2025-26 42 institutions sponsor varsity triathlon, 14 of them in Division II. There is no equivalent NCAA route for men.

### The season

Triathlon is an autumn sport in the United States, which turns the calendar upside down for a European triathlete. The season builds to November, and USA Triathlon runs the championship race for all three NCAA divisions — in 2026 at Tempe, Arizona.

### How a race is decided

College triathlon is raced over the **draft-legal sprint distance**: a 750-metre open-water swim, a 20-kilometre bike and a 5-kilometre run. Drafting changes the sport fundamentally — the bike is ridden tactically in groups, as in road cycling, rather than alone, so the race is usually settled over the closing five kilometres.

### Programmes and standards

The number of programmes is growing steadily, and in autumn 2026 Conference Carolinas became the first NCAA conference to sponsor the sport as a whole. The way forward runs through the NCAA's emerging sports process, where a sport needs a set number of sponsoring schools to earn a championship of its own.

### Sources

- [USA Triathlon. (n.d.). NCAA triathlon.](https://www.usatriathlon.org/multisport/ncaa-triathlon)
- [NCAA. (n.d.). Emerging sports for women.](https://www.ncaa.org/championships/emerging-sports-for-women/)
- [NCAA. (2026, May 4). Conference Carolinas announces the addition of women's triathlon.](https://www.ncaa.org/news/2026/5/4/media-center-conference-carolinas-announces-the-addition-of-womens-triathlon.aspx)`,
  },

  polo: {
    title: "Polo",
    intro:
      "British polo players in American college sport. Arena polo, three a side, a national championship of its own — and no NCAA.",
    metaDescription:
      "British polo players in American college sport — news, profiles and results from college polo in the United States.",
    pillar: `## British polo in American college sport

College polo is run by the United States Polo Association through its Intercollegiate/Interscholastic programme. **It is not an NCAA sport**, but it is organised competition with regional circuits and a national championship — and one of the few college sports where teams ride the school's own horses.

### The season

The season follows the academic year and is settled in early spring: the 2026 national intercollegiate championships were played from 16 to 22 March, after the leading men's and women's teams had qualified through their regions.

### How a match is decided

College polo is played **in an arena rather than on a grass field**, under USPA arena rules. That means three players a side instead of four, a smaller boarded arena and a larger, softer ball. Teams share the horses on a "split string" principle, both sides riding from the same pool — precisely so that the match is decided by the players and not by who owns the most expensive ponies.

### Programmes and standards

More than 35 established intercollegiate programmes are spread across 15 men's and 26 women's teams in four regions. The field is small but stable, and the USPA also runs an international intercollegiate fixture in which American college players meet opposition from abroad.

### Sources

- [United States Polo Association. (n.d.). Intercollegiate.](https://www.uspolo.org/association/programs/intercollegiate-interscholastic/intercollegiate)
- [United States Polo Association. (n.d.). Division I men's national intercollegiate championship.](https://www.uspolo.org/calendar/tournaments/division-i-mens-national-intercollegiate-championship)
- [United States Polo Association. (2026). USA roster announced for 2026 international intercollegiate challenge cup.](https://www.uspolo.org/news-social/news/usa-roster-announced-for-2026-international-intercollegiate-challenge-cup)`,
  },

  "flag-football": {
    title: "Flag Football",
    intro:
      "British flag football players in American college sport. The fastest-growing women's sport in the college system — and an Olympic sport from 2028.",
    metaDescription:
      "British flag football players in American college sport — news, profiles and results from college flag football in the United States.",
    pillar: `## British flag football in American college sport

Flag football is the fastest-moving sport in American college athletics right now. The NCAA added it to its emerging sports for women programme in January 2026, and more than 120 schools are fielding a squad this academic year. The NAIA went further and made flag football its 30th championship sport from 2026-27, with the first NAIA national championship in spring 2027 and around 60 institutions taking part.

**And it is an Olympic sport.** Flag football makes its debut at the Los Angeles Games in 2028, with six teams in each of the two tournaments, men's and women's, and ten athletes per squad.

### How a match is decided

Five players a side and no tackling: the defence stops the play by pulling a flag from the ball carrier's belt. The field is 70 by 25 yards with two ten-yard end zones, and the match lasts 40 minutes in two halves. The offence has four downs to reach halfway and four more to reach the end zone.

### The season

The college season falls in the spring. The route to an NCAA championship runs through the emerging sports process, which requires at least 40 schools sponsoring the sport at varsity level along with minimum contest and participation standards — a threshold flag football had already cleared when the NCAA adopted it.

### Worth knowing

The combination is unusual: a sport that only recently took its place in the college system already has an Olympic debut ahead of it. That makes the recruiting window short and the visibility high for the players in it now.

### Sources

- [NCAA. (2026, January 16). NCAA adds flag football to Emerging Sports for Women program.](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-adds-flag-football-to-emerging-sports-for-women-program.aspx)
- [NAIA. (n.d.). Women's flag football.](https://www.naia.org/sports/wflag/index)
- [Olympics.com. (n.d.). Flag football at the Olympic Games Los Angeles 2028: Everything you need to know.](https://www.olympics.com/en/news/flag-football-at-the-olympic-games-los-angeles-2028-everything-you-need-to-know-about-the-new-sport-at-la-28)`,
  },

  cycling: {
    title: "Cycling",
    intro:
      "British riders on American college teams. Five national collegiate championships a year — road, track, mountain bike, cyclocross and now gravel.",
    metaDescription:
      "British riders in American college cycling — news, profiles and results from collegiate cycling in the United States.",
    pillar: `## British cycling in American college sport

Collegiate cycling sits outside the NCAA and is run by USA Cycling, which stages the national collegiate championships. In return there are more of them than in any other college sport: road, track, mountain bike and cyclocross each have their own title, and gravel joined as a fifth in 2026.

### The season

The calendar follows the disciplines across the whole year rather than gathering into one season. In 2026 the track championships were held from 10 to 13 September at the Major Taylor Velodrome in Indianapolis, mountain bike on 7 October in Grand Junction, Colorado, and cyclocross on 9 December in Fayetteville, Arkansas, while the road championships were staged in Wisconsin.

### Programmes and standards

Schools race in two tiers: a varsity division and a club division. At the mountain bike championships the varsity field runs to roughly 15-20 schools while the club division counts more than 30 — a structure that lets a rider compete for their university whether or not the school runs a fully funded programme.

### Worth knowing

From 2026 USA Cycling also runs high school categories at three of the collegiate championships — track, mountain bike and cyclocross — so the junior and collegiate fields meet on the same course on the same weekend.

### Sources

- [USA Cycling. (n.d.). National championships.](https://usacycling.org/national-championships)
- [USA Cycling. (2026). USA Cycling announces 2026 national championship schedule.](https://usacycling.org/article/usa-cycling-announces-2026-national-championship-schedule)
- [USA Cycling. (n.d.). Collegiate mountain bike national championships.](https://mtbnats.usacycling.org/coll-mtb)`,
  },

  archery: {
    title: "Archery",
    intro:
      "British archers on American college teams. Varsity programmes with scholarships, club squads, and four bow classes shooting for the same national title.",
    metaDescription:
      "British archers in American college sport — news, profiles and results from collegiate archery in the United States.",
    pillar: `## British archery in American college sport

Collegiate archery sits outside the NCAA and is run by USA Archery through its Collegiate Archery Program. The programme covers the full range: varsity teams with scholarships, club squads and student organisations all shoot in the same system and for the same championships.

### The season

The season turns on Collegiate Target Nationals, shot in 2026 at Lansing, Michigan from 14 to 17 May. The indoor season runs through the winter months leading up to it.

### How a championship is decided

There are four classes — recurve, compound, barebow and bowhunter — for both men and women, and all four count towards the overall national team championship. The bow is therefore both the discipline and the team sheet: a school can win overall without holding the best individual archer in any single class.

### Programmes and standards

The field runs from large universities with fully funded varsity programmes to pure club squads, which makes the way in broader than in most college sports. USA Archery also names an academic All-American team, where the grade average counts alongside the scores.

### Sources

- [USA Archery. (n.d.). Collegiate archery.](https://www.usarchery.org/participate/collegiate)
- [USA Archery. (2026). USA Archery Collegiate Target Nationals.](https://www.usarchery.org/events/national-tournaments/USA-Archery-Collegiate-Target-Nationals)
- [USA Archery. (2026). USA Archery announces the 2026 All-American Academic Team.](https://www.usarchery.org/news/top-athletes-and-top-students-usa-archery-announces-the-2026-all-american-academic-team)`,
  },

  "acrobatics-tumbling": {
    title: "Acrobatics & Tumbling",
    intro:
      "British acrobatics and tumbling athletes on American college teams. The NCAA's newest championship sport, voted through in January 2026.",
    metaDescription:
      "British athletes in NCAA acrobatics and tumbling — news, profiles and results from American college acrobatics & tumbling.",
    pillar: `## British acrobatics and tumbling in the NCAA

Acrobatics and tumbling is the newest sport on the NCAA's list. At the January 2026 convention, members from all three divisions voted to make it a championship sport, and the first NCAA championship is expected in spring 2027. Until then the title is decided by the National Collegiate Acrobatics & Tumbling Association, which has run the sport since long before the NCAA arrived.

**It is a women's sport**, and it grew by the same route as women's rugby and triathlon: into the NCAA's emerging sports programme in August 2020, past the threshold of 40 varsity schools, and on to a championship of its own. Today 52 NCAA institutions sponsor it at varsity level with more than 1,300 athletes.

### How a meet is decided

A meet runs to **six events** and usually lasts an hour and a half to two hours. Teams perform synchronised skills in acro, pyramid, toss and tumbling before a closing team routine, and every skill is scored on both difficulty and execution. The format is a head-to-head duel between two teams, with the score running throughout.

### Roles in the squad

Rosters are divided by what the body does: bases lift, tops are lifted and thrown, back spots protect, and tumblers run their passes without lifting anyone. It is a team sport built out of individual specialists, and recruiting follows the role.

### Worth knowing

The sport is often confused with cheerleading and with STUNT, but the three are neither the same thing nor under the same governing body. Acrobatics and tumbling has no chants, no pom-poms and no sideline — it is a competition from the first event to the last.

### Sources

- [NCAA. (2026, January 16). NCAA elevates acrobatics and tumbling to championship status.](https://www.ncaa.org/news/2026/1/16/media-center-ncaa-elevates-acrobatics-and-tumbling-to-championship-status.aspx)
- [National Collegiate Acrobatics & Tumbling Association. (2026). NCAA elevates acrobatics & tumbling to championship status.](https://thencata.org/news/2026/1/16/ncaa-elevates-acrobatics-tumbling-to-championship-status.aspx)
- [USA Gymnastics. (2026). Acrobatics & tumbling becomes an NCAA championship.](https://usagym.org/acrobatics-tumbling-becomes-an-ncaa-championship/)`,
  },

  ultimate: {
    title: "Ultimate",
    intro:
      "British ultimate players on American college teams. A self-refereed team sport with a national championship of its own, in two divisions.",
    metaDescription:
      "British ultimate players in American college sport — news, profiles and results from college ultimate in the United States.",
    pillar: `## British ultimate in American college sport

Ultimate sits outside the NCAA and is run by USA Ultimate, which stages the national college championships in two divisions: D-I for the larger programmes and D-III for smaller schools. Both divisions hold separate men's and women's championships, reached through sectionals and regionals across the spring.

### The season

The season builds to May. In 2026 both championships were played in Illinois: D-III at Waukegan from 16 to 18 May with 32 teams, D-I at Rockford from 22 to 25 May with 40 — 20 in each division. Middlebury won both the men's and women's D-III titles, the first sweep in the championship's history.

### How a game is decided

Seven players a side, and points are scored by catching the disc in the opponent's end zone. You may not run with the disc, so the game is built from throws and runs into space — handlers control the build-up, cutters run free. Games are played to 15 points under a time cap.

### What makes it different

Ultimate is **self-refereed**. Players call their own games under the principle of Spirit of the Game, and at the biggest tournaments observers assist rather than referee. It is the sport's defining feature, and one reason it has held on to its own governing body instead of seeking a place in the NCAA.

### Sources

- [USA Ultimate. (2026). 2026 D-I college championships.](https://usaultimate.org/2026-d-i-college-championships/)
- [USA Ultimate. (2026). D-III college championships wrap with historic sweep.](https://usaultimate.org/news/2026/06/d-iii-college-championships-wrap-with-historic-sweep/)
- [USA Ultimate. (2025). Illinois set to host 2026 college championships.](https://usaultimate.org/news/2025/08/illinois-set-to-host-2026-college-championships/)`,
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
