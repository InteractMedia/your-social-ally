# Meta (Facebook + Instagram) live koppeling

Nu App Review binnen is: van demo/handmatig naar echte Graph API-integratie voor publiceren, comments/DM's inlezen en insights.

## 1. Secrets (backend)
Via `add_secret` opslaan (jij vult in via secure form):
- `META_APP_ID`, `META_APP_SECRET`
- `META_PAGE_ID`, `META_PAGE_ACCESS_TOKEN` (long-lived)
- `META_IG_BUSINESS_ID`

## 2. Server-functies — `src/lib/meta.functions.ts`
Alle calls naar `graph.facebook.com/v21.0`, token uit `process.env`.

- `getMetaStatus()` — check token geldigheid + page/IG info (naam, avatar, followers). Voedt Settings.
- `publishFacebookPost({ text, mediaPaths[] })` — 0/1 image = `/{page}/photos` of `/{page}/feed`; meerdere = unpublished photos → `/{page}/feed` met `attached_media`.
- `publishInstagramPost({ caption, mediaPaths[] })` — single: `/{ig}/media` (image_url) → `/{ig}/media_publish`; carousel: children containers → carousel container → publish. Media wordt eerst uit Supabase `post-media` bucket via signed URL beschikbaar gemaakt (Graph vereist publieke URL — we gebruiken korte-TTL signed URLs).
- `listMetaComments({ platform, since })` — FB: `/{page}/feed?fields=comments{...}`; IG: `/{ig}/media?fields=comments{...}`. Normaliseert naar het bestaande `InboxItem`-shape.
- `replyMetaComment({ platform, commentId, message })`.
- `getMetaInsights({ platform, range })` — page/IG insights (reach, impressions, engagement, follower_count).

Alles met `.middleware([requireSupabaseAuth])` + nette error-surfacing (Graph errors doorgeven).

## 3. UI-integratie

**Settings (`/settings`)** — vervang de Meta "Wizard starten"-knoppen door live `MetaRow` (net als `LinkedInRow`): live status via `getMetaStatus`, badge "Live" + page/IG naam en avatar. Wizard-route (`/meta`) blijft bereikbaar als "Herconfigureren".

**Composer (`/composer`)**
- Nieuwe knoppen "Post naar Facebook" en "Post naar Instagram" (analoog aan LinkedIn), zichtbaar wanneer platform geselecteerd is.
- IG validatie: minimaal 1 image verplicht (Graph vereist).
- `ManualMetaPanel` verwijderen uit Composer (jouw keuze: vervangen door echte publish).

**Inbox (`/inbox`)**
- `useQuery` naar `listMetaComments` per platform; mergen met bestaande demo-items achter een toggle "Alleen live" (default aan zodra Meta connected).
- "Verstuur antwoord" roept nu `replyMetaComment` aan voor FB/IG items; LinkedIn/TikTok/YT blijven demo tot hun eigen koppeling.

**Nieuwe route `/insights` (of tab in dashboard)**
- KPI-kaarten per platform (FB Page + IG Business) met reach/impressions/engagement/followers via `getMetaInsights`, filter last 7/28/90 dagen.

## 4. Publiceren-flow met media
- Composer stuurt `mediaPaths` (Supabase storage paths) mee.
- Server-fn genereert signed URL (10 min TTL) → geeft door aan Graph API.
- Na publish: `recordPostResult` net als bij LinkedIn.

## 5. Cleanup
- `src/components/composer/ManualMetaPanel.tsx` verwijderen + import uit `composer.tsx`.
- `demo-data.ts` inboxItems markeren als fallback (alleen tonen als geen live data).

## Volgorde van uitvoeren
1. Secrets opvragen (add_secret).
2. `meta.functions.ts` bouwen + Settings `MetaRow`.
3. Composer publish-knoppen + ManualMetaPanel weghalen.
4. Inbox live comments + reply.
5. Insights route.

## Buiten scope (volgende ronde als je wilt)
- Scheduling naar Meta (nu direct-publish).
- Stories/Reels publiceren (andere endpoints, extra review vaak nodig).
- DM's via Messenger Platform (aparte webhook setup).
