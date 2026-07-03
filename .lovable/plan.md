## Doel
De 6-staps Google Ads campagne wizard bestaat al op `/ads/google/new` maar mist per-keyword match types en een paar aanmaak-details. Deze plan maakt de wizard volledig productie-waardig (nog steeds Fase 1 in-memory demo).

## Wat er nu al staat
`src/routes/ads.google.new.tsx` heeft de 6 stappen: Doel → Naam & budget → Targeting → Keywords → Advertentie → Review. Store en types in `src/lib/google-ads-store.ts` ondersteunen al `broad | phrase | exact` match, meerdere adGroups en volledige campagne-structuur.

## Wat ontbreekt / wordt toegevoegd

**Stap 4 — Keywords (grootste uitbreiding)**
- Match-type kiezer per keyword: chips `Broad` / `"Phrase"` / `[Exact]` naast elke geselecteerde keyword; default = phrase.
- Vrije keyword-invoer: input + "Toevoegen" knop + parse van plak-lijst (regel per keyword, syntax `[woord]` = exact, `"woord"` = phrase, anders broad).
- Negatieve keywords sectie: aparte lijst met eigen input, opgeslagen op ad group.
- Geselecteerde-lijst wordt een tabel met kolommen keyword / match / geschatte CPC / verwijder-knop.

**Stap 2 — Naam & budget**
- Toevoegen: Start-datum en optionele eind-datum (date inputs).
- Waarschuwing als dagbudget < aanbevolen (2× hoogste CPC × 10).

**Stap 3 — Targeting**
- Toevoegen: Device-targeting (Desktop/Mobile/Tablet checkboxes, default alle aan).
- Ad-schedule preset: `Altijd` / `Werkdagen 08–20` / `Custom` (custom = simpele dag×uur grid, optioneel — als het te groot wordt vervalt custom).

**Stap 5 — Advertentie**
- Karakter-tellers per regel (headline 30, description 90), rood bij overschrijding, blokkeer Volgende.
- Live preview van de Search-ad (headline1 · headline2 | url \n description).

**Stap 6 — Review**
- Volledige samenvatting inclusief nieuwe velden (match types tellen per type, negatives, schedule, devices).
- Twee submit-knoppen: `Opslaan als concept` (status `concept`) en `Publiceer` (status `actief`).

**Types & store**
`GoogleAdGroup` uitbreiden met `negatives: { text; match }[]`. `GoogleCampaign` uitbreiden met `startDate`, `endDate?`, `devices: ("desktop"|"mobile"|"tablet")[]`, `schedule: "always" | "business-hours" | { day: number; from: string; to: string }[]`. Bestaande seed-data blijft werken door velden optioneel te maken met sensible defaults.

## Bestanden
- `src/routes/ads.google.new.tsx` — hoofd-refactor van de wizard-content, stepper blijft gelijk.
- `src/lib/google-ads-store.ts` — types uitbreiden (optionele velden) + `create()` behoudt huidige contract.
- `src/routes/ads.google.$campaignId.tsx` — detail-pagina toont nieuwe velden (match types kolom, negatives, schedule, devices) — read-only, geen edit-flow in deze scope.

## Buiten scope
- Geen echte Google Ads API-koppeling (blijft Fase 2).
- Geen bewerken van bestaande campagnes vanuit de wizard.
- Geen A/B-ads binnen één ad group (blijft bij 1 responsive search ad).
