import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Facebook,
  Instagram,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meta")({
  head: () => ({
    meta: [{ title: "Meta koppeling — ZoetBezorgen Social" }],
  }),
  component: MetaWizard,
});

type StepId = "intro" | "prereqs" | "app" | "permissions" | "credentials" | "review" | "done";

type Progress = {
  prereqs: {
    businessManager: boolean;
    facebookPage: boolean;
    instagramBusiness: boolean;
    igLinkedToPage: boolean;
  };
  permissions: string[];
  credentials: {
    appId: string;
    pageId: string;
    igBusinessId: string;
    hasSecret: boolean;
    hasToken: boolean;
  };
  currentStep: StepId;
  submittedAt?: string;
};

const STORAGE_KEY = "meta-wizard-progress";

const DEFAULT_PROGRESS: Progress = {
  prereqs: {
    businessManager: false,
    facebookPage: false,
    instagramBusiness: false,
    igLinkedToPage: false,
  },
  permissions: [],
  credentials: {
    appId: "",
    pageId: "",
    igBusinessId: "",
    hasSecret: false,
    hasToken: false,
  },
  currentStep: "intro",
};

const STEPS: { id: StepId; label: string }[] = [
  { id: "intro", label: "Start" },
  { id: "prereqs", label: "Vereisten" },
  { id: "app", label: "Meta App" },
  { id: "permissions", label: "Permissies" },
  { id: "credentials", label: "Gegevens" },
  { id: "review", label: "Review" },
  { id: "done", label: "Klaar" },
];

const PERMISSIONS = [
  {
    id: "pages_show_list",
    label: "pages_show_list",
    desc: "Lijst van FB-pages waar je admin bent",
    tier: "basic",
  },
  {
    id: "pages_read_engagement",
    label: "pages_read_engagement",
    desc: "Post-analytics + comments lezen (FB)",
    tier: "review",
  },
  {
    id: "pages_manage_posts",
    label: "pages_manage_posts",
    desc: "Publiceren op de FB-page",
    tier: "review",
  },
  {
    id: "pages_manage_engagement",
    label: "pages_manage_engagement",
    desc: "Reageren op comments/DMs (Inbox)",
    tier: "review",
  },
  {
    id: "instagram_basic",
    label: "instagram_basic",
    desc: "IG business-profiel + basic media",
    tier: "review",
  },
  {
    id: "instagram_content_publish",
    label: "instagram_content_publish",
    desc: "Publiceren op Instagram",
    tier: "review",
  },
  {
    id: "instagram_manage_insights",
    label: "instagram_manage_insights",
    desc: "IG post & account analytics",
    tier: "review",
  },
  {
    id: "instagram_manage_comments",
    label: "instagram_manage_comments",
    desc: "IG comments beheren (Inbox)",
    tier: "review",
  },
] as const;

function loadProgress(): Progress {
  if (typeof window === "undefined") return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function MetaWizard() {
  const [p, setP] = useState<Progress>(DEFAULT_PROGRESS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setP(loadProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  }, [p, hydrated]);

  const stepIdx = STEPS.findIndex((s) => s.id === p.currentStep);
  const go = (id: StepId) => setP((s) => ({ ...s, currentStep: id }));
  const next = () => go(STEPS[Math.min(stepIdx + 1, STEPS.length - 1)].id);
  const prev = () => go(STEPS[Math.max(stepIdx - 1, 0)].id);

  const prereqsDone = Object.values(p.prereqs).every(Boolean);
  const credsDone =
    p.credentials.appId.trim().length > 0 &&
    p.credentials.pageId.trim().length > 0 &&
    p.credentials.hasSecret &&
    p.credentials.hasToken;

  const canProceed: Record<StepId, boolean> = {
    intro: true,
    prereqs: prereqsDone,
    app: !!p.credentials.appId.trim(),
    permissions: p.permissions.length > 0,
    credentials: credsDone,
    review: true,
    done: true,
  };

  return (
    <AppShell>
      <PageHeader
        title="Meta koppeling"
        subtitle="Stap voor stap Facebook & Instagram autoriseren voor publiceren en analytics."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Terug naar Instellingen
            </Link>
          </Button>
        }
      />

      {/* Stepper */}
      <ol className="mb-6 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => {
          const active = s.id === p.currentStep;
          const done = i < stepIdx;
          return (
            <li key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => go(s.id)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                  active && "border-primary bg-primary/10 text-primary",
                  done && !active && "border-success/40 bg-success/10 text-success",
                  !active && !done && "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-current text-[10px] text-background">
                    {i + 1}
                  </span>
                )}
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="text-muted-foreground">›</span>}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {p.currentStep === "intro" && <IntroStep />}
          {p.currentStep === "prereqs" && (
            <PrereqStep value={p.prereqs} onChange={(prereqs) => setP((s) => ({ ...s, prereqs }))} />
          )}
          {p.currentStep === "app" && (
            <AppStep
              appId={p.credentials.appId}
              onChange={(appId) =>
                setP((s) => ({ ...s, credentials: { ...s.credentials, appId } }))
              }
            />
          )}
          {p.currentStep === "permissions" && (
            <PermissionsStep
              value={p.permissions}
              onChange={(permissions) => setP((s) => ({ ...s, permissions }))}
            />
          )}
          {p.currentStep === "credentials" && (
            <CredentialsStep
              value={p.credentials}
              onChange={(credentials) => setP((s) => ({ ...s, credentials }))}
            />
          )}
          {p.currentStep === "review" && (
            <ReviewStep
              progress={p}
              onSubmit={() => {
                setP((s) => ({ ...s, submittedAt: new Date().toISOString(), currentStep: "done" }));
              }}
            />
          )}
          {p.currentStep === "done" && <DoneStep progress={p} onRestart={() => setP(DEFAULT_PROGRESS)} />}

          {p.currentStep !== "done" && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={prev} disabled={stepIdx === 0}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Vorige
              </Button>
              <Button onClick={next} disabled={!canProceed[p.currentStep]}>
                {p.currentStep === "review" ? "Indienen" : "Volgende"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <StatusCard progress={p} />
          <HelpCard />
        </aside>
      </div>
    </AppShell>
  );
}

/* ============ Steps ============ */

function IntroStep() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> Welkom in de Meta-koppelingswizard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>
          Deze wizard leidt je door de complete Meta setup voor <strong>Facebook Pages</strong> en{" "}
          <strong>Instagram Business</strong>. Aan het eind kun je posts publiceren en analytics uitlezen vanuit ZoetBezorgen Social.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Facebook className="h-4 w-4" style={{ color: "hsl(var(--platform-facebook))" }} />
              Facebook Page
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Publiceren, comments beheren, page insights.
            </p>
          </div>
          <div className="rounded-md border p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Instagram className="h-4 w-4" style={{ color: "hsl(var(--platform-instagram))" }} />
              Instagram Business
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Feed & Reels publiceren, post analytics, DMs & comments.
            </p>
          </div>
        </div>
        <div className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs">
          <strong>Let op:</strong> Meta vereist een App Review-traject (± 1–3 weken) voor{" "}
          <code className="rounded bg-muted px-1">pages_manage_posts</code>,{" "}
          <code className="rounded bg-muted px-1">instagram_content_publish</code> en insights-scopes. Tot die review binnen is werkt de koppeling in <em>Development Mode</em> voor jouw eigen accounts.
        </div>
      </CardContent>
    </Card>
  );
}

function PrereqStep({
  value,
  onChange,
}: {
  value: Progress["prereqs"];
  onChange: (v: Progress["prereqs"]) => void;
}) {
  const items = [
    {
      id: "businessManager" as const,
      title: "Facebook Business Manager account",
      link: "https://business.facebook.com/",
      desc: "Maak (of open) een Business Portfolio waar de FB-page en het IG-account onder vallen.",
    },
    {
      id: "facebookPage" as const,
      title: "Facebook Page van ZoetBezorgen",
      link: "https://www.facebook.com/pages/create",
      desc: "Je moet admin-rol hebben op de page.",
    },
    {
      id: "instagramBusiness" as const,
      title: "Instagram omgezet naar Business/Creator",
      link: "https://help.instagram.com/502981923235522",
      desc: "In de IG-app: Settings → Account type → switch to Business.",
    },
    {
      id: "igLinkedToPage" as const,
      title: "Instagram gekoppeld aan de FB-page",
      link: "https://www.facebook.com/business/help/connect-instagram-to-page",
      desc: "In Meta Business Suite → Instellingen → Instagram-accounts → koppel aan page.",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Vereisten checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40"
          >
            <Checkbox
              checked={value[item.id]}
              onCheckedChange={(v) => onChange({ ...value, [item.id]: v === true })}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{item.title}</span>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Openen <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function AppStep({ appId, onChange }: { appId: string; onChange: (v: string) => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta Developer App aanmaken</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Ga naar{" "}
            <a
              href="https://developers.facebook.com/apps/"
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              developers.facebook.com/apps
            </a>{" "}
            en klik <strong>Create App</strong>.
          </li>
          <li>Type: <strong>Business</strong> → gebruik je Business Portfolio.</li>
          <li>App name: <code className="rounded bg-muted px-1">ZoetBezorgen Social</code>.</li>
          <li>
            Voeg producten toe: <strong>Facebook Login for Business</strong>,{" "}
            <strong>Instagram Graph API</strong>, <strong>Pages API</strong>.
          </li>
          <li>
            Bij <em>Valid OAuth Redirect URIs</em> plak de callback URL uit het paneel rechts.
          </li>
        </ol>

        <div className="space-y-1">
          <Label htmlFor="appId" className="text-xs">
            Meta App ID
          </Label>
          <Input
            id="appId"
            value={appId}
            onChange={(e) => onChange(e.target.value)}
            placeholder="bv. 1234567890123456"
            className="bg-surface"
          />
          <p className="text-xs text-muted-foreground">
            Te vinden in App Dashboard → Settings → Basic.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PermissionsStep({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  const selectAll = () => onChange(PERMISSIONS.map((p) => p.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Permissies selecteren</CardTitle>
          <Button size="sm" variant="ghost" onClick={selectAll}>
            Alles aanvinken
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {PERMISSIONS.map((perm) => (
          <label
            key={perm.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40"
          >
            <Checkbox
              checked={value.includes(perm.id)}
              onCheckedChange={() => toggle(perm.id)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <code className="text-sm font-medium">{perm.label}</code>
                {perm.tier === "review" ? (
                  <Badge variant="outline" className="text-warning">
                    App Review
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-success">
                    Direct
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{perm.desc}</p>
            </div>
          </label>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">
          Vraag deze aan in App Dashboard → <strong>App Review → Permissions and Features</strong>.
          Bij elke scope: business use case beschrijven, screencast uploaden en submitten.
        </p>
      </CardContent>
    </Card>
  );
}

function CredentialsStep({
  value,
  onChange,
}: {
  value: Progress["credentials"];
  onChange: (v: Progress["credentials"]) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-primary" /> IDs & tokens invoeren
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Meta App ID</Label>
            <Input
              value={value.appId}
              onChange={(e) => onChange({ ...value, appId: e.target.value })}
              placeholder="1234567890123456"
              className="bg-surface"
            />
          </div>
          <div>
            <Label className="text-xs">Facebook Page ID</Label>
            <Input
              value={value.pageId}
              onChange={(e) => onChange({ ...value, pageId: e.target.value })}
              placeholder="bv. 100088123456789"
              className="bg-surface"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Page → About → Page transparency → Page ID.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Instagram Business Account ID (optioneel)</Label>
            <Input
              value={value.igBusinessId}
              onChange={(e) => onChange({ ...value, igBusinessId: e.target.value })}
              placeholder="17841400000000000"
              className="bg-surface"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Op te halen via <code>/me/accounts?fields=instagram_business_account</code> in de Graph API Explorer.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-md border border-warning/40 bg-warning/5 p-3 text-xs">
          <p>
            <strong>Secrets opslaan:</strong> De <em>App Secret</em> en <em>Long-Lived Page Access Token</em> horen niet in de UI. Sla ze veilig op als backend-secrets (
            <code>META_APP_SECRET</code>, <code>META_PAGE_ACCESS_TOKEN</code>). Vink hieronder aan zodra ze via een beheerder zijn ingevoerd.
          </p>
          <label className="mt-2 flex items-center gap-2">
            <Checkbox
              checked={value.hasSecret}
              onCheckedChange={(v) => onChange({ ...value, hasSecret: v === true })}
            />
            <span>
              <code>META_APP_SECRET</code> is opgeslagen
            </span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox
              checked={value.hasToken}
              onCheckedChange={(v) => onChange({ ...value, hasToken: v === true })}
            />
            <span>
              <code>META_PAGE_ACCESS_TOKEN</code> (long-lived, 60 dagen) is opgeslagen
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewStep({ progress, onSubmit }: { progress: Progress; onSubmit: () => void }) {
  const rows: [string, string][] = [
    ["App ID", progress.credentials.appId || "—"],
    ["Page ID", progress.credentials.pageId || "—"],
    ["IG Business ID", progress.credentials.igBusinessId || "—"],
    ["Permissies", progress.permissions.join(", ") || "—"],
    ["App Secret opgeslagen", progress.credentials.hasSecret ? "Ja" : "Nee"],
    ["Page Access Token opgeslagen", progress.credentials.hasToken ? "Ja" : "Nee"],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overzicht & indienen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="divide-y rounded-md border">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 px-3 py-2 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="max-w-[60%] truncate text-right font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <Button className="w-full" onClick={onSubmit}>
          Bevestig configuratie
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Deze wizard slaat je voortgang lokaal op. Zodra Meta App Review binnen is en de tokens in
          Lovable Cloud staan, activeren we de live publicatie in de Composer.
        </p>
      </CardContent>
    </Card>
  );
}

function DoneStep({ progress, onRestart }: { progress: Progress; onRestart: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5" /> Configuratie ingediend
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p>
          Je Meta-setup is opgeslagen op{" "}
          <strong>{progress.submittedAt ? new Date(progress.submittedAt).toLocaleString("nl-NL") : "-"}</strong>.
        </p>
        <div className="rounded-md border p-3">
          <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Volgende stappen</div>
          <ul className="space-y-1 text-sm">
            <li className="flex items-start gap-2">
              <Circle className="mt-1 h-2 w-2 fill-primary text-primary" /> Dien App Review in bij Meta (± 1–3 weken).
            </li>
            <li className="flex items-start gap-2">
              <Circle className="mt-1 h-2 w-2 fill-primary text-primary" /> Test in <em>Development Mode</em> met eigen accounts.
            </li>
            <li className="flex items-start gap-2">
              <Circle className="mt-1 h-2 w-2 fill-primary text-primary" /> Zodra approved: laat weten en we schakelen live publicatie in Composer aan.
            </li>
          </ul>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRestart}>
            Wizard opnieuw doorlopen
          </Button>
          <Button asChild>
            <Link to="/settings">Terug naar Instellingen</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ============ Sidebar ============ */

function StatusCard({ progress }: { progress: Progress }) {
  const prereqsDone = Object.values(progress.prereqs).filter(Boolean).length;
  const permsCount = progress.permissions.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Voortgang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Row label="Vereisten" value={`${prereqsDone}/4`} ok={prereqsDone === 4} />
        <Row label="App ID" value={progress.credentials.appId ? "✓" : "—"} ok={!!progress.credentials.appId} />
        <Row label="Permissies" value={`${permsCount} geselecteerd`} ok={permsCount > 0} />
        <Row label="Page ID" value={progress.credentials.pageId ? "✓" : "—"} ok={!!progress.credentials.pageId} />
        <Row label="Secret" value={progress.credentials.hasSecret ? "✓" : "—"} ok={progress.credentials.hasSecret} />
        <Row label="Token" value={progress.credentials.hasToken ? "✓" : "—"} ok={progress.credentials.hasToken} />
      </CardContent>
    </Card>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", ok ? "text-success" : "text-muted-foreground")}>
        {ok && <Check className="mr-1 inline h-3 w-3" />}
        {value}
      </span>
    </div>
  );
}

function HelpCard() {
  const callback = typeof window !== "undefined" ? `${window.location.origin}/auth/callback/meta` : "";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">OAuth Callback URL</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <p className="text-muted-foreground">
          Plak deze URL in Meta App → <strong>Facebook Login for Business → Settings → Valid OAuth Redirect URIs</strong>.
        </p>
        <div className="flex items-center gap-1">
          <code className="flex-1 truncate rounded bg-muted px-2 py-1">{callback}</code>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => navigator.clipboard?.writeText(callback)}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <a
          href="https://developers.facebook.com/docs/permissions"
          target="_blank"
          rel="noreferrer"
          className="mt-2 flex items-center gap-1 text-primary hover:underline"
        >
          Meta permissions reference <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}
