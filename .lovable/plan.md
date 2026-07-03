# Plan — Legitieme groei-stack (3 features)

Alle drie de features, frontend-first met demo-data + al bestaande Lovable AI Gateway voor de AI-onderdelen. **Geen** fake-engagement, alles binnen ToS van Meta/LinkedIn/TikTok/YouTube.

## Feature 1 — Beste posttijd + auto-schedule

**Pagina:** `/schedule` (nieuwe route) + widget op dashboard-home.

Wat het doet:
- **Heatmap** (7 dagen × 24 uur) per platform met engagement-index — kleur intensiteit toont wanneer jouw audience actief is
- **"Top 3 slots deze week"** kaartjes met concrete tijden (bv. "di 19:30", "do 20:15", "za 11:00")
- **Auto-schedule queue**: elke geplande post krijgt suggestie "publiceer op eerstvolgende piekslot" — met 1 klik overnemen
- **Publicatie-timeline** (komende 14 dagen) met alle geplande posts, drag-to-reschedule

Data:
- Fase 1: `demoAudienceActivity` (7×24 grid per platform) in `src/lib/demo-schedule.ts`
- Fase 2 (later): berekend uit echte post-history via platform-APIs

## Feature 2 — AI auto-reply op comments/DM's

**Pagina:** Uitbreiding van bestaande `/inbox`.

Wat het doet:
- Elke comment/DM krijgt knop **"Genereer 3 antwoorden"**
- AI (via bestaande `generateAI` server-fn, nieuwe action `reply_suggestion` — bestaat al!) levert 3 varianten: warm / zakelijk / speels
- **"Snel goedkeuren"-modus**: knop "post variant 1" doet direct optimistisch UI-update (demo)
- **Auto-flag** priority-comments: vraag, klacht, high-follower account, verkoopintentie — kleurbadge
- **Reactietijd-teller** ("mediaan: 42 min — algoritme boost onder 1 uur")
- **Bulk-modus**: verwerk 10 comments achter elkaar met keyboard shortcuts (1/2/3 = variant, S = skip)

Techniek:
- `generateAI` action `reply_suggestion` bestaat al in `src/lib/ai.functions.ts` — hergebruiken
- Priority-classificatie: nieuwe action `classify_comment` toevoegen (LLM returned JSON met `{priority, intent, sentiment}`)
- Optimistic state via bestaande demo-inbox store

## Feature 3 — Hook A/B generator + hashtag-optimizer

**Pagina:** Uitbreiding van bestaande `/composer`.

Wat het doet:
- **Hook A/B/C paneel** boven caption-input: knop "Genereer 3 hooks" → toont 3 openingsregels in verschillende stijlen (vraag / statement / cijfer-hook)
- Elke hook toont **voorspelde performance-score** op basis van je learnings (bv. "vraag-hook: historisch +38% engagement")
- Klik = vervangt eerste regel van caption
- **Hashtag-optimizer** paneel: knop "Suggereer hashtags" → 12 hashtags in 3 tiers:
  - 🔥 High-volume (>100k posts) — 3
  - 📈 Mid-tier (10k-100k) — 5
  - 🎯 Niche (<10k, hoge conversie) — 4
- Elke hashtag toont mock reach/competition
- **"Optimize this post"** master-knop: draait hook-gen + hashtag-gen + tone-check in één flow

Techniek:
- Nieuwe `generateAI` actions: `hooks_ab` (returns JSON array of 3 hooks + reasoning), `hashtag_tiers` (returns JSON met 3 tiers)
- Score-berekening leunt op bestaande `computeLearnings()` in `src/lib/feedback-loop.ts`
- UI: `<HookGeneratorPanel />` + `<HashtagOptimizerPanel />` in `src/components/composer/`

## Nieuwe/gewijzigde files

**Feature 1:**
- `src/lib/demo-schedule.ts` (audience-activity data)
- `src/routes/schedule.tsx`
- `src/components/schedule/ActivityHeatmap.tsx`, `TopSlotsCards.tsx`, `PublicationTimeline.tsx`
- `src/components/app-shell.tsx` — sidebar-item toevoegen

**Feature 2:**
- `src/lib/ai.functions.ts` — nieuwe action `classify_comment`
- `src/routes/inbox.tsx` — uitbreiden met AI-reply knoppen, priority-badges, bulk-modus
- `src/components/inbox/ReplyGenerator.tsx`, `PriorityBadge.tsx`, `BulkReviewBar.tsx`

**Feature 3:**
- `src/lib/ai.functions.ts` — nieuwe actions `hooks_ab`, `hashtag_tiers`
- `src/components/composer/HookGeneratorPanel.tsx`, `HashtagOptimizerPanel.tsx`
- `src/routes/composer.tsx` — panelen inpluggen

## Buiten scope (Fase 2)

- Echte publicatie naar Meta/LI/TikTok/YT (vereist Meta Graph API + LinkedIn Marketing API + TikTok Content Posting API — per platform apart approval traject, 2-6 weken)
- Echte comment-inbox-sync (vereist webhook-integraties)
- Persistente storage van scheduled posts (later Lovable Cloud tabel `scheduled_posts`)

## Volgorde

1. **Feature 3** (composer-panelen) — hergebruikt meeste bestaande code, snelste win
2. **Feature 2** (auto-reply) — één nieuwe AI-action + inbox-UI-uitbreiding
3. **Feature 1** (schedule) — meeste nieuwe UI (heatmap + timeline)

Geen secrets, geen nieuwe DB-tabellen, geen platform-API-integraties in deze fase.
