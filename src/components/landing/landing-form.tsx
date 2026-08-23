/**
 * Public B2B quote / platform application form.
 * Fields are fully driven by the page's form configuration.
 */
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AttributionSnapshot, FormFieldConfig, LandingFormConfig } from "@/lib/landing-shared";
import { submitLandingForm } from "@/lib/landing-submit.functions";
import { cn } from "@/lib/utils";

type Values = Record<string, string | boolean | string[]>;

export function LandingForm({
  form,
  funnel,
  slug,
  previewToken,
  variantKey,
  versionId,
  attribution,
  sessionId,
  onStarted,
  onSubmitted,
}: {
  form: LandingFormConfig;
  funnel: "quote" | "platform";
  slug: string;
  previewToken?: string | null;
  variantKey: string;
  versionId: string | null;
  attribution: AttributionSnapshot;
  sessionId: string;
  onStarted?: () => void;
  onSubmitted?: () => void;
}) {
  const submitFn = useServerFn(submitLandingForm);
  const [values, setValues] = useState<Values>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef<number>(Date.now());
  const started = useRef(false);
  const submissionId = useMemo(() => crypto.randomUUID(), []);

  const fields = form.fields.filter((f) => f.state !== "hidden" && f.state !== "disabled");

  const touch = () => {
    if (started.current) return;
    started.current = true;
    startedAt.current = Date.now();
    onStarted?.();
  };

  const set = (key: string, value: string | boolean | string[]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await submitFn({
        data: {
          funnel,
          slug,
          preview_token: previewToken ?? null,
          session_id: sessionId,
          submission_id: submissionId,
          variant_key: variantKey,
          version_id: versionId,
          hp: honeypot,
          elapsed_ms: Date.now() - startedAt.current,
          values: values as Record<string, string | number | boolean | string[]>,
          attribution: attribution as Record<string, unknown>,
        },
      });
      if (!result.ok) {
        setError(
          result.error === "rate_limited"
            ? "Te veel aanvragen vanaf dit netwerk. Probeer het later opnieuw."
            : "missing" in result && Array.isArray(result.missing) && result.missing.length
              ? `Vul deze velden in: ${result.missing.join(", ")}`
              : "Verzenden is niet gelukt. Probeer het opnieuw of mail ons.",
        );
        return;
      }
      setDone(true);
      onSubmitted?.();
    } catch {
      setError("Verzenden is niet gelukt. Probeer het opnieuw of mail ons.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="bg-background rounded-2xl border p-8 text-center">
        <CheckCircle2 className="text-primary mx-auto h-8 w-8" />
        <h3 className="mt-4 text-lg font-semibold">{form.success_title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">{form.success_body}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      onFocus={touch}
      className="bg-background grid gap-4 rounded-2xl border p-6 md:grid-cols-2 md:p-8"
    >
      {form.title && (
        <div className="md:col-span-2">
          <h3 className="text-lg font-semibold">{form.title}</h3>
          {form.intro && <p className="text-muted-foreground mt-1 text-sm">{form.intro}</p>}
        </div>
      )}

      {fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(v) => set(field.key, v)}
        />
      ))}

      {/* Honeypot: hidden from users, filled by bots. */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="company_website_extra">Laat leeg</label>
        <input
          id="company_website_extra"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-destructive md:col-span-2 text-sm" role="alert">
          {error}
        </p>
      )}

      <div className="md:col-span-2">
        <Button type="submit" size="lg" disabled={busy} className="w-full rounded-full sm:w-auto">
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {form.submit_label}
        </Button>
        <p className="text-muted-foreground mt-3 text-xs">
          We gebruiken je gegevens uitsluitend om je aanvraag te behandelen.
        </p>
      </div>
    </form>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FormFieldConfig;
  value: string | boolean | string[] | undefined;
  onChange: (v: string | boolean | string[]) => void;
}) {
  const wide = field.type === "textarea" || field.type === "multiselect";
  const required = field.state === "required";

  return (
    <div className={cn("space-y-1.5", wide && "md:col-span-2")}>
      <Label htmlFor={field.key}>
        {field.label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={field.key}
          rows={4}
          required={required}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : field.type === "select" ? (
        <select
          id={field.key}
          required={required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
        >
          <option value="">Kies een optie</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === "multiselect" ? (
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((o) => {
            const list = (value as string[]) ?? [];
            const active = list.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => onChange(active ? list.filter((x) => x !== o) : [...list, o])}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {o}
              </button>
            );
          })}
        </div>
      ) : field.type === "boolean" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            id={field.key}
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          Ja, graag
        </label>
      ) : (
        <Input
          id={field.key}
          type={field.type}
          required={required}
          placeholder={field.placeholder}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {field.help && <p className="text-muted-foreground text-xs">{field.help}</p>}
    </div>
  );
}
