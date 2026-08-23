import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, ExternalLink, Eye, LayoutTemplate, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LANDING_FUNNEL_LABELS,
  LANDING_STATUS_LABELS,
  landingPath,
  slugify,
  type LandingFunnel,
  type LandingStatus,
} from "@/lib/landing-shared";
import { createLandingPage, duplicateLandingPage, listLandingPages } from "@/lib/landing.functions";

export const Route = createFileRoute("/landingpages/")({
  head: () => ({
    meta: [
      { title: "Landingspagina's — SocialCockpit" },
      {
        name: "description",
        content:
          "Beheer B2B landingspagina's en offertefunnels: publiceren, dupliceren per branche en conversies volgen.",
      },
      { property: "og:title", content: "Landingspagina's — SocialCockpit" },
      {
        property: "og:description",
        content: "Beheer en publiceer je B2B landingspagina's en offertefunnels.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPagesOverview,
});

function LandingPagesOverview() {
  const fn = useServerFn(listLandingPages);
  const query = useQuery({ queryKey: ["landing", "pages"], queryFn: () => fn({}) });
  const pages = query.data?.pages ?? [];
  const stats = query.data?.stats ?? {};

  return (
    <AppShell>
      <PageHeader
        title="Landingspagina's"
        subtitle="Elke pagina is data-driven: bouw, dupliceer per branche en publiceer zonder code."
        actions={<NewPageDialog industries={query.data?.industries ?? []} />}
      />

      {query.isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : pages.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <LayoutTemplate className="text-muted-foreground mx-auto h-6 w-6" />
            <p className="mt-3 font-medium">Nog geen landingspagina's</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Maak je eerste offertepagina aan — inhoud, formulier en SEO stel je daarna in.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pages.map((page) => {
            const path = landingPath(page.funnel_type, page.slug);
            const s = stats[page.id] ?? { leads: 0, views: 0 };
            return (
              <Card key={page.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <Link
                        to="/landingpages/$id"
                        params={{ id: page.id }}
                        className="font-medium hover:underline"
                      >
                        {page.name}
                      </Link>
                      <StatusBadge status={page.status as LandingStatus} />
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {LANDING_FUNNEL_LABELS[page.funnel_type as LandingFunnel] ?? page.funnel_type} ·{" "}
                      {path} · v{page.version_counter}
                    </p>
                  </div>

                  <div className="text-muted-foreground flex gap-6 text-xs">
                    <div>
                      <p className="text-foreground text-base font-semibold tabular-nums">{s.views}</p>
                      bezoeken
                    </div>
                    <div>
                      <p className="text-foreground text-base font-semibold tabular-nums">{s.leads}</p>
                      leads
                    </div>
                    <div>
                      <p className="text-foreground text-base font-semibold tabular-nums">
                        {s.views > 0 ? `${((s.leads / s.views) * 100).toFixed(1)}%` : "—"}
                      </p>
                      conversie
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="ghost" size="sm">
                      <a href={`${path}?preview=${page.preview_token}`} target="_blank" rel="noreferrer">
                        <Eye className="mr-1 h-4 w-4" /> Preview
                      </a>
                    </Button>
                    {page.status === "published" && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={path} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 h-4 w-4" /> Live
                        </a>
                      </Button>
                    )}
                    <DuplicateDialog
                      pageId={page.id}
                      name={page.name}
                      industries={query.data?.industries ?? []}
                    />
                    <Button asChild size="sm">
                      <Link to="/landingpages/$id" params={{ id: page.id }}>
                        Bewerken
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

function StatusBadge({ status }: { status: LandingStatus }) {
  const tone =
    status === "published"
      ? "bg-success/15 text-success"
      : status === "paused"
        ? "bg-warning/15 text-warning"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {LANDING_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function NewPageDialog({ industries }: { industries: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [funnel, setFunnel] = useState<LandingFunnel>("quote");
  const [industryId, setIndustryId] = useState("");
  const create = useServerFn(createLandingPage);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () =>
      create({
        data: {
          name,
          slug: slugify(slug || name),
          funnel,
          industry_id: industryId || null,
        },
      }),
    onSuccess: (r) => {
      toast.success("Landingspagina aangemaakt");
      queryClient.invalidateQueries({ queryKey: ["landing", "pages"] });
      setOpen(false);
      navigate({ to: "/landingpages/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1 h-4 w-4" /> Nieuwe pagina
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nieuwe landingspagina</DialogTitle>
          <DialogDescription>
            De pagina start met de volledige ZoetBezorgen B2B-template, inclusief offerteformulier.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Naam</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(slugify(e.target.value));
              }}
              placeholder="Zakelijke kerstgeschenken bouw"
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL-slug</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="kerstgeschenken-bouw" />
            <p className="text-muted-foreground text-xs">
              Wordt: {landingPath(funnel, slugify(slug || name) || "slug")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Funnel</Label>
            <select
              value={funnel}
              onChange={(e) => setFunnel(e.target.value as LandingFunnel)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="quote">Offerte</option>
              <option value="platform">Cadeauplatform</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Branche (optioneel)</Label>
            <select
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Geen specifieke branche</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button disabled={name.length < 2 || save.isPending} onClick={() => save.mutate()}>
            Aanmaken
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DuplicateDialog({
  pageId,
  name,
  industries,
}: {
  pageId: string;
  name: string;
  industries: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(`${name} (kopie)`);
  const [slug, setSlug] = useState("");
  const [industryId, setIndustryId] = useState("");
  const dup = useServerFn(duplicateLandingPage);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: () =>
      dup({
        data: {
          source_id: pageId,
          name: newName,
          slug: slugify(slug || newName),
          industry_id: industryId || null,
        },
      }),
    onSuccess: (r) => {
      toast.success("Pagina gedupliceerd");
      queryClient.invalidateQueries({ queryKey: ["landing", "pages"] });
      setOpen(false);
      navigate({ to: "/landingpages/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Copy className="mr-1 h-4 w-4" /> Dupliceren
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pagina dupliceren</DialogTitle>
          <DialogDescription>
            Alle blokken, CTA's, formuliervelden, producten en testimonials worden gekopieerd.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Naam</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nieuwe slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kerstgeschenken-zorg"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Branche</Label>
            <select
              value={industryId}
              onChange={(e) => setIndustryId(e.target.value)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Zelfde als origineel</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button
            disabled={newName.length < 2 || slugify(slug || newName).length < 2 || save.isPending}
            onClick={() => save.mutate()}
          >
            Dupliceren
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
