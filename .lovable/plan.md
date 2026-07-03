# Neon Studio — Full App Restyling

Ik pas stijl B (Neon Studio) toe op de hele app-layout via de design tokens in `src/styles.css`, zodat elk scherm (Dashboard, Ads, Google Ads Stats, etc.) direct meegaat zonder per-component herwerk.

## Visuele richting

- **Achtergrond:** diep warm zwart `#0f0f0f`, met subtiele donkere surface `#181818` voor cards.
- **Accenten:** neon pink `#ff2d55` (primary) en electric cyan `#00f5d4` (secondary/accent).
- **Tekst:** off-white `#f5f5f7` voor headings, muted `#a1a1aa` voor secundair.
- **Borders:** semi-transparant wit `rgba(255,255,255,0.08)`, bij hover neon glow.
- **Shadows/Glow:** `0 0 24px rgba(255,45,85,0.35)` op primary buttons en KPI-highlights.
- **Typography:** iets condensed / bold voor grote KPI-getallen (via bestaande font-stack, `font-black tracking-tight`).
- **Gradients:** `linear-gradient(135deg, #ff2d55, #00f5d4)` als accent op hero-elementen, KPI-toppers en active states.

## Wijzigingen

1. **`src/styles.css`** — herdefinieer alle semantic tokens (background, foreground, card, primary, secondary, accent, muted, border, ring) naar de neon-donkerpalet in `oklch`, inclusief nieuwe tokens:
   - `--gradient-neon`, `--shadow-glow-pink`, `--shadow-glow-cyan`.
   - Forceer dark als default (root krijgt de dark waarden).
2. **`src/routes/__root.tsx`** — zet `<body>` op `bg-background text-foreground` en voeg een subtiele radial gradient overlay toe (pink/cyan glow blobs, low opacity) achter de content.
3. **Sidebar/Nav (indien aanwezig in layout)** — actieve items krijgen neon-pink underline/glow; icons in cyan bij hover.
4. **Cards & KPI blocks (globale klassen, niet per-component)** — via tokens al gedekt; check dat `Card`/`Button` variants het nieuwe primary + glow shadow overnemen.
5. **Charts (Google Ads Stats)** — recharts kleuren omschakelen naar `hsl(var(--primary))` en `hsl(var(--accent))` via bestaande wrapper, zonder logica te wijzigen.

## Buiten scope

- Geen wijziging aan data, routes, forms of business logic.
- Geen nieuwe pagina's of componenten — puur visual/token layer.

Na akkoord bouw ik dit in één batch, dan zie je de hele app in Neon Studio-stijl in de preview.
