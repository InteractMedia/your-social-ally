Plan: Meta-wizard slaat de koppeling automatisch op

Op dit moment toont de wizard de gevonden Page ID, IG Business ID en Page Access Token, maar de gebruiker moet ze handmatig kopiëren naar de app-secrets. De app zelf kan niet schrijven naar project-secrets, dus we verplaatsen de gebruikersspecifieke Meta-credentials naar een database-tabel. Daarna kan de wizard de koppeling zelf opslaan zodra de gebruiker een Page selecteert.

### Stappen

1. **Database-tabel aanmaken**
   - Nieuwe tabel `public.meta_connections`:
     - `id uuid primary key default gen_random_uuid()`
     - `user_id uuid references auth.users(id) on delete cascade not null`
     - `page_id text not null`
     - `page_name text`
     - `page_access_token text not null`
     - `ig_business_id text`
     - `ig_username text`
     - `scopes text[]`
     - `app_id text not null`
     - `created_at / updated_at timestamptz default now()`
   - RLS aanzetten, `GRANT SELECT, INSERT, UPDATE, DELETE` aan `authenticated`, `ALL` aan `service_role`.
   - Policy: gebruiker mag alleen zijn eigen rijen lezen/schrijven (`auth.uid() = user_id`).

2. **Serverfunctie toevoegen**
   - In `src/lib/meta.functions.ts` een nieuwe `createServerFn` genaamd `saveMetaConnection`.
   - Input: `pageId`, `pageName`, `pageToken`, `igBusinessId`, `igUsername`, `scopes`, `granted`, `missing`.
   - Verifieert `requireSupabaseAuth`, slaat een rij op in `meta_connections` voor de huidige gebruiker (upsert op `user_id`).
   - Retourneert `{ ok: true }` of een foutmelding.

3. **Wizard aanpassen**
   - In `src/routes/meta.tsx` de serverfunctie `saveMetaConnection` importeren via `useServerFn`.
   - Wanneer de gebruiker een Facebook Page selecteert met alle vereiste scopes, wordt `saveMetaConnection` automatisch aangeroepen.
   - Toon een "Opslaan..." / "Koppeling opgeslagen" indicator in de UI.
   - De `DoneStep` toont voortaan "Koppeling is live gezet" in plaats van "Sla de waardes op in de app-secrets".
   - De CopyRow-knoppen voor Page ID / IG Business ID / Page Access Token blijven beschikbaar ter inspectie, maar de primaire actie is automatisch.

4. **Bestaande Meta-functies omzetten naar database-lezen**
   - Voeg een helper `getUserMetaConnection()` toe in `src/lib/meta.functions.ts` die met `requireSupabaseAuth` de rij voor `auth.uid()` ophaalt.
   - Pas de volgende functies aan zodat ze de per-user connectie gebruiken in plaats van `process.env.META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` en `META_IG_BUSINESS_ID`:
     - `creds()`
     - `getMetaStatus`
     - `debugMetaToken`
     - `checkMetaScopes`
     - `publishFacebookPost`
     - `publishInstagramPost`
   - `process.env.META_APP_ID` en `process.env.META_APP_SECRET` blijven project-secrets en worden niet vervangen; de app-credentials horen op projectniveau.

5. **Terugkoppeling in app**
   - `/settings` en `/meta` tonen na het opslaan direct de groene status voor Facebook, Instagram en scopes.
   - Het dashboard gebruikt `getMetaStatus` en ziet de nieuwe koppeling direct zonder handmatige secrets-stap.

### Technische details

- Opslag van de `page_access_token` gebeurt server-side in Supabase, beschermd door RLS. De frontend ziet het token nooit.
- De `saveMetaConnection` functie draait onder `requireSupabaseAuth`, zodat alleen ingelogde gebruikers hun eigen rij kunnen aanmaken of bijwerken.
- Bestaande env-secrets (`META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN`, `META_IG_BUSINESS_ID`) worden uitgefaseerd voor runtime-gebruik; ze kunnen eventueel als fallback blijven bestaan voor backwards-compatibiliteit, maar de database is leidend.

### Wat ik NIET aanpas
- LinkedIn-, TikTok- of YouTube-koppelingen.
- De ads-module.
- UI-thema of layout.

### Acceptatie
- Gebruiker opent `/meta`, klikt "Autoriseer Meta", selecteert een Page.
- De wizard toont "Koppeling opgeslagen" zonder dat de gebruiker iets hoeft te kopiëren.
- `/settings` en het dashboard tonen direct de groene Meta-status.
- Publiceren via de Composer werkt met de automatisch opgeslagen token.