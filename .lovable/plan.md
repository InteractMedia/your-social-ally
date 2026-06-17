# Google Ads volledig beheer

Korte versie: Google Ads is het enige platform waar volledig beheer (incl. campagnes aanmaken) realistisch in deze app past. Meta/TikTok/LinkedIn blijven read-only + deeplink naar hun eigen Ads Manager. Google krijgt extra functionaliteit.

We bouwen in twee fases. Fase 1 is direct te bouwen, Fase 2 vereist een Google Developer Token (jij vraagt aan, ~1–3 dagen).

---

## Fase 1 — Volledige UI met demo-data (nu te bouwen)

Werkende UI met realistische mock-campagnes. Zo zie je meteen of de flow klopt, en we kunnen later 1-op-1 de demo-laag vervangen door echte Google Ads API-calls.

### Nieuwe routes

- `/ads/google` — krijgt extra knoppen (Pauzeer/Activeer, Bewerk budget, Bewerk ad-tekst, **+ Nieuwe campagne**)
- `/ads/google/$campaignId` — campagne-detail: ad groups, ads, keywords, stats per niveau
- `/ads/google/$campaignId/edit` — bewerk budget, bod-strategie, geo, schema
- `/ads/google/new` — 6-stappen wizard:
  1. Doel (Sales / Leads / Website traffic)
  2. Campagne-naam + dagbudget + bod-strategie
  3. Geo + talen + schema
  4. Ad group + keywords (met suggesties uit demo keyword planner)
  5. Responsive Search Ad (15 headlines, 4 descriptions, sitelinks)
  6. Review + "Aanmaken" knop

### Nieuwe componenten (in `src/components/ads/google/`)

- `CampaignTable.tsx` — lijst met inline pauzeer/activeer toggle
- `CampaignWizard.tsx` — multi-step form (react-hook-form)
- `KeywordPlannerPanel.tsx` — suggesties + match types (broad/phrase/exact)
- `ResponsiveSearchAdEditor.tsx` — live preview van Google SERP-ad
- `BudgetBidEditor.tsx`
- `AdGroupList.tsx`

### Data-laag

Uitbreiding van `src/lib/demo-ads.ts`:
- `demoGoogleCampaigns[]` — met ad groups, ads, keywords, dag-stats
- `demoKeywordSuggestions[]` — voor de planner
- Lokale mutaties via Zustand store `useGoogleAdsStore` (zodat pauzeer/budget-wijzigingen in de UI persistent voelen tijdens de sessie)

### Andere platforms

Geen wijziging aan Meta/TikTok/LinkedIn-views in Fase 1. Ze blijven read-only stats + creative-preview. Wel toevoegen: knop "Bewerk in [Platform] Ads Manager" → deeplink naar die externe omgeving.

---

## Fase 2 — Echte Google Ads API (na deze fase)

Volgorde van werk wanneer je groen licht geeft:

1. **Developer Token aanvragen** (jij doet dit bij Google, ik geef instructies)
2. **OAuth-flow** — Google login met `https://www.googleapis.com/auth/adwords` scope
3. **Secrets** opslaan via `add_secret`:
   - `GOOGLE_ADS_DEVELOPER_TOKEN`
   - `GOOGLE_OAUTH_CLIENT_ID` + `GOOGLE_OAUTH_CLIENT_SECRET`
4. **Tabellen** (Lovable Cloud):
   - `google_ads_connections` (user_id, refresh_token, customer_id) met RLS
5. **Server functions** (`src/lib/google-ads.functions.ts`):
   - `listCampaigns`, `pauseCampaign`, `updateBudget`, `updateAdText`, `createCampaign`, `getKeywordIdeas`, `getStats`
   - Allemaal achter `requireSupabaseAuth`
6. Demo-laag in UI vervangen door echte server-function calls (1-op-1 mapping qua types)

---

## Wat ik **nu** ga bouwen (alleen Fase 1)

Files:
- `src/lib/demo-ads.ts` — uitbreiden met Google-data
- `src/lib/google-ads-store.ts` — Zustand store voor lokale mutaties
- `src/routes/ads.google.tsx` — vervangt huidige generieke `ads.$platform.tsx` view voor Google (laatste blijft bestaan voor andere platforms)
- `src/routes/ads.google.new.tsx` — wizard
- `src/routes/ads.google.$campaignId.tsx` — detail
- `src/routes/ads.google.$campaignId.edit.tsx` — bewerken
- `src/components/ads/google/` — nieuwe folder met 6 componenten hierboven
- Update `src/components/app-shell.tsx` — submenu onder "Ads" met Google highlight

Geen schemawijzigingen, geen secrets, geen API-calls in deze fase — puur frontend + demo-data.

Akkoord? Dan bouw ik dit in één ronde.
