## Doel
De huidige Meta-fouten oplossen door (1) het nieuwe access token op te slaan en (2) een debug-hulp in de app te bouwen die de juiste Page ID + Instagram Business ID ophaalt zodat we ze zeker weten.

## Stappen

1. **Token opslaan**
   - `META_PAGE_ACCESS_TOKEN` updaten naar het zojuist geplakte token (via `update_secret`, secure form — ik plak het token niet zelf in code).

2. **Debug server function toevoegen** (`src/lib/meta.functions.ts`)
   - `debugMetaToken` (GET, auth-protected): roept Graph API aan met het huidige token:
     - `GET /me` → wie is het token van (user of page)
     - `GET /me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username,name,followers_count}` → alle Pages die dit token kan zien, met per-page token en gekoppeld IG Business account
     - `GET /debug_token` → geldigheid, expiry, scopes
   - Geeft een gestructureerd resultaat terug met alle IDs en scopes.

3. **Debug UI toevoegen** (`src/routes/settings.tsx`)
   - Nieuwe kaart "Meta diagnose" onder Platform-koppelingen met een "Diagnose uitvoeren"-knop.
   - Toont per gevonden Page: naam, Page ID, IG Business ID, username, gekoppelde scopes.
   - Kopieerknoppen naast elke ID.
   - Waarschuwing bij ontbrekende scopes (`pages_manage_posts`, `instagram_content_publish`, etc.).
   - Waarschuwing als token binnenkort verloopt (of "never" bij long-lived).

4. **Vervolgactie (na diagnose)**
   - Zodra jij de juiste Page ID + IG Business ID uit de diagnose kopieert, update ik `META_PAGE_ID` en `META_IG_BUSINESS_ID` via de secrets-form. Daarna zou de Meta-status in Instellingen groen moeten worden.
   - Als de diagnose laat zien dat het token een User Token is (geen Page Token), converteer ik in de debug-flow direct naar het Page-specifieke token uit `/me/accounts` — dat is meestal de echte oorzaak van dit soort 400-fouten.

## Waarom deze aanpak
De huidige fout ("Object does not exist / missing permissions") komt bijna altijd doordat het token bij een ander account/scope hoort dan de opgeslagen IDs. In plaats van gokken, laten we Graph API zelf de correcte waarden teruggeven. Meteen ingebouwd als herbruikbaar diagnose-scherm — handig als er later opnieuw iets misgaat (token expired, IG ontkoppeld, etc.).

## Technisch
- Geen wijziging aan bestaande `publishFacebookPost` / `publishInstagramPost` — die blijven werken zodra IDs kloppen.
- `debugMetaToken` gebruikt hetzelfde `graph()` helper-patroon dat er al staat.
- Alleen zichtbaar voor ingelogde gebruikers (`requireSupabaseAuth`).
