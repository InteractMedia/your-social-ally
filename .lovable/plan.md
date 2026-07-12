## Plan: Meta-koppeling wizard 2.0

### Doel
De huidige handmatige flow (token kopieren uit Graph API Explorer, permissions één voor één zoeken) vervangen door een wizard in de app die zelf de juiste permissions vraagt, het token omwisselt naar een Page-token, en meldt wat er nog mist.

### Gebruikersinput
- App ID in Graph API Explorer: `2787894608246851`
- Huidig zichtbare permissions: `ads_management`, `ads_read`, `business_management`, `pages_manage_ads`, `pages_read_engagement`, `pages_show_list`
- Waarschijnlijk missende permissions voor post-publicatie: `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`

### Stappen

1. **Nieuwe server functie: `exchangeMetaToken`** (`src/lib/meta.functions.ts`)
   - Ontvangt een kortstondige User Access Token van de frontend (na Facebook Login).
   - Wisselt deze in voor een long-lived User Access Token via `GET /oauth/access_token`.
   - Roept `GET /me/accounts` aan met dat long-lived token en slaat per gevonden Page het page-specific token op.
   - Retourneert: lijst van Pages, per Page de gekoppelde Instagram Business ID, en een lijst van verleende/missende scopes.
   - Gebruikt `requireSupabaseAuth`.

2. **Server functie: `checkMetaScopes`** (`src/lib/meta.functions.ts`)
   - Controleert het huidige `META_PAGE_ACCESS_TOKEN` via `/debug_token`.
   - Vergelijkt de teruggekomen scopes met een vereisten-set:
     - Voor Facebook posts: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
     - Voor Instagram posts: `instagram_basic`, `instagram_content_publish`
   - Retourneert een object met `granted`, `missing` en `isPageToken`.

3. **Meta OAuth callback route** (`src/routes/api/public/meta-callback.ts`)
   - Een publieke server route onder `/api/public/meta-callback` die de Facebook-redirect opvangt (`code` + `state`).
   - Wisselt `code` in voor een short-lived User Access Token.
   - Geeft het token terug aan de frontend via een redirect met query-param of postMessage.
   - Valideert `state` tegen een server-side cookie of session.
   - Geen state-changing DB-acties zonder token-validatie.

4. **Wizard UI uitbreiden** (`src/routes/meta.tsx`)
   - Stap 1: Klik "Autoriseer Meta" → opent Facebook OAuth met alle benodigde scopes in één request.
   - Stap 2: Callback verwerkt het token en toont de gevonden Pages.
   - Stap 3: Gebruiker kiest de juiste Page + gekoppeld Instagram Business account.
   - Stap 4: App slaat `META_PAGE_ID`, `META_IG_BUSINESS_ID` en het page-specific token op in secrets.
   - Stap 5: Scope-check toont groene vinkjes voor verleende scopes en rode kruisjes voor missende scopes.
   - Stap 6: "Opnieuw autoriseren"-knop vraagt alleen de missende scopes opnieuw aan.

5. **Settings-integratie** (`src/routes/settings.tsx`)
   - Vervang de handmatige diagnose-kaart door een statuskaart met:
     - Huidige Page/IG status
     - Lijst van verleende vs missende scopes
     - "Verbinden / Opnieuw verbinden"-knop
     - "Diagnose uitvoeren"-knop als secundaire optie

6. **Secrets update**
   - Bij succesvolle wizard-flow: `META_PAGE_ID`, `META_IG_BUSINESS_ID`, `META_PAGE_ACCESS_TOKEN` updaten via de secure secrets-form.
   - Geen tokens in code of logs.

### Technisch
- Geen wijzigingen aan `publishFacebookPost` / `publishInstagramPost`; die werken zodra IDs + token + scopes kloppen.
- De Graph API app ID `2787894608246851` wordt gebruikt in de OAuth-redirect-URL.
- OAuth `redirect_uri` = `https://socialcockpit.nl/api/public/meta-callback` (of `window.location.origin` voor preview).
- TikTok/LinkedIn blijven ongemoeid.

### Acceptatiecriteria
- Gebruiker kan Meta koppelen zonder Graph API Explorer te openen.
- Wizard toont duidelijk welke permissions ontbreken.
- "Opnieuw verbinden" vraagt precies de missende scopes opnieuw aan.
- Na succesvolle koppeling zijn de 400-fouten "Object does not exist" verdwenen.
- Secrets blijven veilig opgeslagen; geen tokens in frontend state.