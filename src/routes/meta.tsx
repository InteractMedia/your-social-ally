import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useServerFn } from "@tanstack/react-start";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  checkMetaScopes,
  exchangeMetaToken,
  getMetaOAuthConfig,
  REQUIRED_META_SCOPES,
  saveMetaConnection,
} from "@/lib/meta.functions";

export const Route = createFileRoute("/meta")({
  head: () => ({
    meta: [{ title: "Meta koppeling — ZoetBezorgen Social" }],
  }),
  component: MetaWizard,
});

type StepId = "intro" | "prereqs" | "connect" | "done";

const STEPS: { id: StepId; label: string }[] = [
  { id: "intro", label: "Start" },
  { id: "prereqs", label: "Vereisten" },
  { id: "connect", label: "Koppelen" },
  { id: "done", label: "Klaar" },
];

const REQUIRED_PREREQS = [
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

function MetaWizard() {
  const [step, setStep] = useState<StepId>("intro");
  const [prereqs, setPrereqs] = useState<Record<string, boolean>>({
    businessManager: false,
    facebookPage: false,
    instagramBusiness: false,
    igLinkedToPage: false,
  });

  const [oauthData, setOauthData] = useState<{
    shortLivedToken?: string;
    pages?: Awaited<ReturnType<typeof exchangeMetaToken>>["pages"];
    me?: Awaited<ReturnType<typeof exchangeMetaToken>>["me"];
    granted?: string[];
    missing?: string[];
    permissions?: Awaited<ReturnType<typeof exchangeMetaToken>>["permissions"];
    warning?: string;
    diagnostics?: string[];
    error?: string;
  }>({});

  const [selectedPageId, setSelectedPageId] = useState<string>();
  const [isExchanging, setIsExchanging] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string>();
  const saveFn = useServerFn(saveMetaConnection);
  const savedPageIdRef = useRef<string | undefined>(undefined);

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const go = (id: StepId) => setStep(id);
  const next = () => go(STEPS[Math.min(stepIdx + 1, STEPS.length - 1)].id);
  const prev = () => go(STEPS[Math.max(stepIdx - 1, 0)].id);

  const prereqsDone = Object.values(prereqs).every(Boolean);
  const selectedPage = oauthData.pages?.find((p) => p.id === selectedPageId);
  const connectDone =
    !!oauthData.shortLivedToken && !!selectedPage && (oauthData.missing?.length ?? 0) === 0;

  const canProceed: Record<StepId, boolean> = {
    intro: true,
    prereqs: prereqsDone,
    connect: connectDone,
    done: true,
  };

  useEffect(() => {
    if (!selectedPageId || savedPageIdRef.current === selectedPageId) return;
    const selectedPage = oauthData.pages?.find((p) => p.id === selectedPageId);
    if (!selectedPage || (oauthData.missing?.length ?? 0) > 0) return;

    savedPageIdRef.current = selectedPageId;
    setSaveStatus("saving");
    setSaveError(undefined);

    saveFn({
      data: {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        pageToken: selectedPage.pageToken ?? "",
        igBusinessId: selectedPage.instagram?.id,
        igUsername: selectedPage.instagram?.username,
        scopes: [...REQUIRED_META_SCOPES],
        granted: oauthData.granted ?? [],
        missing: oauthData.missing ?? [],
      },
    })
      .then(() => {
        setSaveStatus("saved");
        toast.success("Meta-koppeling opgeslagen");
      })
      .catch((err) => {
        setSaveStatus("error");
        setSaveError((err as Error).message);
        toast.error("Opslaan mislukt: " + (err as Error).message);
      });
  }, [selectedPageId, oauthData.pages, oauthData.missing, oauthData.granted, saveFn]);

  return (
    <AppShell>
      <PageHeader
        title="Meta koppeling"
        subtitle="Autoriseer Facebook & Instagram stap voor stap. De wizard haalt automatisch de juiste Page ID en IG Business ID op."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/settings">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Terug naar Instellingen
            </Link>
          </Button>
        }
      />

      <ol className="mb-6 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => {
          const active = s.id === step;
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
          {step === "intro" && <IntroStep />}
          {step === "prereqs" && (
            <PrereqStep value={prereqs} onChange={setPrereqs} />
          )}
          {step === "connect" && (
            <ConnectStep
              data={oauthData}
              setData={setOauthData}
              selectedPageId={selectedPageId}
              setSelectedPageId={setSelectedPageId}
              isExchanging={isExchanging}
              setIsExchanging={setIsExchanging}
              saveStatus={saveStatus}
              saveError={saveError}
            />
          )}
          {step === "done" && (
            <DoneStep
              selectedPage={selectedPage}
              missing={oauthData.missing}
              saveStatus={saveStatus}
              onRestart={() => {
                setStep("intro");
                setOauthData({});
                setSelectedPageId(undefined);
                setSaveStatus("idle");
                setSaveError(undefined);
                savedPageIdRef.current = undefined;
              }}
            />
          )}

          {step !== "done" && (
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={prev} disabled={stepIdx === 0}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Vorige
              </Button>
              <Button onClick={next} disabled={!canProceed[step]}>
                {step === "connect" ? "Bevestig configuratie" : "Volgende"}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <StatusCard prereqs={prereqs} oauthData={oauthData} selectedPageId={selectedPageId} />
          <HelpCard />
        </aside>
      </div>
    </AppShell>
  );
}

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
          <strong>Instagram Business</strong>. Aan het eind kun je posts publiceren en analytics
          uitlezen vanuit ZoetBezorgen Social.
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
  value: Record<string, boolean>;
  onChange: (v: Record<string, boolean>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Vereisten checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {REQUIRED_PREREQS.map((item) => (
          <label
            key={item.id}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/40"
          >
            <Checkbox
              checked={value[item.id] ?? false}
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

function ConnectStep({
  data,
  setData,
  selectedPageId,
  setSelectedPageId,
  isExchanging,
  setIsExchanging,
  saveStatus,
  saveError,
}: {
  data: {
    shortLivedToken?: string;
    pages?: Awaited<ReturnType<typeof exchangeMetaToken>>["pages"];
    me?: Awaited<ReturnType<typeof exchangeMetaToken>>["me"];
    granted?: string[];
    missing?: string[];
    permissions?: Awaited<ReturnType<typeof exchangeMetaToken>>["permissions"];
    warning?: string;
    diagnostics?: string[];
    error?: string;
  };
  setData: React.Dispatch<
    React.SetStateAction<{
      shortLivedToken?: string;
      pages?: Awaited<ReturnType<typeof exchangeMetaToken>>["pages"];
      me?: Awaited<ReturnType<typeof exchangeMetaToken>>["me"];
      granted?: string[];
      missing?: string[];
      permissions?: Awaited<ReturnType<typeof exchangeMetaToken>>["permissions"];
      warning?: string;
      diagnostics?: string[];
      error?: string;
    }>
  >;
  selectedPageId?: string;
  setSelectedPageId: (id: string | undefined) => void;
  isExchanging: boolean;
  setIsExchanging: (v: boolean) => void;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  saveError?: string;
}) {
  const configFn = useServerFn(getMetaOAuthConfig);
  const exchangeFn = useServerFn(exchangeMetaToken);
  const checkScopesFn = useServerFn(checkMetaScopes);
  const [oauthError, setOauthError] = useState<string>();
  const [checkingScopes, setCheckingScopes] = useState(false);

  const startOAuth = async () => {
    setOauthError(undefined);
    const config = await configFn();
    if (!config.ok) {
      setOauthError(config.error);
      return;
    }

    const redirectUri = `${window.location.origin}/api/public/meta-callback`;
    const state = crypto.randomUUID();
    const scopes = config.scopes;
    const url =
      `https://www.facebook.com/${config.version}/dialog/oauth` +
      `?client_id=${encodeURIComponent(config.appId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      (config.businessConfigId
        ? `&config_id=${encodeURIComponent(config.businessConfigId)}`
        : `&scope=${encodeURIComponent(scopes)}`) +
      `&auth_type=rerequest` +
      `&response_type=code`;

    const popup = window.open(url, "meta-oauth", "width=600,height=700,popup=true");
    if (!popup) {
      setOauthError("Popup geblokkeerd. Sta popups toe voor dit domein.");
      return;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "META_OAUTH_CALLBACK") return;
      window.removeEventListener("message", onMessage);
      if (event.data.error) {
        setOauthError(event.data.error);
        return;
      }
      if (!event.data.token) {
        setOauthError("Geen token ontvangen van Meta.");
        return;
      }
      exchange(event.data.token);
    };
    window.addEventListener("message", onMessage);
  };

  const exchange = async (shortLivedToken: string) => {
    setIsExchanging(true);
    setData({ shortLivedToken });
    try {
      const result = await exchangeFn({ data: { shortLivedToken } });
      if (!result.ok) {
        setData({ error: "Exchange faalde" });
        return;
      }
      setData({
        shortLivedToken,
        pages: result.pages,
        me: result.me,
        granted: result.granted,
        missing: result.missing,
        permissions: result.permissions,
        warning: result.warning,
        diagnostics: result.diagnostics,
      });
      if (result.pages.length === 1) {
        setSelectedPageId(result.pages[0].id);
      }
    } catch (err) {
      setData({ error: (err as Error).message });
    } finally {
      setIsExchanging(false);
    }
  };

  const recheckScopes = async () => {
    setCheckingScopes(true);
    try {
      const result = await checkScopesFn();
      if ("ok" in result && result.ok) {
        setData((d) => ({
          ...d,
          granted: result.granted,
          missing: result.missing,
        }));
      } else {
        setData((d) => ({
          ...d,
          granted: [],
          missing: [...REQUIRED_META_SCOPES],
        }));
      }
    } finally {
      setCheckingScopes(false);
    }
  };

  const selectedPage = data.pages?.find((p) => p.id === selectedPageId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" /> Autoriseer Meta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Klik op de knop hieronder om in te loggen bij Meta en de benodigde permissions te
            verlenen. De app vraagt alleen de scopes die nodig zijn voor publiceren en analytics.
          </p>
          <Button onClick={startOAuth} disabled={isExchanging} className="gap-2">
            {isExchanging ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Facebook className="h-4 w-4" />
            )}
            {isExchanging ? "Bezig..." : "Autoriseer Meta"}
          </Button>

          {(oauthError || data.error) && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {oauthError || data.error}
            </div>
          )}

          {data.warning && (
            <div className="space-y-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <div className="flex items-start gap-2 text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <div className="font-medium">{data.warning}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    De login is gelukt voor {data.me?.name ?? "je persoonlijke account"}, maar Meta gaf geen beheerde Page-assets terug.
                  </p>
                </div>
              </div>
              {data.diagnostics && data.diagnostics.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                  {data.diagnostics.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Gevraagde scopes: {REQUIRED_META_SCOPES.join(", ")}
          </div>
        </CardContent>
      </Card>

      {data.pages && data.pages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Kies een Facebook Page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Selecteer de Page die gekoppeld is aan het Instagram Business account dat je wilt
              gebruiken.
            </p>
            <div className="space-y-2">
              {data.pages.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition hover:bg-muted/40",
                    selectedPageId === p.id && "border-primary bg-primary/5",
                  )}
                >
                  <input
                    type="radio"
                    name="page"
                    checked={selectedPageId === p.id}
                    onChange={() => setSelectedPageId(p.id)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Page ID: {p.id}</div>
                    {p.instagram ? (
                      <div className="text-xs text-success">
                        IG gekoppeld: @{p.instagram.username || p.instagram.name} ({p.instagram.id})
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600">Geen Instagram Business account gekoppeld</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.permissions && data.pages?.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ontvangen Meta permissions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              Als deze permissions op “granted” staan maar Pages leeg blijft, moet de OAuth-flow via Facebook Login for Business met een Configuration ID lopen.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {data.permissions.map((permission) => (
                <div key={permission.permission} className="flex items-center justify-between rounded-md border p-2 text-xs">
                  <span>{permission.permission}</span>
                  <Badge variant="outline" className={permission.status === "granted" ? "text-success" : "text-destructive"}>
                    {permission.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedPage && (
        <Card>
          <CardHeader>
            <CardTitle>Geselecteerde gegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <CopyRow label="Page ID" value={selectedPage.id} />
            <CopyRow
              label="IG Business ID"
              value={selectedPage.instagram?.id ?? "—"}
              note={
                selectedPage.instagram?.username
                  ? `@${selectedPage.instagram.username}`
                  : undefined
              }
            />
            <CopyRow
              label="Page Access Token"
              value={selectedPage.pageToken ?? "—"}
              masked
            />
            <p className="text-xs text-muted-foreground">
              Deze waardes worden automatisch opgeslagen zodra je een Page selecteert. Je kunt ze
              hier nog bekijken ter controle.
            </p>
          </CardContent>
        </Card>
      )}

      {saveStatus && saveStatus !== "idle" && (
        <Card>
          <CardContent className="space-y-2 py-4">
            <div className="flex items-center gap-2 text-sm">
              {saveStatus === "saving" && <RefreshCw className="h-4 w-4 animate-spin" />}
              {saveStatus === "saved" && <CheckCircle2 className="h-4 w-4 text-success" />}
              {saveStatus === "error" && <X className="h-4 w-4 text-destructive" />}
              <span>
                {saveStatus === "saving" && "Koppeling opslaan..."}
                {saveStatus === "saved" && "Koppeling opgeslagen in de app."}
                {saveStatus === "error" && "Opslaan mislukt"}
              </span>
            </div>
            {saveError && <div className="text-xs text-destructive">{saveError}</div>}
          </CardContent>
        </Card>
      )}

      {(data.granted || data.missing) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Permission check</CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={recheckScopes}
                disabled={checkingScopes}
              >
                {checkingScopes ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Opnieuw controleren"
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {REQUIRED_META_SCOPES.map((scope) => {
                const granted = data.granted?.includes(scope) ?? false;
                return (
                  <div
                    key={scope}
                    className={cn(
                      "flex items-center gap-2 rounded-md border p-2 text-xs",
                      granted ? "border-success/30 bg-success/10" : "border-destructive/30 bg-destructive/10",
                    )}
                  >
                    {granted ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className={granted ? "text-success" : "text-destructive"}>{scope}</span>
                  </div>
                );
              })}
            </div>
            {data.missing && data.missing.length > 0 && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                <strong>Missende scopes:</strong> {data.missing.join(", ")}. Klik opnieuw op
                "Autoriseer Meta" om de ontbrekende permissions toe te voegen.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CopyRow({
  label,
  value,
  note,
  masked,
}: {
  label: string;
  value: string;
  note?: string;
  masked?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const display = masked && !revealed ? "•".repeat(Math.min(value.length, 24)) : value;

  return (
    <div className="rounded-md border p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
          <div className="font-mono text-xs break-all">{display}</div>
          {note && <div className="text-xs text-muted-foreground">{note}</div>}
        </div>
        <div className="flex shrink-0 gap-1">
          {masked && (
            <Button size="icon" variant="ghost" onClick={() => setRevealed((v) => !v)}>
              <KeyRound className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(`${label} gekopieerd`))}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DoneStep({
  selectedPage,
  missing,
  saveStatus,
  onRestart,
}: {
  selectedPage?: Awaited<ReturnType<typeof exchangeMetaToken>>["pages"][number];
  missing?: string[];
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onRestart: () => void;
}) {
  const allGood = selectedPage && (!missing || missing.length === 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className={cn("flex items-center gap-2", allGood ? "text-success" : "text-warning")}>
          {allGood ? (
            <>
              <CheckCircle2 className="h-5 w-5" /> Koppeling voltooid
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5" /> Koppeling bijna klaar
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {allGood ? (
          saveStatus === "error" ? (
            <p>
              De wizard heeft de juiste gegevens gevonden, maar het automatisch opslaan is mislukt.
              Probeer de wizard opnieuw te doorlopen, of neem contact op.
            </p>
          ) : saveStatus === "saving" ? (
            <p>Koppeling wordt opgeslagen...</p>
          ) : (
            <p>
              De koppeling is live gezet. Je kunt nu posts publiceren naar Facebook en Instagram
              vanuit de app.
            </p>
          )
        ) : (
          <p>
            Er ontbreken nog permissions of er is geen Page geselecteerd. Herhaal de vorige stap
            en autoriseer opnieuw.
          </p>
        )}

        {selectedPage && (
          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Geselecteerde accounts</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Facebook className="h-4 w-4" style={{ color: "hsl(var(--platform-facebook))" }} />
                <span>{selectedPage.name}</span>
                <Badge variant="outline" className="text-[10px]">{selectedPage.id}</Badge>
              </div>
              {selectedPage.instagram && (
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" style={{ color: "hsl(var(--platform-instagram))" }} />
                  <span>@{selectedPage.instagram.username || selectedPage.instagram.name}</span>
                  <Badge variant="outline" className="text-[10px]">{selectedPage.instagram.id}</Badge>
                </div>
              )}
            </div>
          </div>
        )}

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

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function StatusCard({
  prereqs,
  oauthData,
  selectedPageId,
}: {
  prereqs: Record<string, boolean>;
  oauthData: {
    pages?: Awaited<ReturnType<typeof exchangeMetaToken>>["pages"];
    missing?: string[];
  };
  selectedPageId?: string;
}) {
  const prereqsDone = Object.values(prereqs).filter(Boolean).length;
  const pageSelected = oauthData.pages?.some((p) => p.id === selectedPageId);
  const scopesOk = (oauthData.missing?.length ?? 1) === 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Voortgang</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <Row label="Vereisten" value={`${prereqsDone}/4`} ok={prereqsDone === 4} />
        <Row label="Meta geautoriseerd" value={oauthData.pages ? "✓" : "—"} ok={!!oauthData.pages} />
        <Row label="Page geselecteerd" value={pageSelected ? "✓" : "—"} ok={!!pageSelected} />
        <Row label="Scopes compleet" value={scopesOk ? "✓" : "—"} ok={scopesOk} />
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
  const callback = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/api/public/meta-callback` : ""),
    [],
  );
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
            onClick={() => navigator.clipboard?.writeText(callback).then(() => toast.success("Callback URL gekopieerd"))}
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
