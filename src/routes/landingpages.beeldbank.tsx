/**
 * Central Landing Asset Library + visual-brief overview.
 *
 * Every image the Landing Page Engine and the AI Strategist may use lives here,
 * typed and tagged. Visual briefs are what Claude asked for but does not exist
 * yet — they are the shot list for photography or (later) AI image generation.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ImageIcon, Images, Trash2, Upload, XCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import {
  createAssetUploadUrl,
  deleteLandingAsset,
  getLandingContentReadiness,
  listLandingAssets,
  listVisualBriefs,
  upsertLandingAsset,
} from "@/lib/landing-library.functions";
import type { LandingAssetRow, LandingVisualBriefRow } from "@/lib/landing-shared";
import { uploadLandingFile } from "@/lib/landing-upload";
import { ASSET_TYPES, VISUAL_TYPE_LABELS, type AssetType } from "@/lib/landing-visual";

export const Route = createFileRoute("/landingpages/beeldbank")({
  head: () => ({
    meta: [
      { title: "Beeldbank — SocialCockpit" },
      {
        name: "description",
        content:
          "Centrale beeldbank voor landingspagina's: getypeerde visuals, goedkeuring en de shotlist met visual briefs van de AI Strategist.",
      },
      { property: "og:title", content: "Beeldbank — SocialCockpit" },
      {
        property: "og:description",
        content: "Beheer alle visuals en visual briefs voor je B2B landingspagina's.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssetLibraryPage,
});

function AssetLibraryPage() {
  const listFn = useServerFn(listLandingAssets);
  const briefsFn = useServerFn(listVisualBriefs);
  const readinessFn = useServerFn(getLandingContentReadiness);

  const assetsQuery = useQuery({ queryKey: ["landing", "assets"], queryFn: () => listFn({}) });
  const briefsQuery = useQuery({ queryKey: ["landing", "briefs"], queryFn: () => briefsFn({}) });
  const readinessQuery = useQuery({
    queryKey: ["landing", "readiness"],
    queryFn: () => readinessFn({}),
  });

  const assets = (assetsQuery.data?.assets ?? []) as LandingAssetRow[];
  const briefs = (briefsQuery.data?.briefs ?? []) as LandingVisualBriefRow[];
  const readiness = readinessQuery.data?.readiness as
    | { score: number; label: string; blockers?: string[]; recommendations?: string[] }
    | undefined;

  return (
    <AppShell>
      <PageHeader
        title="Beeldbank"
        subtitle="Zonder getypeerde visuals blijft een AI-pagina tekstueel. Upload hier alles wat de engine mag gebruiken."
        actions={<UploadAssetDialog products={assetsQuery.data?.products ?? []} />}
      />

      {readiness && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Content Readiness — {readiness.score}/100</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{readiness.label}</p>
            {(readiness.blockers ?? []).length > 0 && (
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
                {(readiness.blockers ?? []).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="assets">
        <TabsList>
          <TabsTrigger value="assets">Visuals ({assets.length})</TabsTrigger>
          <TabsTrigger value="briefs">Visual briefs ({briefs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="pt-4">
          {assetsQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : assets.length === 0 ? (
            <EmptyState />
          ) : (
            <AssetGrid assets={assets} />
          )}
        </TabsContent>

        <TabsContent value="briefs" className="pt-4">
          {briefsQuery.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : briefs.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-12 text-center text-sm">
                Nog geen visual briefs. Deze ontstaan zodra je een AI-voorstel toepast waarin Claude
                beeld vraagt dat nog niet bestaat.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {briefs.map((brief) => (
                <BriefCard key={brief.id} brief={brief} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <Images className="text-muted-foreground h-8 w-8" />
        <p className="font-medium">Beeldbank is leeg</p>
        <p className="text-muted-foreground max-w-md text-sm">
          Upload productfoto's, sfeerbeeld, personalisatievoorbeelden en klantlogo's. Elke visual
          krijgt een type, zodat de engine automatisch het juiste beeld in het juiste slot plaatst.
        </p>
      </CardContent>
    </Card>
  );
}

function AssetGrid({ assets }: { assets: LandingAssetRow[] }) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = useMemo(
    () => (filter === "all" ? assets : assets.filter((a) => a.asset_type === filter)),
    [assets, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label className="text-xs">Filter op type</Label>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle typen</SelectItem>
            {ASSET_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {VISUAL_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {filtered.map((asset) => (
          <AssetCard key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}

function AssetCard({ asset }: { asset: LandingAssetRow }) {
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertLandingAsset);
  const removeFn = useServerFn(deleteLandingAsset);
  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["landing", "assets"] }),
      qc.invalidateQueries({ queryKey: ["landing", "readiness"] }),
    ]);

  const setApproval = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      saveFn({
        data: {
          id: asset.id,
          name: asset.name,
          asset_type: asset.asset_type as AssetType,
          approval_status: status,
        },
      }),
    onSuccess: async () => {
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="overflow-hidden">
      <img
        src={asset.url}
        alt={asset.alt_text ?? asset.name}
        className="aspect-square w-full object-cover"
        loading="lazy"
      />
      <CardContent className="space-y-2 pt-3">
        <p className="truncate text-sm font-medium">{asset.name}</p>
        <p className="text-muted-foreground text-xs">
          {VISUAL_TYPE_LABELS[asset.asset_type as AssetType] ?? asset.asset_type}
        </p>
        <div className="flex flex-wrap gap-1">
          <Badge variant={asset.approval_status === "approved" ? "secondary" : "outline"}>
            {asset.approval_status === "approved"
              ? "Goedgekeurd"
              : asset.approval_status === "rejected"
                ? "Afgekeurd"
                : "Wacht op goedkeuring"}
          </Badge>
          {!asset.active && <Badge variant="destructive">Inactief</Badge>}
        </div>
        <div className="flex gap-1 pt-1">
          {asset.approval_status !== "approved" && (
            <Button size="sm" variant="ghost" onClick={() => setApproval.mutate("approved")}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {asset.approval_status !== "rejected" && (
            <Button size="sm" variant="ghost" onClick={() => setApproval.mutate("rejected")}>
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (!confirm(`"${asset.name}" verwijderen?`)) return;
              await removeFn({ data: { id: asset.id } });
              await refresh();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BriefCard({ brief }: { brief: LandingVisualBriefRow }) {
  return (
    <Card>
      <CardContent className="space-y-2 pt-5 text-sm">
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold">{brief.title}</p>
          <Badge variant={brief.asset_status === "missing" ? "destructive" : "secondary"}>
            {brief.asset_status === "missing" ? "Beeld ontbreekt" : "Beeld aanwezig"}
          </Badge>
        </div>
        <p className="text-muted-foreground text-xs">
          {VISUAL_TYPE_LABELS[brief.visual_type as AssetType] ?? brief.visual_type}
          {brief.block_type ? ` · ${brief.block_type}` : ""}
        </p>
        {brief.purpose && <p className="text-muted-foreground">{brief.purpose}</p>}
        {brief.brief_text && (
          <p className="bg-muted/50 rounded-md p-3 text-xs leading-relaxed">{brief.brief_text}</p>
        )}
        <div className="text-muted-foreground flex flex-wrap gap-1 text-xs">
          {brief.composition && <Badge variant="outline">{brief.composition}</Badge>}
          {brief.aspect_ratio && <Badge variant="outline">{brief.aspect_ratio}</Badge>}
          {brief.desktop_position && <Badge variant="outline">Desktop: {brief.desktop_position}</Badge>}
          {brief.mobile_position && <Badge variant="outline">Mobiel: {brief.mobile_position}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ upload */

function UploadAssetDialog({ products }: { products: { id: string; name: string }[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [assetType, setAssetType] = useState<AssetType>("product_lifestyle");
  const [productId, setProductId] = useState<string>("none");
  const qc = useQueryClient();
  const uploadUrlFn = useServerFn(createAssetUploadUrl);
  const saveFn = useServerFn(upsertLandingAsset);

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const { path, mimeType } = await uploadLandingFile(file, uploadUrlFn as never);
        await saveFn({
          data: {
            name: file.name.replace(/\.[^.]+$/, ""),
            url: path,
            storage_path: path,
            mime_type: mimeType,
            asset_type: assetType,
            product_id: productId === "none" ? null : productId,
            source: "upload",
            approval_status: "approved",
            active: true,
          },
        });
      }
    },
    onSuccess: async () => {
      toast.success("Visuals toegevoegd");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["landing", "assets"] }),
        qc.invalidateQueries({ queryKey: ["landing", "readiness"] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
        <SelectTrigger className="w-52">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ASSET_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {VISUAL_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={productId} onValueChange={setProductId}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Geen product" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Geen product</SelectItem>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) upload.mutate(files);
        }}
      />
      <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
        {upload.isPending ? (
          <>
            <ImageIcon className="mr-1.5 h-4 w-4" /> Uploaden…
          </>
        ) : (
          <>
            <Upload className="mr-1.5 h-4 w-4" /> Visuals uploaden
          </>
        )}
      </Button>
    </div>
  );
}
