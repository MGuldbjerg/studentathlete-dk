# Danish calques and false friends in sports copy — proposal

Status: **wired 2026-10-19** (prompt rule 33 in `pipeline/generate/prompts/system.ts`; mechanical check
`pipeline/checks/danish-calques.ts` → `quality-check.ts` category `language`, Danish only, severity medium).
Decisions (Mikkel): "konference" is used; award names stay English ("Rookie of the Week"); "faldt til 0-2-0"
about a falling record is correct Danish and is NOT flagged.
Written 2026-10-19 after the draft "Villads Juma Baden scorede i 2-4-tabet til Longwood …"
(unpublished, `published=0`).

## How this was made (and its limits)

* Scanned the 66 Danish articles in D1 for result/stat vocabulary; real errors found are tagged **\[corpus]**.
* A web search for Danish usage returned almost nothing usable (confirmed only: *hattrick* is one word, lex.dk).
The rest is Danish sports-writing convention from knowledge, **not** source-verified. Treat as a
proposal for a native-speaker decision, not as fact.
* Existing guards: `style\_corrections` has no result-phrasing entries at all; prompt rule 6 covers only
sport names. Nothing mechanical checks phrasing (`pipeline/checks/` has numbers/names only).

## A. Results — highest risk

|English|Wrong (calque)|Use|Note|
|-|-|-|-|
|scored in the 2-4 loss|"scorede i 2-4-tabet" **\[corpus]**|"scorede i 2-4-nederlaget" / "scorede, da X tabte 2-4 til Y"|*tab* is a loose synonym, but score compounds are always *-sejr / -nederlag / -uafgjort*|
|1-1 draw|"1-1 draw", "en 1-1 uafgjort"|"1-1" / "spillede 1-1"||
|X fall to Y (loses)|"falder til Y"|"tabte til Y"|"faldt til 0-2-0" about a record dropping is fine (Mikkel)|
|beat / defeated|"bankede", "besejrede" as default|"vandt 3-1 over", "slog"|*besejrede* ok but heavy|
|overtime loss|"overtidsnederlag" (soccer)|soccer: "forlænget spilletid"; hockey/lacrosse/basketball: "overtid"||
|shootout|"shootout" in soccer|"straffesparkskonkurrence"|"shootout" stays in ice hockey|
|shutout / clean sheet|"shutout" for soccer **\[corpus]**|"holdt buret rent" / "clean sheet"|"shutout" ok in baseball/hockey/lacrosse|
|14-5 record|"14-5 record" **\[corpus]**|"14 sejre og 5 nederlag"|*rekord* = record-breaking, not W-L|
|unbeaten run|"ubesejret stime"|"ubesejret i ni kampe"|"ubesejret stime" kan bruges, men i den rette form - fx: holdet er på en ubesejret stime, der nu strækker sig over 9 kampe|
|upset|"forstyrrelse"|"overraskende sejr"||
|clinched a berth|"klinchede"|"sikrede sig en plads"||
|signs off / stempler ud **\[corpus]**|"stempler ud med nederlag"|"afsluttede med nederlag"|meaningless in Danish|
|game-winner|"spilvinder"|"sejrsmål" / "matchvinder"||
|equalizer / go-ahead|"equalizer"|"udligning" / "bragte X foran"||
|hat trick|"hat trick"|"hattrick"|verified (lex.dk)|
|brace|"brace"|"to mål"||

## B. Placement and ranking

|English|Wrong|Use|
|-|-|-|
|ranked No. 11|"ranket", "rangeret som nummer 11" (stiff) **\[corpus]**|"nr. 11 på ranglisten" / "placeret som nr. 11"|
|finished 13th|"afsluttede 13."|"blev nr. 13" / "sluttede som nr. 13"|
|T9 / tied for 9th|—|"delt niendeplads" (already used, correct)|
|third seed|"tredje seed"|"tredjeseedet"|
|top-10 finish|"top ti finish"|"top 10-placering"|

## C. Stats

|English|Wrong|Use|
|-|-|-|
|career-high 13 saves|"karriere-høj"|"personlig rekord med 13 redninger"/"karriere bedste"|
|first career goal|"første karrieremål"|"første mål i karrieren" / "første collegemål"|
|24 starts|"24 starter" **\[corpus]**|"24 kampe fra start"|
|started the match|"startede kampen" (ambiguous)|"stod i startopstillingen"/"startede kampen"|
|appearances|"optrædener"|"kampe"|
|points (soccer)|"point"|"målbidrag" (goals + assists) / "point"|
|came off the bench|"kom af bænken"|"kom ind fra bænken" / "blev skiftet ind"|

## D. Competition structure

|English|Use|Note|
|-|-|-|
|regular season / postseason|grundspil / slutspil|"postseason" only inside proper names|
|season opener / finale|sæsonåbning/åbningskamp / sæsonfinale/sidste kamp i sæsonen||
|home opener|første hjemmekamp||
|conference|"konference" (decided); proper names stay English (Big South Conference)|"konference" also means meeting; proper names stay English (Big South Conference)|
|roster|trup||
|head / assistant coach|cheftræner / assistenttræner||
|athletic trainer|fysioterapeut / fys|*træner* = coach, so "trainer" misleads|
|signed (National Letter of Intent)|"underskrev en hensigtserklæring"|not "skrev kontrakt" — NLI is not a contract; existing rule maps this to "sluttede sig til"|
|honorable mention|"honorable mention" in quotes|"hæderlig omtale" is wrong|
|Player/Rookie of the Week|keep the English award name (decided)|currently mixed ("ugens forsvarsspiller" vs. "Rookie of the Week")|
|rivalry|"rivalerne"; **never "derby"** unless same city||

## E. Sport-specific

* **Football trap:** *football* = "amerikansk fodbold", *soccer* = "fodbold" — never swap (rule 6 covers soccer only).
* Sport names: field hockey = **landhockey**, ice hockey = ishockey, water polo = vandpolo, beach volleyball = beachvolley,
rowing = roning, wrestling = bryd, fencing = fægtning, diving = udspring, track \& field = atletik.
* Tennis: singles/doubles → **single/double** (no -s, already used); straight sets = "i to lige sæt"; dual match = holdkamp;
"clinched the point" = "afgjorde holdkampen".
* Golf: "cards a 68" → "spillede 68 slag"; −3 → "tre under par"; stroke average = slaggennemsnit; stroke play = slagspil;
birdie/bogey/eagle stay.
* Swimming: **keep yards** ("500 yards fri"), never silently metres; free/back/breast/fly = fri/ryg/bryst/butterfly; IM = medley; relay = stafet.
* Athletics: meet = stævne; PR = personlig rekord; pole vault = stangspring; heptathlon/decathlon = syvkamp/tikamp.

## F. Formatting traps

* Decimal comma: `22:41,9`, not `22:41.9`. Thousands with `.`
* Height `6'4"` → "1,93 m"; °F → °C. (The Wofford piece printed `6’4”` raw **\[corpus]**.)
* Score compounds hyphenated whole: "1-3-nederlag", "4-0-sejr" (already right).
* Ordinals: "i det 87. minut". Dates "den 2. oktober". Clock "kl. 19.00".
* Possessive: abbreviations take `'s` ("SCSU's"); ordinary names take `s` without apostrophe ("Winthrops").
* Don't translate team nicknames (Eagles, Bulldogs) or class years (existing rule).

## G. General false friends to forbid

actual → *faktisk* (not "aktuel"); eventually → *til sidst* (not "eventuelt"); decent → *ordentlig*;
competition → *konkurrence/turnering*; physical → *fysisk/kropsbetonet*; clinical → *effektiv*;
major (study) → *hovedfag/studieretning*; senior/junior stay English as class years.

## Implementation

1. Done: prompt rule 33 (compact «Resultatsprog» block).
2. Done: `danish-calques.ts` + tests (`npx tsx pipeline/checks/\_danish-calques-test.ts`), wired into `checkDraft`.
3. Open (data fix, needs Mikkel's OK): the flagged draft "…2-4-tabet til Longwood", and "stempler ud" in published copy.

