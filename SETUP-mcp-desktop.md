# Claude Desktop som connector — opsætning

Kontekstpakken (`desktop-pakke/`) giver Desktop-Claude **viden** om projektet.
Denne connector giver den **hænder**: den kan liste og omskrive kladder, læse
kilderne bag dem, redigere sider og slå atleter op — direkte mod den live
database, uden at gå gennem Claude Code.

## 1. Sæt hemmeligheden (én gang)

Endepunktet er lukket, indtil `MCP_TOKEN` findes på workeren. Kør i WSL:

```bash
cd ~/projekter/studentathlete-dk
openssl rand -hex 24 | tee /dev/stderr | wrangler secret put MCP_TOKEN
```

`tee /dev/stderr` printer tokenet i terminalen, mens det sendes til Cloudflare.
**Gem det i din adgangskodemanager** — det står ingen steder i repoet, og
Cloudflare viser det aldrig igen.

## 2. Tilføj connectoren i Claude Desktop

Indstillinger → Connectors → **Add custom connector**. Har dialogen et felt til
API-nøgle eller request headers, så brug det — så holder tokenet sig ude af
URL'er, logs og browserhistorik:

```
URL:    https://studentathlete.dk/api/mcp
Header: Authorization: Bearer <dit-token>
```

Har dialogen **kun** et URL-felt (ældre builds), så læg tokenet i stien i stedet:

```
https://studentathlete.dk/api/mcp/<dit-token>
```

Samme server, samme værktøjer. Serveren tager imod tokenet tre steder:
`Authorization: Bearer`, `X-MCP-Token` og som sidste sti-segment.

OAuth-felterne i dialogen skal ikke bruges — de kræver en OAuth-server, vi ikke
har.

## 3. Tjek at den svarer

```bash
# Header-vejen
curl -s -X POST https://studentathlete.dk/api/mcp \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 400

# Sti-vejen
curl -s -X POST https://studentathlete.dk/api/mcp/$MCP_TOKEN \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | head -c 400
```

Forkert eller manglende token svarer `401`, manglende secret svarer `503`.

## Værktøjerne

| Værktøj | Læser/skriver | Gør |
|---|---|---|
| `list_drafts` | læser | Upublicerede kladder med seneste verdict (ok/fix/reject) |
| `get_draft` | læser | Kladde + kildens manchet og sidetekst + faktaark + atletens data + gennemgangens fund |
| `save_draft` | **skriver** | Gemmer titel/manchet/brødtekst på en kladde. Publicerer aldrig |
| `publish_draft` | **skriver** | Publicerer — kræver `confirm: true` og nægter ved verdict `reject` |
| `list_pages` / `get_page` | læser | Pillartekster, guider og faste sider pr. land |
| `save_page` | **skriver** | Gemmer en sides tekst (advarer når siden også findes i koden) |
| `search_athletes` | læser | Slår atleter op på navn, sport, universitet, hjemland |
| `site_stats` | læser | Atleter pr. sport/land, kladdekø, publicerede artikler |

## Sikkerheden — sagt højt

**Tokenet ER adgangen** — uanset hvilken af de to veje du bruger. Header-vejen
er den bedste af dem: et token i en URL ender i browserhistorik, i logs og i
enhver skærmdeling af adresselinjen, mens en header kun ligger i Desktops egen
opsætning. Kan din build ikke sende headers, virker sti-vejen — men så er
**URL'en adgangskoden**, og alle med den kan skrive i kladder og sider.

**Hvorfor ikke bare give Desktop Cloudflare-tokenet?** Fordi det er en anden
størrelse adgang. Cloudflares egen D1-MCP-server ville lade Desktop køre vilkårlig
SQL mod hele kontoen — også `DROP TABLE` — uden om `publishArticle`,
uden om spærren mod automatisk publicering og uden om `/admin`s kodeveje.
Denne connector kan præcis ni ting, og hver af dem gør det samme som knappen i
admin gør.

- **Roter**: kør kommandoen i trin 1 igen og opdater URL'en i Desktop. Den gamle
  URL dør i samme øjeblik.
- **Luk helt**: `wrangler secret delete MCP_TOKEN` → endepunktet svarer 503 for
  alle.
- **Adgangen er begrænset til værktøjerne ovenfor** — ingen vilkårlig SQL, ingen
  sletning af atleter eller artikler, ingen adgang til andre tabeller.
- `/api/mcp` ligger bevidst uden for Cloudflare Access (som dækker `/admin` og
  `/api/admin`), fordi Desktop ikke kan gennemføre et Access-login.

**Publicering**: `publish_draft` findes, fordi du skal kunne sige "udgiv #109" i
Desktop. Den kræver `confirm: true` og nægter kladder, som gennemgangen har
afvist. Vil du helt fjerne muligheden, så slet værktøjet fra
`src/lib/mcp-server.ts` og deploy — resten virker uændret.

## Filerne

- `src/lib/mcp-server.ts` — værktøjerne og JSON-RPC-håndteringen
- `src/app/api/mcp/[token]/route.ts` — transport og token-tjek
- `pipeline/generate/_mcp-server-test.ts` — test af protokol og spærrer (i CI)
