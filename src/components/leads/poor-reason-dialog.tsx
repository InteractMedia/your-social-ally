import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listPoorLeadReasons } from "@/lib/leads.functions";

/** Reasons come from the database (poor_lead_reasons), never hardcoded here. */
export function usePoorLeadReasons() {
  const fn = useServerFn(listPoorLeadReasons);
  return useQuery({ queryKey: ["leads", "poor-reasons"], queryFn: () => fn({}) });
}

export function PoorReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (payload: { poorReasonKey: string; poorReasonNotes?: string }) => void;
  pending?: boolean;
}) {
  const reasons = usePoorLeadReasons();
  const [reasonKey, setReasonKey] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      setReasonKey("");
      setNotes("");
    }
  }, [open]);

  const list = reasons.data?.reasons ?? [];
  const selected = useMemo(() => list.find((r) => r.key === reasonKey), [list, reasonKey]);
  const notesRequired = Boolean(selected?.requires_notes);
  const canSubmit = Boolean(reasonKey) && (!notesRequired || notes.trim().length > 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Waarom is dit een slechte lead?</DialogTitle>
          <DialogDescription>
            De reden wordt vastgelegd bij de lead en gebruikt voor analyse per campagne, zoekwoord
            en landingspagina.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Reden</Label>
            <Select value={reasonKey} onValueChange={setReasonKey}>
              <SelectTrigger>
                <SelectValue placeholder="Kies een reden" />
              </SelectTrigger>
              <SelectContent>
                {list.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>
              Toelichting {notesRequired ? "(verplicht)" : "(optioneel)"}
            </Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Extra context over deze lead…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button
            disabled={!canSubmit || pending}
            onClick={() =>
              onConfirm({
                poorReasonKey: reasonKey,
                ...(notes.trim() ? { poorReasonNotes: notes.trim() } : {}),
              })
            }
          >
            Markeer als slecht
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
