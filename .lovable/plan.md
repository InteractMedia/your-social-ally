## Doel
Een **Ads-sectie** in ZoetBezorgen waar je:
1. Stats van je eigen ads ziet (Meta, TikTok, LinkedIn, Google/YouTube)
2. Concurrent-ads volgt (welke staan live, hoe vaak nieuw, thema's/hooks)
3. Side-by-side jouw ads vs concurrent-ads vergelijkt
4. Aanmaken/bewerken gebeurt in Ads Manager van het platform (read-only blijft binnen API-limieten zonder lange App Review)

## Wat we wel/niet kunnen (eerlijk)

| Functie | Mogelijk? |
|---|---|
| Eigen ad-stats lezen (CTR, CPM, spend, ROAS, impressies) | Ja, alle 4 platforms via OAuth + read-scope |
| Eigen ads aanmaken/pauzeren in-app | Niet in v1 — vereist write-scope + App Review (1–3 wkn Meta, streng LinkedIn). Knop "Open in Ads Manager" volstaat |
| Concurrent live ads (creatives + tekst + looptijd + platforms) | Ja, **Meta Ad Library** (publiek, geen login) + **TikTok Creative Center** |
| Concurrent CTR/spend/ROAS | Nee — die data is privé. Alleen spend-range voor politiek/issue ads |
| LinkedIn Ad Library | Beperkt — alleen recent + EU verplichte transparantie |
| Google Ads Transparency Center | Ja, scrape-/API-light beschikbaar |

## Bouwplan in 3 fases

### Fase 1 — UI + demo-data (nu bouwen, geen API's nodig)
Volledige module met realistische mock-data zodat je flow en waarde kunt valideren.

**Nieuwe routes:**
- `/ads` — dashboard overzicht (alle platforms samen)
- `/ads/$platform` — per platform tab (meta/tiktok/linkedin/google)
- `/ads/$id` — ad-detail met stats + creative preview
- `/ads/compare` — side-by-side jouw ads vs concurrent

**Componenten:**
- `AdsOverviewCards` — totaal spend, gem. CTR, beste ad, ROAS per platform
- `AdsTable` — sorteerbaar (spend, CTR, CPM, conversies, looptijd)
- `AdCreativePreview` — toont image/video + copy + CTA, zoals composer-preview
- `CompetitorAdsFeed` — masonry-grid van concurrent creatives met "actief sinds X dagen" + frequentie-badge
- `AdComparePanel` — twee kolommen: jouw ad ↔ concurrent-ad, met AI-analyse (hook, tone, CTA, kleurpalet, format)
- `AdThemesCloud` — terugkerende thema's/hooks die concurrenten gebruiken (al deels in `competitors.$id.tsx`, hier uitbreiden naar ads-specifiek)

**Data-laag:** uitbreiden in `src/lib/demo-data.ts` met `demoAds[]` en `demoCompetitorAds[]` (incl. velden: platform, creative_url, copy, cta, status, started_at, impressions, ctr, spend, conversions, themes[]).

**App-shell:** "Ads" menu-item naast Concurrenten.

### Fase 2 — Concurrent-ads echt live (zonder OAuth, geen review nodig)
Server functions die publieke libraries scrapen/API'en:
- `getMetaAdLibraryAds(competitorPage)` → Meta Ad Library API (publiek, alleen Page-ID nodig)
- `getTikTokTopAds(keyword/brand)` → Creative Center
- `getGoogleAdsTransparency(advertiser)` → Transparency Center

Resultaten cachen in nieuwe tabel `competitor_ads` (RLS: alleen eigen rijen).

### Fase 3 — Eigen ad-stats via OAuth-connectors (later)
Per platform een connector koppelen:
- **Meta**: connector → `ads_read` scope → `/act_{id}/insights` endpoint
- **TikTok Ads**: Marketing API connector
- **LinkedIn Ads**: Marketing Developer Platform (toegang aanvragen, kan afgewezen worden — duidelijk communiceren)
- **Google Ads**: Google Ads API connector + developer token

Stats synchroniseren naar tabel `ad_stats` (dagelijks via cron). Alleen lezen, geen schrijven → snelste route naar productie.

Per ad een knop "Bewerk in [Platform] Ads Manager" die deeplinkt — gebruiker doet edits buiten de app.

## Technische details
- **Database** (Fase 2/3): `competitor_ads`, `ad_accounts`, `ads`, `ad_stats` — allemaal met RLS op `user_id` + GRANTs voor `authenticated`/`service_role`.
- **AI-analyse** (compare-panel): bestaande `ai.functions.ts` uitbreiden met `analyzeAdPair(myAd, theirAd)` → hook/tone/CTA/format-verschil. Lovable AI Gateway, geen extra key.
- **Caching**: concurrent-ads max 1× per dag refreshen per concurrent (rate-limits respecteren).
- **Feedback-loop**: bestaande `feedback-loop.ts` koppelen: ads met hoogste CTR → suggesties voor composer ("dit hook-format presteert").

## Wat ik nu ga bouwen (na akkoord)
**Alleen Fase 1**: complete UI + demo-data, zodat je de module kunt ervaren en feedback geven vóór we OAuth/API's aansluiten. Fase 2 en 3 doen we daarna in aparte rondes.

## Bestanden die wijzigen (Fase 1)
- `src/routes/ads.tsx` (layout)
- `src/routes/ads.index.tsx` (dashboard)
- `src/routes/ads.$platform.tsx`
- `src/routes/ads.$id.tsx`
- `src/routes/ads.compare.tsx`
- `src/components/ads/` (nieuwe folder: AdsOverviewCards, AdsTable, AdCreativePreview, CompetitorAdsFeed, AdComparePanel)
- `src/lib/demo-data.ts` (demo ads toevoegen)
- `src/components/app-shell.tsx` (menu-item)
- `src/routeTree.gen.ts` (auto-gen)

Akkoord op Fase 1? Dan zet ik 'm in elkaar.
