import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Boxes,
  Check,
  CheckCircle2,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  PRODUCT_IMAGE_TYPES,
  PRODUCT_IMAGE_TYPE_LABELS,
  type ProductImageType,
} from "@/lib/landing-visual";
import {
  PRODUCT_READINESS_LABELS,
  computeProductReadiness,
} from "@/lib/landing-content-readiness";
import { listLandingPages } from "@/lib/landing.functions";
import {
  addProductImage,
  applyProductSuggestions,
  deleteProductImage,
  deleteProductLibraryItem,
  getLandingContentReadiness,
  listProductLibrary,
  quickCreateProduct,
  suggestProductMetadata,
  updateProductImage,
  upsertProductLibraryItem,
} from "@/lib/landing-library.functions";

type ProductImage = {
  id: string;
  url: string;
  alt_text: string | null;
  image_type: ProductImageType;
  is_primary: boolean;
};

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  short_text: string | null;
  long_text: string | null;
  price_from: number | null;
  min_quantity: number | null;
  cta_label: string | null;
  product_url: string | null;
  personalization_options: string[];
  occasions: string[];
  industries: string[];
  tags: string[];
  notes: string | null;
  letterbox_friendly: boolean | null;
  individually_shippable: boolean | null;
  featured: boolean;
  active: boolean;
  image_url: string | null;
  image_alt: string | null;
  ai_suggestions: unknown;
  images: ProductImage[];
};
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/landingpages/producten")({
  head: () => ({
    meta: [{ title: "Product Library — SocialCockpit" }, { name: "robots", content: "noindex" }],
  }),
  component: ProductLibraryPage,
});

const readierBadge: Record<string, string> = {
  complete: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  partial: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  insufficient: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

function ProductLibraryPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listProductLibrary);
  const { data, isLoading } = useQuery({
    queryKey: ["landing-product-library"],
    queryFn: () => listFn(),
  });

  const categories = useMemo(
    () =>
      [...new Set((data?.products ?? []).map((p) => p.category).filter((c): c is string => !!c))].sort(),
    [data],
  );
  const industryNames = useMemo(
    () => (data?.industries ?? []).map((i: any) => i.name as string),
    [data],
  );

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [industry, setIndustry] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductRow | null>(null);
  const [imagesProduct, setImagesProduct] = useState<ProductRow | null>(null);
  const [aiProduct, setAiProduct] = useState<ProductRow | null>(null);

  const products = useMemo(() => {
    let list = data?.products ?? [];
    if (!showInactive) list = list.filter((p) => p.active);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? "").toLowerCase().includes(q) ||
          (p.short_text ?? "").toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (category) list = list.filter((p) => p.category === category);
    if (industry) list = list.filter((p) => p.industries.includes(industry));
    return list;
  }, [data, search, category, industry, showInactive]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["landing-product-library"] });

  return (
    <AppShell>
      <div className="space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Boxes className="h-6 w-6 text-primary" /> Product Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Eén bron van waarheid voor producten, personalisatie-opties en visuals — gebruikt door
              de AI Strategist en alle landingspagina's.
            </p>
          </div>
          <Button onClick={() => setQuickAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Snel toevoegen
          </Button>
        </div>

        <BouwReadinessPanel />

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Zoek op naam, SKU, tag…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Alle categorieën</option>
            {(data?.categories ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">Alle branches</option>
            {(data?.industryNames ?? []).map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} /> Toon inactief
          </label>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Nog geen producten. Voeg het eerste product toe met{" "}
              <strong>Snel toevoegen</strong> — alleen een foto en een naam is genoeg.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => setEditProduct(p)}
                onImages={() => setImagesProduct(p)}
                onAi={() => setAiProduct(p)}
                onChanged={refresh}
              />
            ))}
          </div>
        )}
      </div>

      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        categories={data?.categories ?? []}
        onCreated={refresh}
      />
      {editProduct && (
        <EditProductDialog
          product={editProduct}
          categories={data?.categories ?? []}
          industryNames={data?.industryNames ?? []}
          onClose={() => setEditProduct(null)}
          onSaved={refresh}
        />
      )}
      {imagesProduct && (
        <ProductImagesDialog
          product={imagesProduct}
          onClose={() => setImagesProduct(null)}
          onChanged={refresh}
        />
      )}
      {aiProduct && (
        <AiSuggestDialog product={aiProduct} onClose={() => setAiProduct(null)} onSaved={refresh} />
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------- Bouw readiness */

const REQUIRED_KEYS = ["product_data", "product_visuals", "personalization_examples"];
const NICE_KEYS = ["usps", "testimonials", "customer_logos", "industry_visuals", "performance_data"];

function BouwReadinessPanel() {
  const pagesFn = useServerFn(listLandingPages);
  const readinessFn = useServerFn(getLandingContentReadiness);

  const { data: pagesData } = useQuery({
    queryKey: ["landing-pages-list"],
    queryFn: () => pagesFn({}),
  });
  const bouwPage = useMemo(
    () =>
      (pagesData?.pages ?? []).find(
        (p: any) => /bouw/i.test(p.name ?? "") || /bouw/i.test(p.slug ?? ""),
      ) ?? null,
    [pagesData],
  );

  const { data: readiness, isLoading } = useQuery({
    queryKey: ["landing-readiness", bouwPage?.id ?? "global"],
    queryFn: () => readinessFn({ data: bouwPage ? { id: bouwPage.id } : {} }),
  });

  if (isLoading || !readiness) return null;

  const required = readiness.categories.filter((c) => REQUIRED_KEYS.includes(c.key));
  const nice = readiness.categories.filter((c) => NICE_KEYS.includes(c.key));
  const missingRequired = required.filter((c) => !c.ok);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {bouwPage ? `Wat mist de ${bouwPage.name}-pagina nog?` : "Content-readiness (globaal)"}
          <Badge variant="outline">{readiness.score}%</Badge>
          {missingRequired.length === 0 ? (
            <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Klaar voor een kwalitatieve AI-run
            </Badge>
          ) : (
            <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
              {missingRequired.length} vereiste categorie
              {missingRequired.length === 1 ? "" : "ën"} ontbreekt
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Vereist voor een goede generatie
          </p>
          <ul className="space-y-1.5">
            {required.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                )}
                <span>
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground"> — {c.value}</span>
                  {!c.ok && (
                    <span className="block text-xs text-muted-foreground">{c.advice}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nice-to-have
          </p>
          <ul className="space-y-1.5">
            {nice.map((c) => (
              <li key={c.key} className="flex items-start gap-2 text-sm">
                {c.ok ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                )}
                <span>
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground"> — {c.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------- product card */

function ProductCard({
  product,
  onEdit,
  onImages,
  onAi,
  onChanged,
}: {
  product: LandingProductRow;
  onEdit: () => void;
  onImages: () => void;
  onAi: () => void;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteProduct);
  const updateFn = useServerFn(upsertProduct);

  const del = useMutation({
    mutationFn: () => deleteFn({ data: { id: product.id } }),
    onSuccess: () => {
      toast.success("Product verwijderd");
      queryClient.invalidateQueries({ queryKey: ["landing-product-library"] });
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleActive = useMutation({
    mutationFn: () => updateFn({ data: { id: product.id, active: !product.active } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["landing-product-library"] }),
  });

  const readiness = computeProductReadiness({
    name: product.name,
    category: product.category,
    short_text: product.short_text,
    images: product.images,
  });
  const hasSuggestions = Boolean((product.ai_suggestions as any)?.fields);

  return (
    <Card className={product.active ? "" : "opacity-60"}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.image_alt ?? product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Images className="h-10 w-10" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          {product.featured && (
            <Badge className="bg-amber-500 text-white">
              <Star className="mr-1 h-3 w-3" /> Uitgelicht
            </Badge>
          )}
          <Badge variant="secondary">
            {product.images.length} foto{product.images.length === 1 ? "" : "'s"}
          </Badge>
        </div>
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              {product.category ?? "Geen categorie"}
              {product.price_from != null && ` · vanaf €${product.price_from}`}
              {product.min_quantity != null && ` · min. ${product.min_quantity} st.`}
            </p>
          </div>
          <Switch checked={product.active} onCheckedChange={() => toggleActive.mutate()} />
        </div>

        <div className="space-y-1">
          <Badge variant="outline" className={readierBadge[readiness.level]}>
            Readiness: {PRODUCT_READINESS_LABELS[readiness.level]}
          </Badge>
          <ul className="space-y-0.5 pt-1">
            {readiness.checks.map((c) => (
              <li key={c.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {c.ok ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <X className="h-3 w-3 text-rose-400" />
                )}
                {c.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-1">
          {product.personalization_options.slice(0, 4).map((o) => (
            <Badge key={o} variant="outline" className="text-xs">
              {o}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="mr-1 h-3 w-3" /> Bewerken
          </Button>
          <Button size="sm" variant="outline" onClick={onImages}>
            <Images className="mr-1 h-3 w-3" /> Foto's
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onAi}
            className={hasSuggestions ? "border-primary/50 text-primary" : ""}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {hasSuggestions ? "AI-voorstellen!" : "AI-gegevens"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              if (confirm(`Product "${product.name}" verwijderen?`)) del.mutate();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------- quick add */

type QuickImage = { file: File; image_type: ProductImageType; preview: string };

function QuickAddDialog({
  open,
  onOpenChange,
  categories,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: string[];
  onCreated: () => void;
}) {
  const createFn = useServerFn(quickCreateProduct);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [images, setImages] = useState<QuickImage[]>([]);

  const reset = () => {
    setName("");
    setCategory("");
    setNotes("");
    setProductUrl("");
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...images];
    for (const f of Array.from(list)) {
      if (next.length >= 8) break;
      next.push({ file: f, image_type: "product_cutout", preview: URL.createObjectURL(f) });
    }
    setImages(next);
  };

  const save = useMutation({
    mutationFn: async () => {
      const uploaded = [];
      for (const img of images) {
        const ext = img.file.name.split(".").pop() ?? "jpg";
        const path = `quick/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("landing-assets").upload(path, img.file);
        if (error) throw new Error(`Upload mislukt: ${error.message}`);
        uploaded.push({
          url: `/api/public/landing-asset?path=${encodeURIComponent(path)}`,
          image_type: img.image_type,
          alt_text: name,
        });
      }
      return createFn({
        data: {
          name,
          category: category || undefined,
          notes: notes || undefined,
          product_url: productUrl || undefined,
          images: uploaded,
        },
      });
    },
    onSuccess: () => {
      toast.success("Product toegevoegd aan de library");
      reset();
      onOpenChange(false);
      onCreated();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Product snel toevoegen</DialogTitle>
          <DialogDescription>
            Alleen een naam en foto's zijn vereist. Kies per foto het type — de AI Strategist
            gebruikt dat om de juiste visual op de juiste plek te zetten. De rest kan later (of via
            de AI-assistent).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Naam *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bv. Kerstpakket Deluxe" />
          </div>
          <div>
            <Label>Categorie</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Bv. Kerstpakketten"
              list="quick-categories"
            />
            <datalist id="quick-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Notities (intern)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Wat moet de AI weten over dit product?"
              rows={2}
            />
          </div>
          <div>
            <Label>Product-URL (bron)</Label>
            <Input
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://zoetbezorgen.nl/…"
            />
          </div>
          <div>
            <Label>Foto's * (max 8)</Label>
            <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/50">
              <Upload className="h-4 w-4" /> Kies afbeeldingen
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {images.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {images.map((img, i) => (
                  <div key={img.preview} className="space-y-1 rounded-md border p-2">
                    <div className="relative">
                      <img
                        src={img.preview}
                        alt=""
                        className="h-20 w-full rounded object-cover"
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5"
                        onClick={() => {
                          URL.revokeObjectURL(img.preview);
                          setImages(images.filter((_, j) => j !== i));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {i === 0 && (
                        <Badge className="absolute left-1 top-1 text-[10px]">Primair</Badge>
                      )}
                    </div>
                    <Select
                      value={img.image_type}
                      onValueChange={(v) =>
                        setImages(
                          images.map((x, j) =>
                            j === i ? { ...x, image_type: v as ProductImageType } : x,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_IMAGE_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {PRODUCT_IMAGE_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              De eerste foto wordt de primaire afbeelding. Foto's worden direct gekoppeld aan de
              Beeldbank — geen dubbele upload nodig.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => save.mutate()}
            disabled={!name.trim() || images.length === 0 || save.isPending}
          >
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Toevoegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------- edit product */

function EditProductDialog({
  product,
  categories,
  industryNames,
  onClose,
  onSaved,
}: {
  product: LandingProductRow;
  categories: string[];
  industryNames: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const updateFn = useServerFn(upsertProduct);
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku ?? "",
    category: product.category ?? "",
    short_text: product.short_text ?? "",
    long_text: product.long_text ?? "",
    price_from: product.price_from?.toString() ?? "",
    min_quantity: product.min_quantity?.toString() ?? "",
    cta_label: product.cta_label ?? "",
    product_url: product.product_url ?? "",
    personalization_options: product.personalization_options.join(", "),
    occasions: product.occasions.join(", "),
    industries: product.industries.join(", "),
    tags: product.tags.join(", "),
    notes: product.notes ?? "",
    letterbox_friendly: product.letterbox_friendly ?? false,
    individually_shippable: product.individually_shippable ?? false,
    featured: product.featured,
  });

  const save = useMutation({
    mutationFn: () =>
      updateFn({
        data: {
          id: product.id,
          name: form.name,
          sku: form.sku || null,
          category: form.category || null,
          short_text: form.short_text || null,
          long_text: form.long_text || null,
          price_from: form.price_from ? Number(form.price_from) : null,
          min_quantity: form.min_quantity ? Number(form.min_quantity) : null,
          cta_label: form.cta_label || null,
          product_url: form.product_url || null,
          personalization_options: splitList(form.personalization_options),
          occasions: splitList(form.occasions),
          industries: splitList(form.industries),
          tags: splitList(form.tags),
          notes: form.notes || null,
          letterbox_friendly: form.letterbox_friendly,
          individually_shippable: form.individually_shippable,
          featured: form.featured,
        },
      }),
    onSuccess: () => {
      toast.success("Product opgeslagen");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product bewerken</DialogTitle>
          <DialogDescription>
            Volledige commerciële en operationele gegevens. De AI Strategist gebruikt deze velden
            als feiten — vul ze daarom zorgvuldig in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Naam *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label>SKU</Label>
            <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
          </div>
          <div>
            <Label>Categorie</Label>
            <Input
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              list="edit-categories"
            />
            <datalist id="edit-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Product-URL</Label>
            <Input value={form.product_url} onChange={(e) => set("product_url", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Korte tekst</Label>
            <Input value={form.short_text} onChange={(e) => set("short_text", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Lange tekst</Label>
            <Textarea
              value={form.long_text}
              onChange={(e) => set("long_text", e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label>Prijs vanaf (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.price_from}
              onChange={(e) => set("price_from", e.target.value)}
            />
          </div>
          <div>
            <Label>Minimale afname</Label>
            <Input
              type="number"
              value={form.min_quantity}
              onChange={(e) => set("min_quantity", e.target.value)}
            />
          </div>
          <div>
            <Label>CTA-label</Label>
            <Input value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Personalisatie-opties (komma-gescheiden)</Label>
            <Input
              value={form.personalization_options}
              onChange={(e) => set("personalization_options", e.target.value)}
              placeholder="Logo bedrukking, Kaartje, Sleeve"
            />
          </div>
          <div>
            <Label>Gelegenheden</Label>
            <Input value={form.occasions} onChange={(e) => set("occasions", e.target.value)} />
          </div>
          <div>
            <Label>Branches</Label>
            <Input
              value={form.industries}
              onChange={(e) => set("industries", e.target.value)}
              list="edit-industries"
            />
            <datalist id="edit-industries">
              {industryNames.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <Label>Tags</Label>
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Interne notities</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.letterbox_friendly}
              onCheckedChange={(v) => set("letterbox_friendly", v)}
            />
            Brievenbusvriendelijk
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.individually_shippable}
              onCheckedChange={(v) => set("individually_shippable", v)}
            />
            Individueel verzendbaar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.featured} onCheckedChange={(v) => set("featured", v)} />
            Uitgelicht
          </label>
        </div>
        <DialogFooter>
          <Button onClick={() => save.mutate()} disabled={!form.name.trim() || save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function splitList(v: string): string[] {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------- images dialog */

function ProductImagesDialog({
  product,
  onClose,
  onChanged,
}: {
  product: LandingProductRow;
  onClose: () => void;
  onChanged: () => void;
}) {
  const addFn = useServerFn(addProductImage);
  const updateFn = useServerFn(updateProductImage);
  const deleteFn = useServerFn(deleteProductImage);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<ProductImageType>("product_lifestyle");
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const ext = f.name.split(".").pop() ?? "jpg";
        const path = `products/${product.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("landing-assets").upload(path, f);
        if (error) throw new Error(error.message);
        await addFn({
          data: {
            product_id: product.id,
            url: `/api/public/landing-asset?path=${encodeURIComponent(path)}`,
            image_type: uploadType,
            alt_text: product.name,
          },
        });
      }
      toast.success("Foto toegevoegd");
      onChanged();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Foto's van {product.name}</DialogTitle>
          <DialogDescription>
            Geef elke foto een type: vrijstaand (hero/cards), gepersonaliseerd (bewijs van
            personalisatie) of sfeer (lifestyle). De AI Strategist kiest visuals op basis van dit
            type. Foto's worden automatisch ook in de Beeldbank gezet.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={uploadType} onValueChange={(v) => setUploadType(v as ProductImageType)}>
            <SelectTrigger className="h-9 w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRODUCT_IMAGE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {PRODUCT_IMAGE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-2 text-sm text-muted-foreground hover:bg-muted/50">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Uploaden als dit type
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                void upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {product.images.map((img) => (
            <div key={img.id} className="space-y-2 rounded-md border p-2">
              <div className="relative">
                <img
                  src={img.url}
                  alt={img.alt_text ?? product.name}
                  className="h-32 w-full rounded object-cover"
                  loading="lazy"
                />
                {img.is_primary && (
                  <Badge className="absolute left-1 top-1 bg-primary text-[10px]">Primair</Badge>
                )}
              </div>
              <Select
                value={img.image_type}
                onValueChange={(v) =>
                  void updateFn({
                    data: { id: img.id, image_type: v as ProductImageType },
                  }).then(onChanged)
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_IMAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {PRODUCT_IMAGE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-7 text-xs"
                placeholder="Alt-tekst"
                value={altDrafts[img.id] ?? img.alt_text ?? ""}
                onChange={(e) => setAltDrafts((d) => ({ ...d, [img.id]: e.target.value }))}
                onBlur={() => {
                  const v = altDrafts[img.id];
                  if (v !== undefined && v !== (img.alt_text ?? "")) {
                    void updateFn({ data: { id: img.id, alt_text: v || null } }).then(onChanged);
                  }
                }}
              />
              <div className="flex gap-1">
                {!img.is_primary && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 flex-1 text-xs"
                    onClick={() =>
                      void updateFn({ data: { id: img.id, is_primary: true } }).then(onChanged)
                    }
                  >
                    Maak primair
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-destructive"
                  onClick={() => void deleteFn({ data: { id: img.id } }).then(onChanged)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {product.images.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nog geen foto's. Upload de eerste hierboven.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------- AI suggest dialog */

const SUGGESTION_LABELS: Record<string, string> = {
  short_text: "Korte tekst",
  long_text: "Lange tekst",
  category: "Categorie",
  tags: "Tags",
  industries: "Branches",
  occasions: "Gelegenheden",
  personalization_options: "Personalisatie-opties",
  image_alt: "Alt-tekst primaire foto",
};

function formatValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return String(v);
}

function AiSuggestDialog({
  product,
  onClose,
  onSaved,
}: {
  product: LandingProductRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const suggestFn = useServerFn(suggestProductMetadata);
  const applyFn = useServerFn(applyProductSuggestions);

  const existing = (product.ai_suggestions as any)?.fields as
    | Record<string, string | string[]>
    | undefined;
  const [fields, setFields] = useState<Record<string, string | string[]> | null>(existing ?? null);
  const [selected, setSelected] = useState<Set<string>>(new Set(Object.keys(existing ?? {})));

  const generate = useMutation({
    mutationFn: () => suggestFn({ data: { id: product.id } }),
    onSuccess: (res) => {
      const f = res.suggestions.fields as Record<string, string | string[]>;
      setFields(f);
      setSelected(new Set(Object.keys(f)));
      toast.success("AI-voorstellen gegenereerd — controleer en keur goed");
    },
    onError: (e) => toast.error(e.message),
  });

  const apply = useMutation({
    mutationFn: () => applyFn({ data: { id: product.id, fields: [...selected] as never } }),
    onSuccess: (res) => {
      toast.success(`${res.applied.length} veld${res.applied.length === 1 ? "" : "en"} toegepast`);
      onSaved();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const currentValues: Record<string, unknown> = {
    short_text: product.short_text,
    long_text: product.long_text,
    category: product.category,
    tags: product.tags,
    industries: product.industries,
    occasions: product.occasions,
    personalization_options: product.personalization_options,
    image_alt: product.image_alt,
  };

  const toggle = (key: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> AI-gegevens voor {product.name}
          </DialogTitle>
          <DialogDescription>
            De AI stelt commerciële teksten en classificatie voor op basis van naam, notities en
            foto's. <strong>Prijs, minimale afname en verzending worden nooit door AI
            voorgesteld</strong> — dat blijven jouw feiten. Niets wordt toegepast zonder jouw
            goedkeuring.
          </DialogDescription>
        </DialogHeader>

        {!fields ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <p className="text-sm text-muted-foreground">
              Nog geen voorstellen voor dit product. Genereer ze met Claude.
            </p>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Genereer voorstellen
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Vink aan welke voorstellen je wilt overnemen.
              </p>
              <Button size="sm" variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
                {generate.isPending ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-3 w-3" />
                )}
                Opnieuw genereren
              </Button>
            </div>
            {Object.entries(fields).map(([key, suggested]) => (
              <div key={key} className="rounded-md border p-3">
                <label className="flex items-center gap-2">
                  <Checkbox checked={selected.has(key)} onCheckedChange={() => toggle(key)} />
                  <span className="text-sm font-semibold">{SUGGESTION_LABELS[key] ?? key}</span>
                </label>
                <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Huidig
                    </p>
                    <p className="whitespace-pre-wrap text-muted-foreground">
                      {formatValue(currentValues[key])}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      Voorstel
                    </p>
                    <p className="whitespace-pre-wrap">{formatValue(suggested)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {fields && (
            <Button onClick={() => apply.mutate()} disabled={selected.size === 0 || apply.isPending}>
              {apply.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selected.size} geselecteerde veld{selected.size === 1 ? "" : "en"} toepassen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
