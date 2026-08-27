# Reverse proxy: zakelijk.zoetbezorgen.nl

Doel: `https://zakelijk.zoetbezorgen.nl/offerte/...` geeft rechtstreeks HTTP 200,
zonder redirect naar `socialcockpit.nl`, terwijl:

- `socialcockpit.nl` het primaire Lovable-domein + dashboard blijft (ongewijzigd);
- er geen tweede project en geen gedupliceerde Landing Page Engine bestaat;
- dezelfde Lovable Cloud/database, editor, analytics, formulieren en attributie werken.

## Hoe het werkt

De Worker proxyt alleen een strikte allowlist server-side naar het primaire
domein `socialcockpit.nl` — het enige hostname dat rechtstreeks HTTP 200 geeft
(de andere Lovable-hostnames redirecten of geven 403). Omdat die fetch in de
Worker gebeurt, blijft de bezoeker in de browser op `zakelijk.zoetbezorgen.nl`.


Toegestaan: `/offerte/*`, `/sitemap.xml`, `/robots.txt`, `/favicon.ico`,
`/assets/*`, `/_build/*`, `/__l5e/*`, `/zp/*`, `/_serverFn/*`, `/api/public/*`,
`/~flock.js`, `/~api/*` (deze laatste twee laadt de pagina zelf in).
Al het overige (dashboard, auth, admin, editor) geeft **404** op dit domein.

Verder: loop-protectie (`x-zb-proxy` + 508), Location-rewrite naar de publieke
host, `Set-Cookie` `Domain=` gestript (host-only cookies), CORS voor server
functions op de publieke origin, en security headers (HSTS, nosniff, referrer).

## Vereiste vóór deploy (eenmalig, buiten Lovable)

`zoetbezorgen.nl` staat nu op TransIP-nameservers (`ns0/1/2.transip.*`).
Cloudflare Workers kunnen alleen op een zone die Cloudflare beheert. Kies één:

1. **Zone naar Cloudflare verhuizen** (aanbevolen, gratis plan): voeg
   `zoetbezorgen.nl` toe in Cloudflare, importeer de DNS-records (inclusief MX,
   SPF, DKIM, DMARC — controleer die vóór de switch), zet de nameservers bij
   TransIP om naar Cloudflare, wacht op "Active".
2. **CNAME-setup (partial zone)**: alleen op Cloudflare Business/Enterprise.

Daarna in Cloudflare DNS: `zakelijk` als **proxied** record (oranje wolk),
bijvoorbeeld `CNAME zakelijk -> socialcockpit.nl`.
Het bestaande A-record `185.158.133.1` mag blijven; de Worker-route onderschept
het verzoek vóór de origin-fetch.

Optioneel maar aanbevolen: verwijder daarna `zakelijk.zoetbezorgen.nl` uit
Projectinstellingen → Domeinen, zodat de Lovable-edge dit hostname niet meer als
secundair domein redirect. Canonical/og:url in de app staan al hardcoded op
`https://zakelijk.zoetbezorgen.nl` en veranderen hier niet.

## Deploy

```bash
cd infra/cloudflare/zakelijk-proxy
npx wrangler login
npx wrangler deploy
```

## Rollback (30 seconden)

```bash
npx wrangler delete zakelijk-proxy   # verwijdert Worker + route
```
Of in het Cloudflare-dashboard: Workers & Pages → `zakelijk-proxy` → Settings →
Domains & Routes → route verwijderen. Het domein valt dan terug op het huidige
gedrag; er is niets in de applicatie of database gewijzigd.

## Na deploy: smoketest

```bash
curl -sI https://zakelijk.zoetbezorgen.nl/offerte/bouw     # verwacht: 200, geen Location
curl -sI https://zakelijk.zoetbezorgen.nl/sitemap.xml      # verwacht: 200, xml
curl -sI https://zakelijk.zoetbezorgen.nl/settings         # verwacht: 404
```
Daarna volgt de volledige productie-smoketest (design, assets, mobiel,
TEST-offerte, tracking-events, Lead Manager) en pas bij volledig groen mag
Campaign Builder `execution_eligibility = ALLOWED` worden.
