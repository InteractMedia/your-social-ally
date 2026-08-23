import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Eye,
  History,
  Plus,
  Rocket,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  BLOCK_LABELS,
  BLOCK_TYPES,
  DEFAULT_FORM_FIELDS,
  FIELD_STATE_LABELS,
  LANDING_STATUS_LABELS,
  landingPath,
  type BlockContent,
  type BlockType,
  type FieldState,
  type FormFieldConfig,
  type LandingStatus,
} from "@/lib/landing-shared";
import {
  addLandingSection,
  deleteLandingSection,
  deleteLandingTestimonial,
  getLandingAnalytics,
  getLandingPage,
  publishLandingPage,
  reorderLandingSections,
  rollbackLandingPage,
  setLandingPageProducts,
  updateLandingForm,
  updateLandingPage,
  updateLandingSection,
  upsertLandingProduct,
  upsertLandingTestimonial,
} from "@/lib/landing.functions";

export const Route = createFileRoute("/landingpages/$id")({
  head: () => ({
    meta: [
      { title: "Landingspagina bewerken — SocialCockpit" },
      {
        name: "description",
        content:
          "Bewerk blokken, formuliervelden, producten en SEO van een B2B landingspagina en publiceer een nieuwe versie.",
      },
      { property: "og:title", content: "Landingspagina bewerken — SocialCockpit" },
      { property: "og:description", content: "Blokken, formulier, producten en SEO beheren." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPageEditor,
});

function LandingPageEditor() {
  const { id } = Route.useParams();
  const fn = useServerFn(getLandingPage);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["landing", "page", id],
    queryFn: () => fn({ data: { id } }),
  });
  const publish = useServerFn(publishLandingPage);
  const publishMutation = useMutation({
    mutationFn: () => publish({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`Versie ${r.version.version_number} gepubliceerd`);
      queryClient.invalidateQueries({ queryKey: ["landing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const page = query.data?.page;
  const path = page ? landingPath(page.funnel_type, page.slug) : "/";

  return (
    <AppShell>
      <PageHeader
        title={page?.name ?? "Landingspagina"}
        subtitle={
          page
            ? `${path} · ${LANDING_STATUS_LABELS[page.status as LandingStatus] ?? page.status} · versie ${page.version_counter}`
            : undefined
        }
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link to="/landingpages">
                <ArrowLeft className="mr-1 h-4 w-4" /> Overzicht
              </Link>
            </Button>
            {page && (
              <>
                <Button asChild variant="ghost" size="sm">
                  <a href={`${path}?preview=${page.preview_token}`} target="_blank" rel="noreferrer">
                    <Eye className="mr-1 h-4 w-4" /> Preview
                  </a>
                </Button>
                <Button size="sm" disabled={publishMutation.isPending} onClick={() => publishMutation.mutate()}>
                  <Rocket className="mr-1 h-4 w-4" /> Publiceren
                </Button>
              </>
            )}
          </>
        }
      />

      {query.isLoading || !page ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs defaultValue="content">
          <TabsList>
            <TabsTrigger value="content">Inhoud</TabsTrigger>
            <TabsTrigger value="form">Formulier</TabsTrigger>
            <TabsTrigger value="products">Producten & cases</TabsTrigger>
            <TabsTrigger value="performance">Prestaties</TabsTrigger>
            <TabsTrigger value="settings">Instellingen & SEO</TabsTrigger>
            <TabsTrigger value="versions">Versies</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-6 space-y-4">
            <SectionsEditor pageId={id} sections={query.data!.sections} />
          </TabsContent>

          <TabsContent value="form" className="mt-6">
            <FormEditor pageId={id} form={query.data!.form} />
          </TabsContent>

          <TabsContent value="products" className="mt-6 space-y-6">
            <ProductsEditor
              pageId={id}
              products={query.data!.products}
              selected={query.data!.selectedProductIds}
            />
            <TestimonialsEditor pageId={id} testimonials={query.data!.testimonials} />
          </TabsContent>

          <TabsContent value="performance" className="mt-6">
            <PerformancePanel pageId={id} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <SettingsEditor page={page} industries={query.data!.industries} />
          </TabsContent>

          <TabsContent value="versions" className="mt-6">
            <VersionsPanel pageId={id} versions={query.data!.versions} />
          </TabsContent>
        </Tabs>
      )}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ content */

type SectionRow = {
  id: string;
  block_type: string;
  sort_order: number;
  enabled: boolean;
  use_global: boolean;
  global_key: string | null;
  variant_key: string;
  content: unknown;
};

function SectionsEditor({ pageId, sections }: { pageId: string; sections: SectionRow[] }) {
  const queryClient = useQueryClient();
  const update = useServerFn(updateLandingSection);
  const add = useServerFn(addLandingSection);
  const remove = useServerFn(deleteLandingSection);
  const reorder = useServerFn(reorderLandingSections);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["landing", "page", pageId] });

  const move = async (index: number, direction: -1 | 1) => {
    const order = sections.map((s) => s.id);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target]!, order[index]!];
    await reorder({ data: { page_id: pageId, order } });
    invalidate();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Blokken</CardTitle>
          <div className="flex items-center gap-2">
            <select
              id="add-block"
              defaultValue=""
              onChange={async (e) => {
                if (!e.target.value) return;
                await add({ data: { page_id: pageId, block_type: e.target.value } });
                e.target.value = "";
                invalidate();
              }}
              className="border-input bg-background h-9 rounded-md border px-2 text-xs"
            >
              <option value="">Blok toevoegen…</option>
              {BLOCK_TYPES.map((b) => (
                <option key={b} value={b}>
                  {BLOCK_LABELS[b]}
                </option>
              ))}
            </select>
            <Plus className="text-muted-foreground h-4 w-4" />
          </div>
        </CardHeader>
      </Card>

      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          pageId={pageId}
          section={section}
          onToggle={async (enabled) => {
            await update({ data: { id: section.id, page_id: pageId, enabled } });
            invalidate();
          }}
          onSave={async (content) => {
            await update({ data: { id: section.id, page_id: pageId, content } });
            toast.success("Blok opgeslagen");
            invalidate();
          }}
          onDelete={async () => {
            await remove({ data: { id: section.id } });
            invalidate();
          }}
          onMove={(d) => move(index, d)}
        />
      ))}
    </>
  );
}

function SectionCard({
  section,
  onToggle,
  onSave,
  onDelete,
  onMove,
}: {
  pageId: string;
  section: SectionRow;
  onToggle: (v: boolean) => void;
  onSave: (content: BlockContent) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [content, setContent] = useState<BlockContent>((section.content ?? {}) as BlockContent);
  useEffect(() => setContent((section.content ?? {}) as BlockContent), [section.content]);
  const items = content.items ?? [];

  const set = (patch: Partial<BlockContent>) => setContent((c) => ({ ...c, ...patch }));

  return (
    <Card className={section.enabled ? "" : "opacity-60"}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-sm">
          {BLOCK_LABELS[section.block_type as BlockType] ?? section.block_type}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Switch checked={section.enabled} onCheckedChange={onToggle} />
          <Button variant="ghost" size="icon" onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="text-destructive h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Titel</Label>
            <Input value={content.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Subtitel</Label>
            <Input value={content.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Tekst</Label>
          <Textarea rows={4} value={content.body ?? ""} onChange={(e) => set({ body: e.target.value })} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>CTA-label</Label>
            <Input value={content.cta_label ?? ""} onChange={(e) => set({ cta_label: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>CTA-link</Label>
            <Input value={content.cta_url ?? ""} onChange={(e) => set({ cta_url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Afbeelding (URL)</Label>
            <Input value={content.image_url ?? ""} onChange={(e) => set({ image_url: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Alt-tekst</Label>
            <Input value={content.image_alt ?? ""} onChange={(e) => set({ image_alt: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Items (USP's, stappen, FAQ-vragen)</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => set({ items: [...items, { title: "", text: "" }] })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" /> Item
            </Button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_2fr_auto]">
              <Input
                placeholder="Titel"
                value={item.title ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, title: e.target.value };
                  set({ items: next });
                }}
              />
              <Textarea
                rows={2}
                placeholder="Tekst"
                value={item.text ?? ""}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...item, text: e.target.value };
                  set({ items: next });
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => set({ items: items.filter((_, x) => x !== i) })}
              >
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button size="sm" onClick={() => onSave(content)}>
          Blok opslaan
        </Button>
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------------- form */

function FormEditor({
  pageId,
  form,
}: {
  pageId: string;
  form: {
    title: string | null;
    intro: string | null;
    submit_label: string;
    success_title: string;
    success_body: string;
    fields: unknown;
  } | null;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(updateLandingForm);
  const [title, setTitle] = useState(form?.title ?? "");
  const [intro, setIntro] = useState(form?.intro ?? "");
  const [submitLabel, setSubmitLabel] = useState(form?.submit_label ?? "Offerte aanvragen");
  const [successTitle, setSuccessTitle] = useState(form?.success_title ?? "Bedankt voor je aanvraag");
  const [successBody, setSuccessBody] = useState(
    form?.success_body ?? "We nemen zo snel mogelijk contact met je op.",
  );
  const [fields, setFields] = useState<FormFieldConfig[]>(
    (Array.isArray(form?.fields) && (form!.fields as FormFieldConfig[]).length
      ? (form!.fields as FormFieldConfig[])
      : DEFAULT_FORM_FIELDS) as FormFieldConfig[],
  );

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          page_id: pageId,
          title: title || null,
          intro: intro || null,
          submit_label: submitLabel,
          success_title: successTitle,
          success_body: successBody,
          fields,
        },
      }),
    onSuccess: () => {
      toast.success("Formulier opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["landing", "page", pageId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setField = (index: number, patch: Partial<FormFieldConfig>) =>
    setFields((f) => f.map((field, i) => (i === index ? { ...field, ...patch } : field)));

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const moveField = (from: number, to: number) =>
    setFields((f) => {
      if (from === to || to < 0 || to >= f.length) return f;
      const next = [...f];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Offerteformulier</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Formuliertitel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Verzendknop</Label>
            <Input value={submitLabel} onChange={(e) => setSubmitLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Introtekst</Label>
            <Textarea rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bedankt-titel</Label>
            <Input value={successTitle} onChange={(e) => setSuccessTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Bedankt-tekst</Label>
            <Textarea rows={2} value={successBody} onChange={(e) => setSuccessBody(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Velden</Label>
          {fields.map((field, i) => (
            <div key={field.key} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[2fr_1fr_1fr]">
              <Input value={field.label} onChange={(e) => setField(i, { label: e.target.value })} />
              <select
                value={field.state}
                onChange={(e) => setField(i, { state: e.target.value as FieldState })}
                className="border-input bg-background h-10 rounded-md border px-3 text-sm"
              >
                {Object.entries(FIELD_STATE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Placeholder"
                value={field.placeholder ?? ""}
                onChange={(e) => setField(i, { placeholder: e.target.value })}
              />
              {(field.type === "select" || field.type === "multiselect") && (
                <Input
                  className="md:col-span-3"
                  placeholder="Opties, gescheiden door komma's"
                  value={(field.options ?? []).join(", ")}
                  onChange={(e) =>
                    setField(i, {
                      options: e.target.value
                        .split(",")
                        .map((o) => o.trim())
                        .filter(Boolean),
                    })
                  }
                />
              )}
            </div>
          ))}
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Formulier opslaan
        </Button>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------- products & testimonials */

type ProductRow = {
  id: string;
  name: string;
  short_text: string | null;
  image_url: string | null;
  price_from: number | null;
};

function ProductsEditor({
  pageId,
  products,
  selected,
}: {
  pageId: string;
  products: ProductRow[];
  selected: string[];
}) {
  const queryClient = useQueryClient();
  const setProducts = useServerFn(setLandingPageProducts);
  const upsert = useServerFn(upsertLandingProduct);
  const [ids, setIds] = useState<string[]>(selected);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [price, setPrice] = useState("");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["landing", "page", pageId] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cadeauvoorbeelden</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const active = ids.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() =>
                  setIds(active ? ids.filter((x) => x !== p.id) : [...ids, p.id])
                }
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  active ? "border-primary bg-primary/5" : "hover:bg-accent"
                }`}
              >
                <p className="font-medium">{p.name}</p>
                {p.short_text && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{p.short_text}</p>
                )}
              </button>
            );
          })}
          {products.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nog geen producten in de bibliotheek — voeg er hieronder een toe.
            </p>
          )}
        </div>
        <Button
          size="sm"
          onClick={async () => {
            await setProducts({ data: { page_id: pageId, product_ids: ids } });
            toast.success("Selectie opgeslagen");
            invalidate();
          }}
        >
          Selectie opslaan
        </Button>

        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Nieuw product in de bibliotheek</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Naam" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              placeholder="Vanafprijs (bijv. 12.50)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <Input placeholder="Afbeelding-URL" value={image} onChange={(e) => setImage(e.target.value)} />
            <Input placeholder="Korte tekst" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={name.length < 2}
            onClick={async () => {
              const parsed = Number(price.replace(",", "."));
              await upsert({
                data: {
                  name,
                  short_text: text || null,
                  image_url: image || null,
                  price_from: Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                },
              });
              setName("");
              setText("");
              setImage("");
              setPrice("");
              toast.success("Product toegevoegd");
              invalidate();
            }}
          >
            Product toevoegen
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type TestimonialRow = {
  id: string;
  author: string;
  role_title: string | null;
  company: string | null;
  quote: string;
};

function TestimonialsEditor({
  pageId,
  testimonials,
}: {
  pageId: string;
  testimonials: TestimonialRow[];
}) {
  const queryClient = useQueryClient();
  const upsert = useServerFn(upsertLandingTestimonial);
  const remove = useServerFn(deleteLandingTestimonial);
  const [author, setAuthor] = useState("");
  const [company, setCompany] = useState("");
  const [quote, setQuote] = useState("");
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["landing", "page", pageId] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Testimonials & cases</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {testimonials.map((t) => (
          <div key={t.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div>
              <p className="text-sm">{t.quote}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t.author}
                {t.company ? ` — ${t.company}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                await remove({ data: { id: t.id } });
                invalidate();
              }}
            >
              <Trash2 className="text-destructive h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="grid gap-3 md:grid-cols-2">
          <Input placeholder="Naam" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Input placeholder="Bedrijf" value={company} onChange={(e) => setCompany(e.target.value)} />
          <Textarea
            className="md:col-span-2"
            rows={3}
            placeholder="Quote"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={author.length < 2 || quote.length < 5}
          onClick={async () => {
            await upsert({
              data: { page_id: pageId, author, company: company || null, quote },
            });
            setAuthor("");
            setCompany("");
            setQuote("");
            toast.success("Testimonial toegevoegd");
            invalidate();
          }}
        >
          Toevoegen
        </Button>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------------- settings */

function SettingsEditor({
  page,
  industries,
}: {
  page: {
    id: string;
    name: string;
    slug: string;
    status: string;
    industry_id: string | null;
    base_url: string | null;
    canonical_url: string | null;
    noindex: boolean;
    seo_title: string | null;
    seo_description: string | null;
    og_title: string | null;
    og_description: string | null;
    og_image_url: string | null;
    notify_channel: string | null;
    notify_target: string | null;
    is_test: boolean;
  };
  industries: { id: string; name: string }[];
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(updateLandingPage);
  const [state, setState] = useState(page);
  const set = (patch: Partial<typeof page>) => setState((s) => ({ ...s, ...patch }));

  const mutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: page.id,
          name: state.name,
          slug: state.slug,
          status: state.status as LandingStatus,
          industry_id: state.industry_id || null,
          base_url: state.base_url || null,
          canonical_url: state.canonical_url || null,
          noindex: state.noindex,
          seo_title: state.seo_title || null,
          seo_description: state.seo_description || null,
          og_title: state.og_title || null,
          og_description: state.og_description || null,
          og_image_url: state.og_image_url || null,
          notify_channel: (state.notify_channel as "none" | "webhook" | null) || null,
          notify_target: state.notify_target || null,
          is_test: state.is_test,
        },
      }),
    onSuccess: () => {
      toast.success("Instellingen opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["landing"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Instellingen, SEO en meldingen</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Naam</Label>
            <Input value={state.name} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input value={state.slug} onChange={(e) => set({ slug: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              value={state.status}
              onChange={(e) => set({ status: e.target.value })}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              {Object.entries(LANDING_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Branche</Label>
            <select
              value={state.industry_id ?? ""}
              onChange={(e) => set({ industry_id: e.target.value || null })}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Geen</option>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>SEO-titel</Label>
            <Input
              value={state.seo_title ?? ""}
              onChange={(e) => set({ seo_title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Canonical URL</Label>
            <Input
              value={state.canonical_url ?? ""}
              onChange={(e) => set({ canonical_url: e.target.value })}
              placeholder="https://www.zoetbezorgen.nl/offerte/..."
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>SEO-omschrijving</Label>
            <Textarea
              rows={2}
              value={state.seo_description ?? ""}
              onChange={(e) => set({ seo_description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>OG-afbeelding (absolute URL)</Label>
            <Input
              value={state.og_image_url ?? ""}
              onChange={(e) => set({ og_image_url: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Melding bij nieuwe lead (webhook-URL)</Label>
            <Input
              value={state.notify_target ?? ""}
              onChange={(e) =>
                set({ notify_target: e.target.value, notify_channel: e.target.value ? "webhook" : "none" })
              }
              placeholder="https://hooks.slack.com/…"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={!state.noindex} onCheckedChange={(v) => set({ noindex: !v })} />
            Indexeren door Google toestaan
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={state.is_test} onCheckedChange={(v) => set({ is_test: v })} />
            Testpagina (leads worden nooit naar Google Ads geüpload)
          </label>
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Instellingen opslaan
        </Button>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------------- versions */

function VersionsPanel({
  pageId,
  versions,
}: {
  pageId: string;
  versions: {
    id: string;
    version_number: number;
    note: string | null;
    published_at: string;
    published_by_email: string | null;
  }[];
}) {
  const queryClient = useQueryClient();
  const rollback = useServerFn(rollbackLandingPage);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Versiegeschiedenis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions.length === 0 && (
          <p className="text-muted-foreground text-sm">Nog niets gepubliceerd.</p>
        )}
        {versions.map((v) => (
          <div key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Versie {v.version_number}</p>
              <p className="text-muted-foreground text-xs">
                {new Date(v.published_at).toLocaleString("nl-NL")}
                {v.published_by_email ? ` · ${v.published_by_email}` : ""}
                {v.note ? ` · ${v.note}` : ""}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await rollback({ data: { id: pageId, version_id: v.id } });
                toast.success(`Teruggezet naar versie ${v.version_number}`);
                queryClient.invalidateQueries({ queryKey: ["landing"] });
              }}
            >
              <History className="mr-1 h-4 w-4" /> Terugzetten
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- performance */

/**
 * Prestatieweergave per pagina. Preview- en testverkeer zijn server-side al
 * uitgesloten, zodat deze cijfers gelijklopen met de AI-dataset.
 */
function PerformancePanel({ pageId }: { pageId: string }) {
  const today = new Date();
  const start = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const end = today.toISOString().slice(0, 10);
  const load = useServerFn(getLandingAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["landing", "analytics", pageId, start, end],
    queryFn: () => load({ data: { id: pageId, start, end } }),
  });

  if (isLoading || !data) return <Skeleton className="h-48 w-full" />;
  const f = data.funnel;
  const steps: { label: string; value: string }[] = [
    { label: "Bezoeken", value: String(f.views) },
    { label: "CTA-clicks", value: String(f.cta_clicks) },
    { label: "Formulier gestart", value: String(f.form_started) },
    { label: "Leads", value: String(f.leads) },
    { label: "Qualified / hot", value: String(f.qualified) },
    { label: "Klanten", value: String(f.customers) },
    {
      label: "Omzet",
      value: f.revenue > 0 ? `€ ${f.revenue.toLocaleString("nl-NL")}` : "—",
    },
    {
      label: "Conversie",
      value: f.conversion_rate === null ? "—" : `${f.conversion_rate.toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel — laatste 30 dagen</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.label}>
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
              <div className="text-muted-foreground text-xs">{s.label}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {f.views === 0 && (
        <p className="text-muted-foreground text-sm">
          Nog geen live verkeer gemeten. Preview- en testbezoeken worden bewust niet meegeteld.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { title: "Per variant", rows: data.byVariant.map((v) => ({ label: v.variant, leads: v.leads })) },
          { title: "Per platform", rows: data.byPlatform },
          { title: "Per campagne", rows: data.byCampaign },
          { title: "Per branche", rows: data.byIndustry },
        ].map((block) => (
          <Card key={block.title}>
            <CardHeader>
              <CardTitle className="text-base">{block.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {block.rows.length === 0 ? (
                <p className="text-muted-foreground">Geen data in deze periode.</p>
              ) : (
                block.rows.map((r) => (
                  <div key={r.label} className="flex justify-between">
                    <span className="truncate">{r.label}</span>
                    <span className="tabular-nums">{r.leads}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formulierinzendingen</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {data.submissions.accepted} geaccepteerd · {data.submissions.duplicate} dubbel ·{" "}
          {data.submissions.rejected} geweigerd (spam/validatie)
        </CardContent>
      </Card>
    </div>
  );
}
