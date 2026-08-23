import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Brain, Building2, Check, Copy, KeyRound, Link2, Loader2, Megaphone, Plug, Sparkles, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { PlatformIcon, platformTintStyle } from "@/components/platform-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORMS, accounts, platformLabel } from "@/lib/demo-data";
import { getGoogleAdsConnection } from "@/lib/google-ads.functions";
import { getLinkedInProfile } from "@/lib/linkedin.functions";
import { createIngestKey, getMyWorkspace, revokeIngestKey } from "@/lib/workspaces.functions";
import { checkMetaScopes, debugMetaToken, getMetaStatus, REQUIRED_META_SCOPES } from "@/lib/meta.functions";


export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Instellingen — ZoetBezorgen Social" }] }),
  component: Settings,
});

function Settings() {
  return (
    <AppShell>
      <PageHeader
        title="Instellingen"
        subtitle="Koppelingen, handmatige cijfers en brand voice."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-primary" /> Platform-koppelingen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLATFORMS.map((p) => {
              const acc = accounts.find((a) => a.platform === p.id);
              if (p.id === "linkedin") return <LinkedInRow key={p.id} />;
              if (p.id === "facebook" || p.id === "instagram")
                return <MetaRow key={p.id} platform={p.id} />;
              const live = acc?.connection === "api";
              return (
                <div
                  key={p.id}
                  className="platform-row flex items-center gap-3 rounded-md border p-3"
                  style={platformTintStyle(p.id)}
                >
                  <PlatformIcon platform={p.id} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {acc ? acc.handle : "Nog niet gekoppeld"}
                    </div>
                  </div>
                  {live ? (
                    <Badge variant="outline" className="gap-1 text-success">
                      <Check className="h-3 w-3" /> Live
                    </Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Koppelen
                    </Button>
                  )}
                </div>
              );
            })}

            <GoogleAdsRow />

            <p className="text-xs text-muted-foreground">
              LinkedIn, Facebook, Instagram en Google Ads zijn echt gekoppeld via de API. TikTok en YouTube volgen zodra hun connectoren beschikbaar zijn.
            </p>
          </CardContent>

        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brand voice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Tone</Label>
              <Input defaultValue="warm, speels, ambachtelijk-trots" className="bg-surface" />
            </div>
            <div>
              <Label className="text-xs">Do's</Label>
              <Textarea
                rows={3}
                defaultValue="• Spreek de lezer aan als 'je'.\n• Noem ingrediënten bij naam.\n• Korte zinnen, één gedachte per zin."
                className="resize-none bg-surface"
              />
            </div>
            <div>
              <Label className="text-xs">Don'ts</Label>
              <Textarea
                rows={3}
                defaultValue="• Geen corporate jargon.\n• Geen overdadige emoji.\n• Niet over prijs in de hook."
                className="resize-none bg-surface"
              />
            </div>
            <Button size="sm" className="mt-2">Opslaan</Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Handmatige cijfers (IG / FB / YT)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {accounts
                .filter((a) => a.connection === "manual")
                .map((a) => (
                  <div
                    key={a.platform}
                    className="platform-row rounded-md border p-3"
                    style={platformTintStyle(a.platform)}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <PlatformIcon platform={a.platform} />
                      <span className="text-sm font-medium">{platformLabel(a.platform)}</span>
                    </div>
                    <Label className="text-xs">Volgers</Label>
                    <Input type="number" defaultValue={a.followers} className="bg-background" />
                    <Label className="mt-2 text-xs">Engagement %</Label>
                    <Input type="number" step="0.1" defaultValue={a.engagementRate} className="bg-background" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <AiAnalystCard />

        <WorkspaceCard />

        <MetaDebugCard />
      </div>
    </AppShell>
  );
}

/** AI Ads Analyst: model, analyseperiode en veiligheidsgrenzen. */
function AiAnalystCard() {
  const getFn = useServerFn(getAiAdsSettings);
  const saveFn = useServerFn(updateAiAdsSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["ai-settings"], queryFn: () => getFn({}) });
  const [draft, setDraft] = useState<AiSettings | null>(null);

  const settings = draft ?? data?.settings ?? null;
  const availability = data?.availability;

  const save = useMutation({
    mutationFn: (s: AiSettings) =>
      saveFn({
        data: {
          enabled: s.enabled,
          provider: s.provider,
          model: s.model,
          defaultPeriodDays: s.defaultPeriodDays as 7 | 30 | 90,
          minConfidence: s.minConfidence,
          budgetChangeMaxPct: s.budgetChangeMaxPct,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) return toast.error(res.error ?? "Opslaan mislukt");
      toast.success("AI-instellingen opgeslagen");
      qc.invalidateQueries({ queryKey: ["ai-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const patch = (p: Partial<AiSettings>) =>
    settings && setDraft({ ...settings, ...p } as AiSettings);

  const modelOptions =
    settings?.provider === "anthropic" ? CLAUDE_MODEL_OPTIONS : LOVABLE_MODEL_OPTIONS;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" /> AI Ads Analyst
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !settings ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Instellingen laden…
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="text-xs">AI-provider</Label>
                <select
                  value={settings.provider}
                  onChange={(e) => {
                    const provider = e.target.value as AiSettings["provider"];
                    const fallbackModel =
                      provider === "anthropic" ? CLAUDE_MODEL_OPTIONS[0] : LOVABLE_MODEL_OPTIONS[0];
                    patch({ provider, model: fallbackModel });
                  }}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {AI_PROVIDERS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {availability && availability[settings.provider] === false && (
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-warning">
                    <AlertTriangle className="h-3 w-3" /> Sleutel ontbreekt — analyses gebruiken het
                    fallbackmodel.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-xs">Model</Label>
                <select
                  value={settings.model}
                  onChange={(e) => patch({ model: e.target.value })}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {[...new Set([settings.model, ...modelOptions])].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Standaard analyseperiode</Label>
                <select
                  value={settings.defaultPeriodDays}
                  onChange={(e) => patch({ defaultPeriodDays: Number(e.target.value) })}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {ANALYSIS_PERIOD_OPTIONS.map((d) => (
                    <option key={d} value={d}>
                      Laatste {d} dagen
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs">Minimale betrouwbaarheid (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.minConfidence}
                  onChange={(e) => patch({ minConfidence: Number(e.target.value) })}
                  className="mt-1 bg-background"
                />
              </div>

              <div>
                <Label className="text-xs">Max. budgetstap per advies (%)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.budgetChangeMaxPct}
                  onChange={(e) => patch({ budgetChangeMaxPct: Number(e.target.value) })}
                  className="mt-1 bg-background"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => patch({ enabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Analyses toegestaan
                </label>
              </div>
            </div>

            <div className="rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
              AI mag uitsluitend analyseren en voorstellen doen. Automatisch doorvoeren in Google Ads is
              uitgeschakeld en kan hier niet aangezet worden.
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => save.mutate(settings)} disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Opslaan
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/ads/google/advice">Open adviesinbox</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** Tenant/workspace ownership + ingest credentials per workspace. */
function WorkspaceCard() {
  const load = useServerFn(getMyWorkspace);
  const create = useServerFn(createIngestKey);
  const revoke = useServerFn(revokeIngestKey);
  const [label, setLabel] = useState("");
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["workspace", "me"],
    queryFn: () => load({}),
  });

  const addKey = async () => {
    if (label.trim().length < 2) return toast.error("Geef de sleutel een naam.");
    try {
      const res = await create({ data: { label } });
      setFreshToken(res.token);
      setLabel("");
      await refetch();
      toast.success("Ingest-sleutel aangemaakt");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aanmaken mislukt");
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" /> Workspace &amp; lead-ingest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Laden…</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="secondary">{data?.workspace?.name ?? "—"}</Badge>
              <span className="text-muted-foreground">
                {data?.memberCount ?? 0} gebruiker(s) · jouw rol: {data?.role}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Alle leads horen bij deze workspace. Gebruikers zien uitsluitend leads van workspaces
              waar zij lid van zijn. Een ingest-sleutel bepaalt automatisch bij welke workspace een
              binnenkomende lead terechtkomt.
            </p>

            <div className="space-y-2">
              {(data?.ingestKeys ?? []).map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <p className="font-medium">{k.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.token_prefix}… · {k.active ? "actief" : "ingetrokken"}
                      {k.last_used_at ? ` · laatst gebruikt ${new Date(k.last_used_at).toLocaleString("nl-NL")}` : ""}
                    </p>
                  </div>
                  {k.active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await revoke({ data: { id: k.id } });
                        await refetch();
                        toast.success("Sleutel ingetrokken");
                      }}
                    >
                      Intrekken
                    </Button>
                  )}
                </div>
              ))}
              {(data?.ingestKeys ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nog geen eigen ingest-sleutels.</p>
              )}
            </div>

            {freshToken && (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                <p className="text-xs font-medium">Bewaar deze sleutel nu — hij wordt eenmalig getoond.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all text-xs">{freshToken}</code>
                  <Button size="sm" variant="outline" onClick={() => copy(freshToken, "Ingest-sleutel")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Gebruik als header <code>x-lead-ingest-secret</code> op /api/public/lead-ingest/quote
                  of /platform.
                </p>
              </div>
            )}

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Naam nieuwe ingest-sleutel</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Shopify offerteformulier" />
              </div>
              <Button size="sm" onClick={addKey}>
                <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Aanmaken
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function LinkedInRow() {
  const fn = useServerFn(getLinkedInProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["linkedin", "profile"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <div
      className="platform-row flex items-center gap-3 rounded-md border p-3"
      style={platformTintStyle("linkedin")}
    >
      <PlatformIcon platform="linkedin" />
      <div className="flex-1">
        <div className="text-sm font-medium">LinkedIn</div>
        <div className="text-xs text-muted-foreground">
          {isLoading
            ? "Verbinding controleren…"
            : data?.connected
              ? `${data.name}${data.email ? ` · ${data.email}` : ""}`
              : data?.error ?? "Nog niet gekoppeld"}
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : data?.connected ? (
        <>
          {data.picture && (
            <img src={data.picture} alt="" className="h-8 w-8 rounded-full object-cover" />
          )}
          <Badge variant="outline" className="gap-1 text-success">
            <Check className="h-3 w-3" /> Live
          </Badge>
        </>
      ) : (
        <Badge variant="outline">Niet gekoppeld</Badge>
      )}
    </div>
  );
}

function GoogleAdsRow() {
  const fn = useServerFn(getGoogleAdsConnection);
  const { data, isLoading } = useQuery({
    queryKey: ["google-ads", "connection"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const connected = !!data?.connected && !!data.selected;

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
        <Megaphone className="h-4 w-4 text-primary" />
      </span>
      <div className="flex-1">
        <div className="text-sm font-medium">Google Ads</div>
        <div className="text-xs text-muted-foreground">
          {isLoading
            ? "Verbinding controleren…"
            : connected
              ? `${data!.selected!.name} · ${data!.selected!.customerId}${
                  data!.accounts.length > 1 ? ` · ${data!.accounts.length} accounts` : ""
                }`
              : data?.error ?? "Nog niet gekoppeld"}
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : connected ? (
        <>
          <Badge variant="outline" className="gap-1 text-success">
            <Check className="h-3 w-3" /> Live gekoppeld
          </Badge>
          <Button asChild size="sm" variant="outline">
            <Link to="/ads/google">Open</Link>
          </Button>
        </>
      ) : (
        <Badge variant="outline">Niet gekoppeld</Badge>
      )}
    </div>
  );
}

function MetaRow({ platform }: { platform: "facebook" | "instagram" }) {
  const fn = useServerFn(getMetaStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["meta", "status"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const info = platform === "facebook" ? data?.page : data?.instagram;
  const connected = !!info?.connected;
  const label =
    platform === "facebook"
      ? info?.connected ? `${(info as { name?: string }).name ?? "Facebook Page"}` : ""
      : info?.connected ? `@${(info as { username?: string }).username ?? ""}` : "";

  return (
    <div
      className="platform-row flex items-center gap-3 rounded-md border p-3"
      style={platformTintStyle(platform)}
    >
      <PlatformIcon platform={platform} />
      <div className="flex-1">
        <div className="text-sm font-medium">{platform === "facebook" ? "Facebook" : "Instagram"}</div>
        <div className="text-xs text-muted-foreground">
          {isLoading
            ? "Verbinding controleren…"
            : connected
              ? label
              : info?.error ?? "Nog niet gekoppeld"}
        </div>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : connected ? (
        <Badge variant="outline" className="gap-1 text-success">
          <Check className="h-3 w-3" /> Live
        </Badge>
      ) : (
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to="/meta">
            <Sparkles className="h-3.5 w-3.5" />
            Wizard
          </Link>
        </Button>
      )}
    </div>
  );
}

function copy(value: string, label: string) {
  navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} gekopieerd`),
    () => toast.error("Kopiëren mislukt"),
  );
}

function MetaDebugCard() {
  const debugFn = useServerFn(debugMetaToken);
  const scopesFn = useServerFn(checkMetaScopes);
  const {
    data: debugData,
    isFetching: debugFetching,
    refetch: refetchDebug,
    error: debugError,
  } = useQuery({
    queryKey: ["meta", "debug"],
    queryFn: () => debugFn(),
    enabled: false,
    retry: false,
  });
  const {
    data: scopesData,
    isFetching: scopesFetching,
    refetch: refetchScopes,
    error: scopesError,
  } = useQuery({
    queryKey: ["meta", "scopes"],
    queryFn: () => scopesFn(),
    enabled: false,
    retry: false,
  });

  const scopes =
    scopesData && "ok" in scopesData && scopesData.ok ? scopesData.granted : [];
  const missingScopes =
    scopesData && "ok" in scopesData && scopesData.ok
      ? scopesData.missing
      : REQUIRED_META_SCOPES.filter((s) => !scopes.includes(s));
  const tokenType = scopesData && "ok" in scopesData && scopesData.ok ? scopesData.type : undefined;
  const isValid = scopesData && "ok" in scopesData && scopesData.ok ? scopesData.is_valid : undefined;
  const expiresAt = scopesData && "ok" in scopesData && scopesData.ok ? scopesData.expires_at : undefined;

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" /> Meta diagnose
          </CardTitle>
          <Button asChild size="sm" variant="outline">
            <Link to="/meta">
              <KeyRound className="mr-1 h-3.5 w-3.5" /> Wizard
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-xl text-sm text-muted-foreground">
            Controleert welke Pages, Instagram accounts en permissions jouw huidige token heeft. Open
            de wizard om de koppeling opnieuw te autoriseren.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => refetchScopes()} disabled={scopesFetching}>
              {scopesFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Scopes check"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => refetchDebug()} disabled={debugFetching}>
              {debugFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Pages zoeken"}
            </Button>
          </div>
        </div>

        {(debugError || scopesError) && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {(debugError || scopesError)!.message}
          </div>
        )}

        {scopesData && "ok" in scopesData && scopesData.ok === false && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {scopesData.error}
          </div>
        )}

        {scopesData && "ok" in scopesData && scopesData.ok === true && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Token status</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="text-[10px]">{tokenType ?? "onbekend"}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Geldig</span>
                    <span>{isValid ? "ja" : "nee"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Verloopt</span>
                    <span>
                      {expiresAt === undefined
                        ? "?"
                        : expiresAt === 0
                          ? "nooit (long-lived)"
                          : new Date(expiresAt * 1000).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-md border p-3 text-sm">
                <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">Scopes</div>
                <div className="grid gap-1">
                  {REQUIRED_META_SCOPES.map((scope) => {
                    const granted = scopes.includes(scope);
                    return (
                      <div key={scope} className="flex items-center justify-between text-xs">
                        <span>{scope}</span>
                        {granted ? (
                          <Badge variant="outline" className="gap-1 text-[10px] text-success">
                            <Check className="h-3 w-3" /> ja
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 text-[10px] text-destructive">
                            <X className="h-3 w-3" /> nee
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                {missingScopes.length > 0 && (
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Mist: {missingScopes.join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            {missingScopes.length > 0 && (
              <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <div className="mb-2 font-medium">Ontbrekende permissions</div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Open de Meta-koppelwizard om de ontbrekende scopes opnieuw aan te vragen.
                </p>
                <Button asChild size="sm">
                  <Link to="/meta">
                    <KeyRound className="mr-1 h-3.5 w-3.5" /> Open wizard
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}

        {debugData && "ok" in debugData && debugData.ok === true && (
          <div>
            <div className="mb-2 text-xs font-medium uppercase text-muted-foreground">
              Gevonden Pages ({debugData.pages.length})
            </div>
            {debugData.pages.length === 0 && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                Geen Pages gevonden. Het token hoort waarschijnlijk bij een account zonder Page-beheer, of mist <code>pages_show_list</code>.
              </div>
            )}
            <div className="space-y-3">
              {debugData.pages.map((p) => (
                <div key={p.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{p.name}</div>
                    {(p.matchesCurrentPageId || p.matchesCurrentIgId) && (
                      <Badge variant="outline" className="gap-1 text-success">
                        <Check className="h-3 w-3" />
                        {p.matchesCurrentPageId && p.matchesCurrentIgId
                          ? "Beide IDs komen overeen"
                          : p.matchesCurrentPageId
                            ? "Page ID komt overeen"
                            : "IG ID komt overeen"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-2 rounded bg-surface px-2 py-1">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase text-muted-foreground">Page ID</div>
                        <div className="truncate font-mono text-xs">{p.id}</div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => copy(p.id, "Page ID")}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded bg-surface px-2 py-1">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase text-muted-foreground">
                          IG Business ID {p.instagram?.username ? `(@${p.instagram.username})` : ""}
                        </div>
                        <div className="truncate font-mono text-xs">{p.instagram?.id ?? "— geen IG gekoppeld"}</div>
                      </div>
                      {p.instagram?.id && (
                        <Button size="icon" variant="ghost" onClick={() => copy(p.instagram!.id, "IG Business ID")}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



