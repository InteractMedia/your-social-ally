/**
 * Visuele POC — ZoetBezorgen Conversion Design System.
 *
 * Drie componentfamilies × twee premium varianten, uitsluitend om het
 * grafische/designniveau te beoordelen. Content is hergebruikt uit de
 * bestaande Bouw-draft; beelden zijn approved assets uit de Beeldbank
 * (product-cutouts) plus twee POC-sfeerbeelden. Geen Claude, geen
 * strategist-run, geen database — puur presentatie.
 */
import { ArrowRight, Check, HardHat, Quote, Sparkles } from "lucide-react";

import teamHero from "@/assets/poc/bouw-team-hero.jpg";
import closeup from "@/assets/poc/bouw-moment-closeup.jpg";
import { cn } from "@/lib/utils";

/* Approved Beeldbank-assets (product-cutouts, publieke asset-API) */
const ASSET = {
  puntzak: "/api/public/landing-asset/e09dbc67-ff16-4797-ada1-dc273e9e2b0e",
  puntzakPers: "/api/public/landing-asset/d0b08c60-bb6e-460d-847d-8c320b036d62",
  bonbons: "/api/public/landing-asset/72fe787f-a6c1-4a28-b3a6-80aa376abc8f",
  snoeppot: "/api/public/landing-asset/a747fbd7-b060-478e-bf2d-222fb44c50bd",
};

/* ------------------------------------------------------------- primitives */

function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-zb-ink text-zb-cream inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide uppercase",
        className,
      )}
    >
      {children}
    </span>
  );
}

function CtaSolid({ children }: { children: React.ReactNode }) {
  return (
    <a
      href="#poc-cta"
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold shadow-lg transition-colors"
    >
      {children}
      <ArrowRight className="h-4 w-4" />
    </a>
  );
}

function CtaGhost({ dark, children }: { dark?: boolean; children: React.ReactNode }) {
  return (
    <a
      href="#poc-cta"
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-full border px-7 text-sm font-semibold transition-colors",
        dark
          ? "border-white/60 text-white hover:bg-white/10"
          : "border-zb-ink/30 text-zb-ink hover:bg-zb-ink/5",
      )}
    >
      {children}
    </a>
  );
}

/** Speelse snoep-dots als decoratieve merklaag. */
function CandyDots() {
  return (
    <>
      <span className="zb-dot bg-primary/70 h-4 w-4" style={{ top: "8%", left: "4%" }} />
      <span className="zb-dot bg-secondary h-3 w-3" style={{ top: "16%", right: "8%" }} />
      <span className="zb-dot bg-zb-teal/60 h-2.5 w-2.5" style={{ bottom: "12%", left: "10%" }} />
      <span className="zb-dot bg-zb-honey h-5 w-5" style={{ bottom: "6%", right: "14%" }} />
    </>
  );
}

/* ============================================================ CANDYHERO */

/**
 * CandyHero — variant A "Collage".
 * Warm cream canvas, display-serif headline, boogvormige (arch) foto,
 * product-cutout die over het fotokader breekt, candy-dots en een
 * hazard-stripe als Bouw-motief.
 */
export function CandyHeroCollage() {
  return (
    <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
      <CandyDots />
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-28">
        <div>
          <Pill>
            <HardHat className="h-3.5 w-3.5" /> Zakelijke geschenken voor de bouw
          </Pill>
          <h1 className="font-display mt-6 text-5xl leading-[1.02] font-semibold tracking-tight text-balance md:text-7xl">
            Wie wil jij <em className="text-primary not-italic">zoet</em> bezorgen?
          </h1>
          <p className="text-zb-ink/70 mt-6 max-w-md text-lg leading-relaxed">
            Persoonlijke snoep- en chocoladegeschenken voor je team, onderaannemers of
            opdrachtgevers. Levering op elke locatie, offerte binnen één werkdag.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaSolid>Offerte aanvragen</CtaSolid>
            <CtaGhost>Bekijk voorbeelden</CtaGhost>
          </div>
          <p className="text-zb-ink/55 mt-3 text-xs font-medium">
            100% vrijblijvend · reactie binnen 1 werkdag
          </p>
          <div className="mt-7 flex items-center gap-3">
            <span className="zb-hazard h-2.5 w-24 rounded-full" />
            <span className="text-zb-ink/60 text-xs font-semibold tracking-wide uppercase">
              Vanaf 25 stuks · met eigen logo
            </span>
          </div>
        </div>

        <div className="relative">
          {/* Boogvormig fotokader */}
          <div className="border-zb-ink/10 overflow-hidden rounded-t-[999px] rounded-b-3xl border-4 shadow-2xl">
            <img
              src={teamHero}
              alt="Bouwteam overhandigt een zoet geschenk op de bouwplaats"
              width={1600}
              height={1067}
              loading="eager"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          {/* Productbeeld breekt als polaroid over het kader */}
          <img
            src={ASSET.puntzakPers}
            alt='Puntzak snoepmix "Teamwork" met eigen logo'
            loading="eager"
            className="absolute -bottom-8 -left-6 w-36 -rotate-6 rounded-2xl border-4 border-white object-cover shadow-2xl md:-left-12 md:w-52"
          />
          {/* Zwevend label */}
          <span className="bg-card text-zb-ink absolute top-10 -right-3 rotate-3 rounded-full px-4 py-2 text-xs font-bold shadow-xl md:-right-6">
            Met jullie logo & kaartje
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * CandyHero — variant B "Full-bleed editorial".
 * Sfeerfotografie over de volle breedte met warm bruin verloop, witte
 * display-typografie en een product-cutout die over de sectiegrens breekt.
 */
export function CandyHeroEditorial() {
  return (
    <section className="relative overflow-visible text-white">
      <div className="relative overflow-hidden">
        <img
          src={teamHero}
          alt="Bouwteam viert een moment met een zoet geschenk"
          width={1600}
          height={1067}
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="from-zb-ink/85 via-zb-ink/45 absolute inset-0 bg-gradient-to-r to-transparent" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-24 md:px-8 md:py-40">
          <div className="max-w-xl">
            <Pill className="bg-white/15 text-white backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Voor de bouw · vanaf 25 stuks
            </Pill>
            <h1 className="font-display mt-6 text-5xl leading-[1.02] font-semibold tracking-tight text-balance drop-shadow-lg md:text-7xl">
              Waardering die <em className="text-zb-honey not-italic">aankomt</em> op de bouwplaats
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-white/85">
              Een klein, persoonlijk geschenk laat zien dat je ziet wat je team elke dag
              neerzet. Wij denken mee over moment, budget en boodschap.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <CtaSolid>Offerte aanvragen</CtaSolid>
              <CtaGhost dark>Hoe het werkt</CtaGhost>
            </div>
          </div>
        </div>
      </div>
      {/* Productbeeld als polaroid, deels over de sectiegrens */}
      <img
        src={ASSET.puntzak}
        alt='Puntzak snoepmix "Teamwork"'
        loading="eager"
        className="absolute right-6 -bottom-8 z-10 w-32 rotate-6 rounded-2xl border-4 border-white object-cover shadow-2xl md:right-24 md:-bottom-10 md:w-52"
      />
    </section>
  );
}

/* ========================================================= INDUSTRYSTORY */

/**
 * IndustryStory — variant A "Editorial split".
 * Magazine-achtige split: boogfoto links, oversized quote in display-serif
 * rechts, hazard-stripe als scheiding en Bouw-pill.
 */
export function IndustryStorySplit() {
  return (
    <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:px-8 md:py-28">
        <div className="relative">
          <div className="overflow-hidden rounded-t-[999px] rounded-b-3xl shadow-2xl">
            <img
              src={closeup}
              alt="Handen wisselen een persoonlijk snoepgeschenk uit op de bouwplaats"
              width={1400}
              height={1050}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <span className="zb-hazard absolute -bottom-5 left-8 h-3 w-40 rotate-[-2deg] rounded-full shadow-md" />
        </div>
        <div>
          <Pill className="bg-zb-teal text-white">
            <HardHat className="h-3.5 w-3.5" /> De bouw
          </Pill>
          <blockquote className="font-display mt-6 text-3xl leading-snug font-semibold tracking-tight text-balance md:text-5xl">
            <Quote className="text-primary mb-3 h-8 w-8" />
            In de bouw draait alles om mensen die dag in dag uit doorgaan.
          </blockquote>
          <p className="text-zb-ink/70 mt-6 max-w-md text-lg leading-relaxed">
            Een klein, persoonlijk geschenk laat zien dat je dat ziet. Wij denken mee over
            moment, budget en boodschap — en zorgen dat het er verzorgd uitziet én lekker is.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Projectoplevering", "Veiligheidsprestatie", "Kerstgeschenk", "Jubileum"].map(
              (m) => (
                <span
                  key={m}
                  className="border-zb-ink/20 text-zb-ink/80 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
                >
                  {m}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * IndustryStory — variant B "Staggered moments".
 * Statement-headline met twee versprongen, geroteerde foto's die elkaar
 * overlappen; moment-labels zweven over de beelden. Geen cards.
 */
export function IndustryStoryMoments() {
  return (
    <section className="bg-zb-blush text-zb-ink relative overflow-hidden">
      <CandyDots />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8 md:py-28">
        <div className="max-w-3xl">
          <Pill>
            <HardHat className="h-3.5 w-3.5" /> Momenten in de bouw
          </Pill>
          <h2 className="font-display mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            Van projectoplevering tot kerst — <em className="text-primary not-italic">elk moment</em> verdient iets zoets
          </h2>
        </div>

        <div className="relative mt-14 grid gap-10 md:grid-cols-12 md:gap-0">
          <div className="relative md:col-span-7">
            <img
              src={teamHero}
              alt="Bouwteam lacht samen met een zoet geschenk"
              width={1600}
              height={1067}
              loading="lazy"
              className="w-full -rotate-1 rounded-3xl border-4 border-white object-cover shadow-2xl"
            />
            <span className="bg-primary text-primary-foreground absolute -top-4 left-6 -rotate-3 rounded-full px-4 py-2 text-xs font-bold shadow-lg">
              Team bedanken
            </span>
          </div>
          <div className="relative md:col-span-5 md:-ml-16 md:mt-24">
            <img
              src={closeup}
              alt="Persoonlijk geschenk met kaartje wordt overhandigd"
              width={1400}
              height={1050}
              loading="lazy"
              className="w-full rotate-2 rounded-3xl border-4 border-white object-cover shadow-2xl"
            />
            <span className="bg-zb-teal absolute -bottom-4 right-6 rotate-2 rounded-full px-4 py-2 text-xs font-bold text-white shadow-lg">
              Relatie bedanken
            </span>
          </div>
        </div>

        <p className="text-zb-ink/70 mt-12 max-w-xl text-lg leading-relaxed">
          Een zoete afsluiting op de bouwplaats, een veiligheidsmijlpaal zonder incidenten of
          een kerstgeschenk dat persoonlijk én praktisch is — ook rechtstreeks naar
          huisadressen.
        </p>
      </div>
    </section>
  );
}

/* ======================================================== PRODUCTSHOWCASE */

/**
 * ProductShowcase — variant A "featured_product".
 * Één heldproduct oversized op een warme blush-band; geen card, maar een
 * editorial presentatie met personalisatie-badge en USP-lijst.
 */
export function ShowcaseFeatured() {
  return (
    <section className="bg-zb-blush text-zb-ink relative overflow-hidden">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-[0.9fr_1.1fr] md:px-8 md:py-24">
        <div className="relative order-2 md:order-1">
          {/* Zachte radiale blob als podium */}
          <div className="bg-primary/15 absolute inset-0 -z-0 scale-110 rounded-full blur-3xl" />
          <img
            src={ASSET.puntzakPers}
            alt='Puntzak snoepmix "Teamwork" met gepersonaliseerd label'
            loading="lazy"
            className="relative mx-auto w-64 -rotate-3 drop-shadow-2xl md:w-96"
          />
          <span className="bg-zb-ink text-zb-cream absolute top-4 right-4 rotate-3 rounded-full px-4 py-2 text-xs font-bold shadow-xl">
            Met eigen logo & kaartje
          </span>
        </div>
        <div className="order-1 md:order-2">
          <Pill className="bg-primary text-primary-foreground">Featured · meest gekozen in de bouw</Pill>
          <h2 className="font-display mt-6 text-4xl leading-tight font-semibold tracking-tight text-balance md:text-6xl">
            Puntzak snoepmix <em className="text-zb-teal not-italic">"Teamwork"</em>
          </h2>
          <p className="text-zb-ink/70 mt-5 max-w-md text-lg leading-relaxed">
            De klassieke puntzak, volledig in jullie huisstijl. Klein genoeg voor iedere
            pauze, persoonlijk genoeg om te blijven hangen.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              "Vanaf 25 stuks — ook voor één team of project",
              "Volledig gepersonaliseerd in jullie huisstijl",
              "Levering op de bouwplaats of thuis bij medewerkers",
            ].map((u) => (
              <li key={u} className="flex items-start gap-3 text-base font-medium">
                <span className="bg-zb-teal/15 text-zb-teal mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {u}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaSolid>Vraag offerte aan</CtaSolid>
            <CtaGhost>Bekijk alle geschenken</CtaGhost>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * ProductShowcase — variant B "product_trio overlapping".
 * Drie producten overlappen elkaar met rotatie op een cream canvas met
 * zachte blob; pill-labels in plaats van cards.
 */
export function ShowcaseTrio() {
  const products = [
    { src: ASSET.puntzak, name: 'Puntzak "Teamwork"', tag: "Vanaf 25 stuks", rot: "-rotate-6", z: "z-10" },
    { src: ASSET.bonbons, name: "Luxe bonbons", tag: "Speciaal voor jou", rot: "rotate-2", z: "z-20" },
    { src: ASSET.snoeppot, name: "Snoeppot weck", tag: "Gefeliciteerd Pot", rot: "rotate-6", z: "z-10" },
  ];
  return (
    <section className="bg-zb-cream text-zb-ink relative overflow-hidden">
      <CandyDots />
      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 text-center md:px-8 md:py-28">
        <Pill className="bg-zb-teal text-white">Onze favorieten voor de bouw</Pill>
        <h2 className="font-display mx-auto mt-6 max-w-2xl text-4xl leading-tight font-semibold tracking-tight text-balance md:text-6xl">
          Drie manieren om <em className="text-primary not-italic">zoet</em> te bezorgen
        </h2>

        <div className="relative mx-auto mt-16 flex max-w-4xl items-end justify-center">
          <div className="bg-secondary/25 absolute inset-x-10 bottom-0 -z-0 h-56 rounded-full blur-3xl" />
          {products.map((p, i) => (
            <figure key={p.name} className={cn("relative", p.z, i > 0 && "-ml-6 md:-ml-10")}>
              <img
                src={p.src}
                alt={p.name}
                loading="lazy"
                className={cn(
                  "aspect-[3/4] w-32 rounded-2xl border-4 border-white object-cover shadow-2xl transition-transform hover:scale-105 sm:w-44 md:w-56",
                  p.rot,
                  i === 1 && "md:-mb-6 md:w-64",
                )}
              />
              <figcaption className="relative z-30 mt-4">
                <span className="bg-card text-zb-ink inline-block rounded-full px-4 py-1.5 text-xs font-bold shadow-md">
                  {p.name}
                </span>
                <span className="text-zb-ink/60 mt-1.5 block text-xs font-medium">{p.tag}</span>
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-3">
          <CtaSolid>Stel je geschenk samen</CtaSolid>
          <CtaGhost>Offerte binnen 1 werkdag</CtaGhost>
        </div>
      </div>
    </section>
  );
}

/* ========================================================== PROOFSTRIP */

/**
 * ProofStrip — compacte social-proof-band.
 * Editorial "logo's" in display-serif (tekstueel, geen gefabuleerde
 * klantnamen: sectorlabels als placeholder tot echte klantlogo's
 * beschikbaar zijn), gecombineerd met harde bewijspunten.
 */
export function ProofStrip() {
  return (
    <section className="border-zb-ink/10 bg-zb-cream border-y py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-5 md:flex-row md:justify-between md:px-8">
        <p className="text-zb-ink/50 text-xs font-semibold tracking-widest uppercase">
          Vertrouwd door teams in
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {["Aannemers", "Installatiebedrijven", "Bouwondernemingen", "Projectontwikkelaars"].map(
            (label) => (
              <span
                key={label}
                className="font-display text-zb-ink/35 text-lg font-semibold tracking-tight whitespace-nowrap md:text-xl"
              >
                {label}
              </span>
            ),
          )}
        </div>
        <div className="text-zb-ink/60 flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
          <span className="bg-zb-teal inline-block h-2 w-2 rounded-full" />
          Persoonlijk gegeven, verzorgd bezorgd
        </div>
      </div>
    </section>
  );
}

/* ========================================================== PREMIUMFORM */

/**
 * PremiumForm — offertefunnel-sectie met minimale frictie.
 * Donker inktvlak, editorial benefits-lijst links, compact formulier
 * rechts in een zwevend paneel. Risk-reversal microcopy direct onder de
 * submit: geen verplichtingen, reactie binnen 1 werkdag.
 */
export function PremiumFormSection() {
  return (
    <section id="poc-cta" className="bg-zb-ink text-zb-cream relative overflow-hidden">
      <div className="zb-hazard absolute inset-x-0 top-0 h-3" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-28">
        <div>
          <Pill className="bg-zb-honey text-zb-ink">
            <Sparkles className="h-3.5 w-3.5" /> Gratis offerte
          </Pill>
          <h2 className="font-display mt-6 text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            Jouw offerte binnen <em className="text-zb-honey not-italic">één werkdag</em>
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-white/75">
            Vertel kort wie je wilt verrassen en met hoeveel — wij sturen een voorstel op
            maat, inclusief personalisatie met jullie logo.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              "Geen verplichtingen — je ontvangt alleen een voorstel",
              "Inclusief ontwerpvoorbeeld met jullie logo",
              "Levering op de bouwplaats of bij medewerkers thuis",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 text-base font-medium text-white/85">
                <span className="bg-zb-teal/25 text-zb-honey mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>

        <form
          className="bg-card text-zb-ink rounded-3xl p-7 shadow-2xl md:-mt-6 md:p-9"
          onSubmit={(e) => e.preventDefault()}
        >
          <h3 className="font-display text-2xl font-semibold tracking-tight">
            Vraag je offerte aan
          </h3>
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-zb-ink/70 text-xs font-semibold tracking-wide uppercase">
                Bedrijfsnaam
              </span>
              <input
                type="text"
                placeholder="Bijv. Van Dijk Bouw BV"
                className="border-zb-ink/15 focus:border-primary mt-1.5 h-12 w-full rounded-xl border bg-transparent px-4 text-sm outline-none transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-zb-ink/70 text-xs font-semibold tracking-wide uppercase">
                E-mailadres
              </span>
              <input
                type="email"
                placeholder="jij@bedrijf.nl"
                className="border-zb-ink/15 focus:border-primary mt-1.5 h-12 w-full rounded-xl border bg-transparent px-4 text-sm outline-none transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-zb-ink/70 text-xs font-semibold tracking-wide uppercase">
                Aantal geschenken
              </span>
              <select
                className="border-zb-ink/15 focus:border-primary mt-1.5 h-12 w-full rounded-xl border bg-transparent px-4 text-sm outline-none transition-colors"
                defaultValue="25–50"
              >
                <option>25–50</option>
                <option>50–150</option>
                <option>150–500</option>
                <option>500+</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold shadow-lg transition-colors"
          >
            Stuur mijn offerte <ArrowRight className="h-4 w-4" />
          </button>
          {/* Risk-reversal microcopy — direct onder de CTA */}
          <p className="text-zb-ink/55 mt-4 text-center text-xs leading-relaxed">
            100% vrijblijvend · reactie binnen 1 werkdag · je gegevens worden niet gedeeld
          </p>
        </form>
      </div>
    </section>
  );
}
