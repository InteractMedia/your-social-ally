# LinkedIn Prospect Radar — AI-doelgroepen en uitnodigingen

## Waarom niet volautomatisch

LinkedIn biedt geen API om connectieverzoeken te versturen. De gekoppelde connector kan alleen het profiel lezen en posts plaatsen. Automatisch uitnodigen kan dus alleen via scraping-tools, wat tegen de voorwaarden ingaat en tot accountbeperkingen leidt. Deze module doet daarom alles eromheen: wie benaderen, met welke tekst, in welk tempo — het klikken op "Uitnodigen" blijft in LinkedIn zelf.

Richtlijnen die de app bewaakt:
- Circa 100–200 uitnodigingen per week (veilig dagtempo ±20)
- Maximaal 3.000 openstaande uitnodigingen
- Acceptatiegraad onder ~35% is een waarschuwingssignaal

## Wat we bouwen

### 1. Doelgroepprofielen (ICP)
Nieuwe pagina `/prospects` met een formulier: branche, bedrijfsgrootte, regio, functietitels, trefwoorden en aanleiding (bijv. kerstgeschenken, personeelsattenties). Claude maakt hieruit een doelgroepprofiel met:
- Beschrijving van het ideale bedrijf en de beslisser
- Set functietitels en synoniemen (NL + EN)
- Trefwoorden en uitsluitingen
- Waarom deze groep past bij het ZoetBezorgen-aanbod

### 2. Zoeklinks
Per profiel genereert de app kant-en-klare LinkedIn-zoek-URL's (gewone zoekfunctie en Sales Navigator-variant) met de juiste filters in de querystring. Eén klik opent de lijst met echte mensen in LinkedIn.

### 3. Prospectlijst met status
Vanuit LinkedIn plak je naam + profiel-URL (of meerdere regels tegelijk) terug in de app. Per prospect: bedrijf, functie, doelgroepprofiel, status (suggestie → uitgenodigd → geaccepteerd → afgewezen/geen reactie), datum en notitie.

### 4. Uitnodigingstekst
Claude schrijft per prospect een persoonlijke uitnodiging van maximaal 300 tekens (LinkedIn-limiet), in de ZoetBezorgen-tone, met kopieerknop. Nooit afkappen: te lang wordt herschreven.

### 5. Quotabewaking
Bovenaan een teller: vandaag verstuurd, deze week verstuurd, openstaand, acceptatiegraad. Kleurcodering op basis van de limieten hierboven, met een duidelijke stop-melding bij overschrijding.

## Buiten scope
- Automatisch versturen van uitnodigingen of berichten
- Follow-up-sequenties na acceptatie
- Koppeling met de Lead Manager (prospects blijven een losse lijst)

## Technisch

- Migratie: tabellen `linkedin_icp_profiles` en `linkedin_prospects` (workspace-scoped, RLS op eigenaar/workspace + GRANTs voor `authenticated` en `service_role`).
- Server functions in `src/lib/linkedin-prospects.functions.ts` met `requireSupabaseAuth`: profiel genereren, prospects toevoegen/bijwerken, quota berekenen.
- AI-logica in `src/lib/linkedin-prospects.server.ts` via de bestaande `callLovableAI` gateway, met JSON-schema-output en merkcontext uit `src/lib/landing-brand.ts`.
- Zoek-URL-opbouw in een pure helper `src/lib/linkedin-search-url.ts` (testbaar, geen API-calls).
- UI: `src/routes/prospects.tsx` in de bestaande `AppShell`, met eigen `head()`-metadata; menu-item in `src/components/app-shell.tsx`.
- Quota-berekening server-side uit de statusdata, niet uit localStorage.
