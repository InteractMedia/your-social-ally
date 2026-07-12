## Plan: Meta wizard testen

Domeinen en callback URL zijn toegevoegd in het Meta dashboard. Nu testen we de flow end-to-end en lossen we op wat er nog mist.

### Stappen

1. **Verifieer secrets** — check dat `META_APP_ID` en `META_APP_SECRET` opgeslagen zijn. Vraag `META_APP_SECRET` opnieuw op via de secure form als die ontbreekt.
2. **Open de wizard** — navigeer naar `/meta` en start de OAuth-flow via de "Autoriseer Meta"-knop.
3. **Popup flow controleren** — Facebook login popup opent met alle vereiste scopes: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`, `instagram_content_publish`.
4. **Callback afhandelen** — na akkoord stuurt Meta terug naar `/api/public/meta-callback`, die het token via `postMessage` naar de wizard stuurt.
5. **Account selectie** — wizard toont gevonden Facebook Pages + gekoppelde Instagram Business accounts. Gebruiker kiest de juiste combinatie.
6. **Secrets opslaan** — `META_PAGE_ID`, `META_IG_BUSINESS_ID`, `META_PAGE_ACCESS_TOKEN` worden opgeslagen via de secure form.
7. **Scope-check** — wizard toont groene vinkjes voor verleende scopes; rode kruisjes voor ontbrekende.
8. **Foutafhandeling per stap** — bij "domein niet toegevoegd", "invalid redirect_uri", of "missing scope" toont de wizard exact welke stap in Meta nog fout staat.

### Wat ik NIET aanpas
Geen wijzigingen aan `publishFacebookPost` / `publishInstagramPost`, LinkedIn, TikTok, of andere modules.

### Acceptatie
- OAuth popup opent zonder "domein niet toegevoegd"-fout.
- Callback sluit popup en toont pages in wizard.
- Na opslaan tonen `/settings` en `/meta` groene status voor Page + Instagram + alle scopes.
