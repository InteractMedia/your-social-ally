/**
 * Visual slot editor (V1.8B): makes a section's planned-but-missing visual
 * fillable from the page editor. Shows the AI visual brief so the image can be
 * produced externally, plus actions to pick an existing approved asset or
 * upload a new one. AI image generation is intentionally NOT offered here —
 * no provider is coupled yet, and AI images would need approval first anyway.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImageIcon, ImagePlus, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createAssetUploadUrl,
  listLandingAssets,
  updateSectionVisual,
  upsertLandingAsset,
} from "@/lib/landing-library.functions";
import { assetPublicUrl, uploadLandingFile } from "@/lib/landing-upload";
import {
  VISUAL_TYPE_LABELS,
  visualIsPlanned,
  type AssetType,
  type SectionVisual,
  type VisualType,
} from "@/lib/landing-visual";

type AssetRow = {
  id: string;
  name: string;
  url: string;
  asset_type: string;
  alt_text: string | null;
  approval_status: string;
  active: boolean;
};

export function VisualSlotEditor({
  sectionId,
  pageId,
  visual,
  imageUrl,
  imageAlt,
}: {
  sectionId: string;
  pageId: string;
  visual: SectionVisual | undefined | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
}) {
  const queryClient = useQueryClient();
  const listAssets = useServerFn(listLandingAssets);
  const uploadUrlFn = useServerFn(createAssetUploadUrl);
  const saveAsset = useServerFn(upsertLandingAsset);
  const saveVisual = useServerFn(updateSectionVisual);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const assetsQuery = useQuery({
    queryKey: ["landing", "assets"],
    queryFn: () => listAssets({ data: {} as never }),
    enabled: pickerOpen,
  });

  const linkAsset = useMutation({
    mutationFn: async (asset: AssetRow) => {
      await saveVisual({
        data: {
          section_id: sectionId,
          page_id: pageId,
          visual: {
            ...(visual ?? {}),
            asset_id: asset.id,
            asset_status: "existing",
          } as never,
          image_url: assetPublicUrl(asset.id),
          image_alt: asset.alt_text ?? asset.name,
        },
      });
    },
    onSuccess: async () => {
      toast.success("Beeld gekoppeld aan dit slot");
      setPickerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["landing", "page", pageId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { path, mimeType } = await uploadLandingFile(file, uploadUrlFn as never);
      const saved = await saveAsset({
        data: {
          name: file.name.replace(/\.[^.]+$/, ""),
          url: path,
          storage_path: path,
          mime_type: mimeType,
          asset_type: (visual?.visual_type ?? "product_lifestyle") as AssetType,
          source: "upload",
          approval_status: "approved",
          active: true,
          alt_text: imageAlt ?? null,
        },
      });
      await saveVisual({
        data: {
          section_id: sectionId,
          page_id: pageId,
          visual: {
            ...(visual ?? {}),
            asset_id: saved.id,
            asset_status: "existing",
          } as never,
          image_url: assetPublicUrl(saved.id),
          image_alt: imageAlt ?? file.name.replace(/\.[^.]+$/, ""),
        },
      });
    },
    onSuccess: async () => {
      toast.success("Beeld geüpload en gekoppeld");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["landing", "page", pageId] }),
        queryClient.invalidateQueries({ queryKey: ["landing", "assets"] }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!visualIsPlanned(visual)) return null;
  const missing = !imageUrl;
  const approvedAssets = ((assetsQuery.data?.assets ?? []) as AssetRow[]).filter(
    (a) => a.active !== false && a.approval_status === "approved",
  );

  return (
    <div
      className={
        missing
          ? "border-warning/60 bg-warning/10 space-y-3 rounded-lg border border-dashed p-4"
          : "space-y-3 rounded-lg border p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <ImageIcon className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">
          Visual slot — {VISUAL_TYPE_LABELS[visual?.visual_type as VisualType] ?? visual?.visual_type}
        </span>
        {missing ? (
          <Badge variant="outline" className="border-warning text-warning-foreground">
            Vereist beeld ontbreekt
          </Badge>
        ) : (
          <Badge variant="secondary">Gevuld</Badge>
        )}
      </div>

      {imageUrl && (
        <img
          src={imageUrl}
          alt={imageAlt ?? "Sectiebeeld"}
          className="h-28 w-auto rounded-md border object-cover"
        />
      )}

      {(visual?.purpose || visual?.composition || visual?.visual_brief) && (
        <div className="text-muted-foreground space-y-1 text-xs">
          {visual?.purpose && (
            <p>
              <span className="text-foreground font-medium">Doel:</span> {visual.purpose}
            </p>
          )}
          {visual?.composition && (
            <p>
              <span className="text-foreground font-medium">Compositie:</span> {visual.composition}
            </p>
          )}
          {visual?.visual_brief && (
            <p>
              <span className="text-foreground font-medium">Visual brief:</span>{" "}
              {visual.visual_brief}
            </p>
          )}
          <p>
            <span className="text-foreground font-medium">Positie:</span> desktop{" "}
            {visual?.desktop_position ?? "-"} · mobiel {visual?.mobile_position ?? "-"} ·{" "}
            {visual?.aspect_ratio ?? "4:3"}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          disabled={linkAsset.isPending || upload.isPending}
        >
          <ImagePlus className="mr-1 h-3.5 w-3.5" /> Bestaand beeld kiezen
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={linkAsset.isPending || upload.isPending}
        >
          <Upload className="mr-1 h-3.5 w-3.5" /> Beeld uploaden
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        AI-beeldgeneratie is nog niet gekoppeld. Maak het beeld extern op basis van de visual brief
        hierboven en upload het daarna hier — een AI-beeld gaat nooit automatisch live.
      </p>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kies een goedgekeurd beeld</DialogTitle>
          </DialogHeader>
          {assetsQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">Beeldbank laden…</p>
          ) : approvedAssets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Geen goedgekeurde assets gevonden. Upload eerst een beeld.
            </p>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto md:grid-cols-4">
              {approvedAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => linkAsset.mutate(asset)}
                  className="group space-y-1 rounded-lg border p-2 text-left transition hover:border-primary"
                >
                  <img
                    src={assetPublicUrl(asset.id)}
                    alt={asset.alt_text ?? asset.name}
                    className="aspect-square w-full rounded-md object-cover"
                    loading="lazy"
                  />
                  <p className="truncate text-xs font-medium">{asset.name}</p>
                  <p className="text-muted-foreground text-[10px]">
                    {VISUAL_TYPE_LABELS[asset.asset_type as VisualType] ?? asset.asset_type}
                  </p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
