import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink, Sparkles, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  LINKEDIN_LIMITS,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_LABELS,
  quotaTone,
  type IcpProfileRow,
  type ProspectRow,
  type ProspectStatus,
  type QuotaSummary,
} from "@/lib/linkedin-prospects-shared";
import { buildSearchUrls } from "@/lib/linkedin-search-url";

import {
  addProspects,
  createIcpProfile,
  deleteIcpProfile,
  deleteProspect,
  generateProspectInvite,
  getProspectDashboard,
  updateProspectStatus,
} from "@/lib/linkedin-prospects.functions";

const TITLE = "LinkedIn Prospect Radar — SocialCockpit";
const DESCRIPTION =
  "Bepaal met AI je ideale LinkedIn-doelgroep, genereer zoeklinks en uitnodigingsteksten, en houd je dagelijkse uitnodigingslimiet in de gaten.";

export const Route = createFileRoute("/prospects")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProspectsPage,
});

function ProspectsPage() {
  const qc = useQueryClient();
  const load = useServerFn(getProspectDashboard);
  const query = useQuery({ queryKey: ["linkedin", "prospects"], queryFn: () => load({}) });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["linkedin", "prospects"] });

  const profiles = query.data?.profiles ?? [];
  const prospects = query.data?.prospects ?? [];
  const quota = query.data?.quota;

  return (
    <AppShell>
      <PageHeader
        title="LinkedIn Prospect Radar"
        subtitle="AI bepaalt je doelgroep en schrijft de uitnodiging. Het versturen doe je zelf in LinkedIn — daar bestaat geen API voor."
      />

      <div className="space-y-6">
        {query.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : quota ? (
          <QuotaBar quota={quota} />
        ) : null}

        <Tabs defaultValue="profiles">
          <TabsList>
            <TabsTrigger value="profiles">Doelgroepen ({profiles.length})</TabsTrigger>
            <TabsTrigger value="prospects">Prospects ({prospects.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="profiles" className="mt-4 space-y-4">
            <IcpForm onDone={invalidate} />
            {query.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : profiles.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground p-8 text-center text-sm">
                  Nog geen doelgroepprofiel. Vul hierboven branche en kenmerken in — AI maakt het profiel
                  en de zoeklinks.
                </CardContent>
              </Card>
            ) : (
              profiles.map((p) => <IcpCard key={p.id} profile={p} onChanged={invalidate} />)
            )}
          </TabsContent>

          <TabsContent value="prospects" className="mt-4 space-y-4">
            <AddProspects profiles={profiles} onDone={invalidate} />
            {query.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : prospects.length === 0 ? (
              <Card>
                <CardContent className="text-muted-foreground p-8 text-center text-sm">
                  Nog geen prospects. Open een zoeklink, kopieer namen en profiel-URL's uit LinkedIn en plak
                  ze hierboven.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {prospects.map((p) => (
                  <ProspectCard key={p.id} prospect={p} onChanged={invalidate} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function QuotaBar({ quota }: { quota: QuotaSummary }) {
  const tone = quotaTone(quota);
  const toneClass =
    tone === "stop"
      ? "border-destructive/40 bg-destructive/10"
      : tone === "warn"
        ? "border-warning/40 bg-warning/10"
        : "border-border";
  return (
    <Card className={toneClass}>
      <CardContent className="p-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <Stat label="Vandaag verstuurd" value={`${quota.today} / ${LINKEDIN_LIMITS.perDay}`} />
          <Stat label="Deze week" value={`${quota.week} / ${LINKEDIN_LIMITS.perWeek}`} />
          <Stat label="Openstaand" value={`${quota.pending}`} />
          <Stat label="Geaccepteerd" value={`${quota.accepted}`} />
          <Stat
            label="Acceptatiegraad"
            value={quota.acceptanceRate === null ? "—" : `${quota.acceptanceRate}%`}
          />
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          {tone === "stop"
            ? "Stop voor nu: je zit op je veilige limiet. LinkedIn remt accounts af bij te veel verzoeken."
            : tone === "warn"
              ? "Let op: je nadert de veilige limiet of je acceptatiegraad zakt onder 35%. Kies selectiever."
              : `Richtlijn: max ${LINKEDIN_LIMITS.perDay} uitnodigingen per dag, ${LINKEDIN_LIMITS.perWeek} per week en nooit meer dan ${LINKEDIN_LIMITS.maxPending} openstaande verzoeken.`}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function IcpForm({ onDone }: { onDone: () => void }) {
  const fn = useServerFn(createIcpProfile);
  const [form, setForm] = useState({
    industry: "",
    companySize: "",
    region: "Nederland",
    occasion: "",
    keywords: "",
    jobTitles: "",
  });
  const mutation = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => {
      toast.success("Doelgroepprofiel aangemaakt");
      setForm((f) => ({ ...f, occasion: "", keywords: "", jobTitles: "" }));
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Nieuw doelgroepprofiel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Branche">
            <Input value={form.industry} onChange={set("industry")} placeholder="Bijv. accountancy" />
          </Field>
          <Field label="Bedrijfsgrootte">
            <Input value={form.companySize} onChange={set("companySize")} placeholder="50-250 medewerkers" />
          </Field>
          <Field label="Regio">
            <Input value={form.region} onChange={set("region")} placeholder="Nederland" />
          </Field>
          <Field label="Aanleiding">
            <Input value={form.occasion} onChange={set("occasion")} placeholder="Kerstgeschenken" />
          </Field>
          <Field label="Trefwoorden (komma's)">
            <Input value={form.keywords} onChange={set("keywords")} placeholder="personeelsattentie, relatiegeschenk" />
          </Field>
          <Field label="Functietitels (optioneel)">
            <Input value={form.jobTitles} onChange={set("jobTitles")} placeholder="HR-manager, office manager" />
          </Field>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <Sparkles className="mr-1.5 h-4 w-4" />
          {mutation.isPending ? "AI denkt na…" : "Doelgroep genereren"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function IcpCard({ profile, onChanged }: { profile: IcpProfileRow; onChanged: () => void }) {
  const fn = useServerFn(deleteIcpProfile);
  const del = useMutation({
    mutationFn: () => fn({ data: { id: profile.id } }),
    onSuccess: () => {
      toast.success("Doelgroep verwijderd");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{profile.name}</CardTitle>
          <div className="text-muted-foreground mt-1 text-xs">
            {[profile.industry, profile.company_size, profile.region, profile.occasion]
              .filter(Boolean)
              .join(" · ") || "Geen filters opgegeven"}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => del.mutate()} disabled={del.isPending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {profile.ai_company_profile && (
          <Block title="Ideaal bedrijf" text={profile.ai_company_profile} />
        )}
        {profile.ai_decision_maker && <Block title="Beslisser" text={profile.ai_decision_maker} />}
        {profile.ai_rationale && <Block title="Waarom dit past" text={profile.ai_rationale} />}

        <div className="flex flex-wrap gap-1.5">
          {profile.job_titles.map((t) => (
            <Badge key={t} variant="secondary" className="text-[11px]">
              {t}
            </Badge>
          ))}
          {profile.keywords.map((t) => (
            <Badge key={t} variant="outline" className="text-[11px]">
              {t}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {buildSearchUrls({
            jobTitles: profile.job_titles ?? [],
            keywords: profile.keywords ?? [],
            exclusions: profile.exclusions ?? [],
            industry: profile.industry,
            region: profile.region,
          }).map((s) => (
            <div key={s.url} className="flex items-center gap-1">
              <Button asChild size="sm" variant="outline">
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.label} <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(s.url);
                  toast.success("Zoeklink gekopieerd");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Elke link is één korte zoekterm — LinkedIn geeft geen resultaten op lange
          zoekopdrachten met AND/NOT.
        </p>

      </CardContent>
    </Card>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{title}</div>
      <p className="mt-1">{text}</p>
    </div>
  );
}

function AddProspects({ profiles, onDone }: { profiles: IcpProfileRow[]; onDone: () => void }) {
  const fn = useServerFn(addProspects);
  const [raw, setRaw] = useState("");
  const [profileId, setProfileId] = useState<string>("none");
  const mutation = useMutation({
    mutationFn: () =>
      fn({ data: { raw, profileId: profileId === "none" ? null : profileId } }),
    onSuccess: (res) => {
      toast.success(`${res.prospects.length} prospects toegevoegd`);
      setRaw("");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Prospects toevoegen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={5}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"Jan Jansen | HR-manager | Acme BV | https://www.linkedin.com/in/janjansen\nEén prospect per regel"}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={profileId} onValueChange={setProfileId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Doelgroep koppelen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Geen doelgroep</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !raw.trim()}>
            <Users className="mr-1.5 h-4 w-4" /> Toevoegen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProspectCard({ prospect, onChanged }: { prospect: ProspectRow; onChanged: () => void }) {
  const statusFn = useServerFn(updateProspectStatus);
  const inviteFn = useServerFn(generateProspectInvite);
  const delFn = useServerFn(deleteProspect);

  const status = useMutation({
    mutationFn: (s: ProspectStatus) => statusFn({ data: { id: prospect.id, status: s } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });
  const invite = useMutation({
    mutationFn: () => inviteFn({ data: { id: prospect.id } }),
    onSuccess: () => {
      toast.success("Uitnodigingstekst klaar");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: () => delFn({ data: { id: prospect.id } }),
    onSuccess: onChanged,
    onError: (e: Error) => toast.error(e.message),
  });

  const chars = useMemo(() => prospect.invite_message?.length ?? 0, [prospect.invite_message]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-medium">{prospect.full_name}</div>
            <div className="text-muted-foreground text-xs">
              {[prospect.job_title, prospect.company_name].filter(Boolean).join(" · ") || "Geen functie bekend"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={prospect.status} onValueChange={(v) => status.mutate(v as ProspectStatus)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROSPECT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PROSPECT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {prospect.linkedin_url && (
              <Button asChild size="sm" variant="outline">
                <a href={prospect.linkedin_url} target="_blank" rel="noreferrer">
                  Profiel <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {prospect.invite_message ? (
          <div className="bg-muted/50 rounded-md border p-3 text-sm">
            <p className="whitespace-pre-wrap">{prospect.invite_message}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground text-xs tabular-nums">
                {chars} / {LINKEDIN_LIMITS.inviteMessageMaxChars} tekens
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(prospect.invite_message ?? "");
                  toast.success("Tekst gekopieerd");
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" /> Kopiëren
              </Button>
            </div>
          </div>
        ) : null}

        <Button size="sm" variant="secondary" onClick={() => invite.mutate()} disabled={invite.isPending}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          {invite.isPending
            ? "AI schrijft…"
            : prospect.invite_message
              ? "Nieuwe tekst genereren"
              : "Uitnodigingstekst genereren"}
        </Button>
      </CardContent>
    </Card>
  );
}
