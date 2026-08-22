import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createLead, listIndustries } from "@/lib/leads.functions";
import { FUNNEL_LABELS, type FunnelType } from "@/lib/leads-shared";

export function AddLeadDialog() {
  const [open, setOpen] = useState(false);
  const [funnel, setFunnel] = useState<FunnelType>("quote");
  const [industryId, setIndustryId] = useState<string>("");
  const [form, setForm] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const industriesFn = useServerFn(listIndustries);
  const createFn = useServerFn(createLead);

  const industries = useQuery({
    queryKey: ["leads", "industries"],
    queryFn: () => industriesFn({}),
    enabled: open,
  });

  const set = (key: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const create = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { funnel_type: funnel };
      for (const [key, value] of Object.entries(form)) if (value.trim()) payload[key] = value.trim();
      if (industryId) payload.industry_id = industryId;
      return createFn({ data: payload as never });
    },
    onSuccess: () => {
      toast.success("Lead toegevoegd");
      setForm({});
      setIndustryId("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Lead toevoegen
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lead toevoegen</DialogTitle>
          <DialogDescription>
            Handmatige lead. Attributievelden zijn optioneel — laat onbekend leeg, we vullen niets in.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Funnel</Label>
            <Select value={funnel} onValueChange={(v) => setFunnel(v as FunnelType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FUNNEL_LABELS) as FunnelType[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FUNNEL_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branche</Label>
            <Select value={industryId} onValueChange={setIndustryId}>
              <SelectTrigger>
                <SelectValue placeholder="Kies branche" />
              </SelectTrigger>
              <SelectContent>
                {(industries.data?.industries ?? []).map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {[
            ["company_name", "Bedrijf *"],
            ["contact_name", "Contactpersoon"],
            ["email", "E-mail"],
            ["phone", "Telefoon"],
            ["website", "Website"],
            ["company_size", "Bedrijfsgrootte"],
            ["kvk_number", "KvK-nummer"],
            ["landing_page", "Landingspagina (bijv. /offerte/bouw)"],
            ["platform", "Platform (bijv. google_ads)"],
            ["campaign_name", "Campagne"],
            ["campaign_id", "Campagne-ID"],
            ["ad_group_name", "Advertentiegroep"],
            ["keyword", "Zoekwoord"],
            ["search_term", "Zoekterm"],
            ["utm_source", "utm_source"],
            ["utm_medium", "utm_medium"],
            ["utm_campaign", "utm_campaign"],
            ["utm_content", "utm_content"],
            ["utm_term", "utm_term"],
            ["gclid", "GCLID"],
          ].map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={form[key] ?? ""} onChange={set(key)} />
            </div>
          ))}

          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notities</Label>
            <Textarea rows={3} value={form.notes ?? ""} onChange={set("notes")} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button
            disabled={!form.company_name?.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            Lead opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
