/**
 * Central Product Library.
 *
 * One product record per product, reused by every landing page and by the AI
 * Landing Page Strategist. Hard facts (price, minimum quantity, shipping) are
 * only ever entered by a human; AI may propose enrichment, never overwrite.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Package, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import {
  addProductImage,
  createAssetUploadUrl,
  deleteProductImage,
  deleteProductLibraryItem,
  listProductLibrary,
  quickCreateProduct,
  updateProductImage,
  upsertProductLibraryItem,
} from "@/lib/landing-library.functions";
import { PRODUCT_OCCASIONS, type LandingProductRow } from "@/lib/landing-shared";
import { uploadLandingFile } from "@/lib/landing-upload";
import { PRODUCT_IMAGE_TYPE_LABELS } from "@/lib/landing-visual";

export const Route = createFileRoute("/landingpages/producten")({
  head: () => ({
    meta: [
      { title: "Productbibliotheek — SocialCockpit" },
      {
        name: "description",
        content:
          "Beheer alle zakelijke geschenkproducten centraal: teksten, prijzen, minimale afname, personalisatie en productfoto's.",
      },
      { property: "og:title", content: "Productbibliotheek — SocialCockpit" },
      {
        property: "og:description",
        content: "Eén centrale productbibliotheek voor alle B2B landingspagina's.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductLibraryPage,
});

function toList(value: string) {
  return value
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

function ProductLibraryPage() {
  const listFn = useServerFn(listProductLibrary);
  const query = useQuery({ queryKey: ["landing", "products"], queryFn: () => listFn({}) });
  const products = (query.data?.products ?? []) as LandingProductRow[];

  return (
    <AppShell>
      <PageHeader
        title="Productbibliotheek"
        subtitle="Eén bron voor alle landingspagina's én voor de AI Strategist. Voeg snel toe met naam en foto's; verrijk later."
        actions={<QuickAddDialog />}
      />

      {query.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Package className="text-muted-foreground h-8 w-8" />
            <p className="font-medium">Nog geen producten</p>
            <p className="text-muted-foreground max-w-md text-sm">
              Zonder producten met foto's kan de AI Strategist geen visueel sterke pagina bouwen.
              Begin met je 4 tot 8 belangrijkste zakelijke geschenken.
            </p>
            <QuickAddDialog />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function ProductCard({ product }: { product: LandingProductRow }) {
  const images = product.images ?? [];
  const primary = images.find((i) => i.is_primary) ?? images[0];
  const qc = useQueryClient();
  const removeFn = useServerFn(deleteProductLibraryItem);
  const remove = useMutation({
    mutationFn: () => removeFn({ data: { id: product.id } }),
    onSuccess: async () => {
      toast.success("Product verwijderd");
      await qc.invalidateQueries({ queryKey: ["landing", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="overflow-hidden">
      {primary ? (
        <img
          src={primary.url}
          alt={primary.alt_text ?? product.name}
          className="aspect-4/3 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="border-primary/40 bg-primary/5 text-primary aspect-4/3 flex flex-col items-center justify-center gap-1 border-b-2 border-dashed text-xs font-semibold">
          <ImagePlus className="h-5 w-5" />
          Foto ontbreekt
        </div>
      )}
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{product.name}</p>
            <p className="text-muted-foreground text-xs">
              {product.category ?? "Geen categorie"} · {images.length} foto
              {images.length === 1 ? "" : "'s"}
            </p>
          </div>
          {product.featured && <Badge variant="secondary">Uitgelicht</Badge>}
        </div>
        {product.short_text && <p className="text-muted-foreground text-sm">{product.short_text}</p>}
        <div className="text-muted-foreground flex flex-wrap gap-1.5 text-xs">
          {product.min_quantity && <Badge variant="outline">Vanaf {product.min_quantity} st.</Badge>}
          {product.price_from != null && (
            <Badge variant="outline">v.a. € {Number(product.price_from).toFixed(2)}</Badge>
          )}
          {product.letterbox_friendly && <Badge variant="outline">Brievenbus</Badge>}
          {product.individually_shippable && <Badge variant="outline">Los verzendbaar</Badge>}
          {!product.active && <Badge variant="destructive">Inactief</Badge>}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <ProductEditDialog product={product} />
          <ProductImagesDialog product={product} />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (confirm(`"${product.name}" verwijderen?`)) remove.mutate();
            }}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Verwijderen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- quick add */

function QuickAddDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const createFn = useServerFn(quickCreateProduct);
  const uploadUrlFn = useServerFn(createAssetUploadUrl);
  const assetFn = useServerFn(upsertProductLibraryItem);
  void assetFn;

  const save = useMutation({
    mutationFn: async () => {
      const uploads = [] as { url: string; storage_path: string; mime_type: string }[];
      for (const file of files.slice(0, 5)) {
        const { path, mimeType } = await uploadLandingFile(file, uploadUrlFn as never);
        uploads.push({ url: "", storage_path: path, mime_type: mimeType });
      }
      return createFn({
        data: {
          name,
          category: category || null,
          min_quantity: minQuantity ? Number(minQuantity) : null,
          price_from: priceFrom ? Number(priceFrom.replace(",", ".")) : null,
          product_url: productUrl || null,
          notes: notes || null,
          images: uploads.map((u) => ({
            url: u.storage_path,
            storage_path: u.storage_path,
            mime_type: u.mime_type,
            alt_text: name,
          })),
        },
      });
    },
    onSuccess: async () => {
      toast.success("Product toegevoegd");
      setOpen(false);
      setName("");
      setFiles([]);
      setCategory("");
      setMinQuantity("");
      setPriceFrom("");
      setProductUrl("");
      setNotes("");
      await qc.invalidateQueries({ queryKey: ["landing", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" /> Product toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product snel toevoegen</DialogTitle>
          <DialogDescription>
            Alleen naam is verplicht. Voeg foto's toe zodat pagina's visueel sterk kunnen worden.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Naam *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Chocoladebox groot" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categorie</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Chocolade" />
            </div>
            <div className="space-y-1.5">
              <Label>Minimale afname</Label>
              <Input
                inputMode="numeric"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                placeholder="25"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prijs vanaf (€)</Label>
              <Input value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder="8,95" />
            </div>
            <div className="space-y-1.5">
              <Label>Product-URL</Label>
              <Input value={productUrl} onChange={(e) => setProductUrl(e.target.value)} placeholder="https://" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Interne notities</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Foto's (max. 5)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" />
              {files.length ? `${files.length} geselecteerd` : "Bestanden kiezen"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={name.trim().length < 2 || save.isPending}
          >
            {save.isPending ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------ full editing */

function ProductEditDialog({ product }: { product: LandingProductRow }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku ?? "",
    category: product.category ?? "",
    short_text: product.short_text ?? "",
    long_text: product.long_text ?? "",
    min_quantity: product.min_quantity?.toString() ?? "",
    price_from: product.price_from?.toString() ?? "",
    personalization_options: (product.personalization_options ?? []).join(", "),
    occasions: (product.occasions ?? []).join(", "),
    industries: (product.industries ?? []).join(", "),
    tags: (product.tags ?? []).join(", "),
    letterbox_friendly: Boolean(product.letterbox_friendly),
    individually_shippable: Boolean(product.individually_shippable),
    featured: Boolean(product.featured),
    active: product.active !== false,
    product_url: product.product_url ?? "",
    notes: product.notes ?? "",
  });
  const qc = useQueryClient();
  const saveFn = useServerFn(upsertProductLibraryItem);
  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: product.id,
          name: form.name,
          sku: form.sku || null,
          category: form.category || null,
          short_text: form.short_text || null,
          long_text: form.long_text || null,
          min_quantity: form.min_quantity ? Number(form.min_quantity) : null,
          price_from: form.price_from ? Number(form.price_from.replace(",", ".")) : null,
          personalization_options: toList(form.personalization_options),
          occasions: toList(form.occasions),
          industries: toList(form.industries),
          tags: toList(form.tags),
          letterbox_friendly: form.letterbox_friendly,
          individually_shippable: form.individually_shippable,
          featured: form.featured,
          active: form.active,
          product_url: form.product_url || null,
          notes: form.notes || null,
        },
      }),
    onSuccess: async () => {
      toast.success("Product bijgewerkt");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ["landing", "products"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1.5 h-3.5 w-3.5" /> Bewerken
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.name}</DialogTitle>
          <DialogDescription>
            Deze gegevens gebruikt de AI Strategist om producten te kiezen en te beschrijven.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Naam">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="SKU">
            <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </Field>
          <Field label="Categorie">
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
          </Field>
          <Field label="Minimale afname">
            <Input
              inputMode="numeric"
              value={form.min_quantity}
              onChange={(e) => set("min_quantity", e.target.value)}
            />
          </Field>
          <Field label="Prijs vanaf (€)">
            <Input value={form.price_from} onChange={(e) => set("price_from", e.target.value)} />
          </Field>
          <Field label="Product-URL">
            <Input value={form.product_url} onChange={(e) => set("product_url", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Korte tekst">
              <Textarea
                rows={2}
                value={form.short_text}
                onChange={(e) => set("short_text", e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Lange tekst">
              <Textarea
                rows={4}
                value={form.long_text}
                onChange={(e) => set("long_text", e.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Personalisatie-opties (komma's)">
              <Input
                value={form.personalization_options}
                onChange={(e) => set("personalization_options", e.target.value)}
                placeholder="Logo op sleeve, Kaartje met eigen tekst"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label={`Gelegenheden (bv. ${PRODUCT_OCCASIONS.slice(0, 3).join(", ")})`}>
              <Input value={form.occasions} onChange={(e) => set("occasions", e.target.value)} />
            </Field>
          </div>
          <Field label="Branches (komma's)">
            <Input value={form.industries} onChange={(e) => set("industries", e.target.value)} />
          </Field>
          <Field label="Tags (komma's)">
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Interne notities">
              <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </Field>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Toggle
              label="Past in de brievenbus"
              checked={form.letterbox_friendly}
              onChange={(v) => set("letterbox_friendly", v)}
            />
            <Toggle
              label="Individueel verzendbaar naar medewerkers"
              checked={form.individually_shippable}
              onChange={(v) => set("individually_shippable", v)}
            />
            <Toggle
              label="Uitgelicht product"
              checked={form.featured}
              onChange={(v) => set("featured", v)}
            />
            <Toggle label="Actief" checked={form.active} onChange={(v) => set("active", v)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Opslaan…" : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      {label}
    </label>
  );
}

/* ------------------------------------------------------------ product images */

function ProductImagesDialog({ product }: { product: LandingProductRow }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const uploadUrlFn = useServerFn(createAssetUploadUrl);
  const addFn = useServerFn(addProductImage);
  const updateFn = useServerFn(updateProductImage);
  const deleteFn = useServerFn(deleteProductImage);
  const images = product.images ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ["landing", "products"] });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        const { path, mimeType } = await uploadLandingFile(file, uploadUrlFn as never);
        await addFn({
          data: {
            product_id: product.id,
            url: path,
            storage_path: path,
            mime_type: mimeType,
            image_type: "product_cutout",
            alt_text: product.name,
          },
        });
      }
    },
    onSuccess: async () => {
      toast.success("Foto's toegevoegd");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ImagePlus className="mr-1.5 h-3.5 w-3.5" /> Foto's ({images.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foto's — {product.name}</DialogTitle>
          <DialogDescription>
            Meerdere beeldtypen per product maken visueel sterke pagina's mogelijk.
          </DialogDescription>
        </DialogHeader>
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
        <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
          <Upload className="mr-1.5 h-4 w-4" />
          {upload.isPending ? "Uploaden…" : "Foto's uploaden"}
        </Button>
        <div className="grid gap-3 sm:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="space-y-2">
              <img
                src={img.url}
                alt={img.alt_text ?? product.name}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <p className="text-muted-foreground text-xs">
                {PRODUCT_IMAGE_TYPE_LABELS[img.image_type] ?? img.image_type}
              </p>
              <div className="flex gap-1">
                {!img.is_primary && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await updateFn({ data: { id: img.id, is_primary: true } });
                      await refresh();
                    }}
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    await deleteFn({ data: { id: img.id } });
                    await refresh();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
