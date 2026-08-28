# Reverse proxy: zakelijk.zoetbezorgen.nl

De publieke offertefunnel draait op `zakelijk.zoetbezorgen.nl`, maar wordt
geserveerd door dezelfde Lovable-app als `socialcockpit.nl`. Het primaire
Lovable-domein blijft `socialcockpit.nl`; er is geen tweede project en geen
gedupliceerde landingpage-code.

## Deploy

1. Cloudflare > Workers & Pages > Create Worker, plak `worker.js`.
2. Route toevoegen: `zakelijk.zoetbezorgen.nl/*` (zone `zoetbezorgen.nl`).
3. DNS: `zakelijk` als proxied (oranje wolk) record.

## Wat wel/niet door de proxy komt

Toegestaan: `/offerte/*`, `/cadeauplatform/*`, `/sitemap.xml`, `/robots.txt`,
`/api/public/*`, `/_serverFn/*` (formulier + tracking), en statische assets.
Al het andere (dashboard, auth, `/leads`, `/ads`, `/settings`) geeft 404 op
deze host en blijft alleen op `socialcockpit.nl`.

## Loop- en hostbescherming

- De Worker zet `x-zb-proxy: 1`; een request dat die header al heeft krijgt 508.
- `Location`-headers naar de origin-host worden herschreven naar de publieke
  host, zodat de browser nooit ongemerkt naar `socialcockpit.nl` springt.
- `Set-Cookie` wordt van `domain=` gestript zodat cookies host-only blijven.

## Rollback

Verwijder de Worker-route in Cloudflare, óf zet de env var `DISABLED = "1"`.
Er is geen state en geen migratie; het terugdraaien is direct.
