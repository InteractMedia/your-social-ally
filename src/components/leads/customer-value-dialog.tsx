import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { markLeadAsCustomer } from "@/lib/leads.functions";

export function CustomerValueDialog({
  leadId,
  open,
  onOpenChange,
}: {
  leadId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [revenue, setRevenue] = useState("");
  const [margin, setMargin] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const queryClient = useQueryClient();
  const markFn = useServerFn(markLeadAsCustomer);

  const save = useMutation({
    mutationFn: () =>
      markFn({
        data: {
          id: leadId,
          revenue: Number(revenue.replace(",", ".")),
          gross_margin: margin ? Number(margin.replace(",", ".")) : undefined,
          customer_date: date,
        },
      }),
    onSuccess: () => {
      toast.success("Klantwaarde geregistreerd");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revenueValue = Number(revenue.replace(",", "."));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Klantwaarde registreren</DialogTitle>
          <DialogDescription>
            Deze omzet is de basis voor CAC, ROAS en toekomstige AI-analyses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Omzet (€)</Label>
            <Input
              inputMode="decimal"
              placeholder="2500"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brutomarge (€) — optioneel</Label>
            <Input
              inputMode="decimal"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Datum klant geworden</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            disabled={!Number.isFinite(revenueValue) || revenueValue <= 0 || save.isPending}
            onClick={() => save.mutate()}
          >
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>

    </Dialog>
  );
}
