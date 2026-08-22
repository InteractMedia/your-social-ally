# Google Ads koppelen en instellen

## Doel
Je echte Google Ads-account koppelen aan de app, zodat je campagnes, statistieken en keywords via de app kunt beheren.

## Stappen

1. **Google-account koppelen**
   - Lovable opent de Google-aanmeldpagina; jij logt in en geeft toestemming.
   - Lovable's connector-gateway regelt de OAuth-flow automatisch (geen handmatige callback-URL in Google Cloud nodig).

2. **Google Ads-account instellen**
   - Kiezen: bestaand account koppelen of nieuw account aanmaken.
   - Bij nieuw account: valuta (EUR) en tijdzone (Europe/Amsterdam) worden voorgesteld.

3. **Status controleren**
   - Controleren of de verbinding actief is, facturering is ingesteld en er een conversiedoel bestaat.
   - Eventuele ontbrekende stappen (zoals facturering of identiteitsverificatie in Google Ads) benoemen.

4. **App-integratie verifiëren**
   - Controleren of de bestaande Google Ads-pagina's in de app (dashboard, stats, campaign wizard) werken met de live verbinding.

## Wat je zelf doet in Google Ads
- Facturering instellen of controleren.
- Eventuele identiteitsverificatie afronden.
- UITNODIGING als ADMIN accepteren (bij nieuw account — krijg je per e-mail).

## Wat Lovable doet
- OAuth-verbinding tot stand brengen.
- Account koppelen of aanmaken.
- Conversie-tracking instellen zodra het account actief is.
