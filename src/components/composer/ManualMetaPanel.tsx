import { useMemo, useState } from "react";
import { Check, Copy, Download, ExternalLink, Facebook, Instagram, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { MediaItem } from "@/components/media-picker";
import type { Platform } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  media: MediaItem[];
  platforms: Platform[];
};

const STORAGE_KEY = "manual-meta-posted-log";

type LogEntry = {
  id: string;
  platform: "facebook" | "instagram";
  caption: string;
  mediaCount: number;
  postedAt: string;
};

function readLog(): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeLog(entries: LogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 25)));
}

export function ManualMetaPanel({ content, media, platforms }: Props) {
  const targets = useMemo(
    () => platforms.filter((p) => p === "facebook" || p === "instagram") as Array<"facebook" | "instagram">,
    [platforms],
  );
  const [copied, setCopied] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>(() => readLog());
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (targets.length === 0) return null;

  const hashtags = (content.match(/#\w+/g) ?? []).join(" ");
  const caption = content.trim();

  const copy = async (text: string, key: string) => {
    if (!text) return toast.error("Niets om te kopiëren.");
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    toast.success("Gekopieerd naar klembord");
  };

  const toggleStep = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const markPosted = (platform: "facebook" | "instagram") => {
    if (!caption) return toast.error("Schrijf eerst een bericht.");
    const entry: LogEntry = {
      id: `${Date.now()}-${platform}`,
      platform,
      caption,
      mediaCount: media.length,
      postedAt: new Date().toISOString(),
    };
    const next = [entry, ...log];
    setLog(next);
    writeLog(next);
    setChecked({});
    toast.success(`Gemarkeerd als gepost op ${platform === "facebook" ? "Facebook" : "Instagram"}`);
  };

  const steps = (platform: "facebook" | "instagram") => {
    const isFB = platform === "facebook";
    return [
      { id: `${platform}-open`, label: `Open ${isFB ? "Meta Business Suite" : "Instagram (app of Business Suite)"}` },
      ...(media.length > 0
        ? [{ id: `${platform}-media`, label: `Download ${media.length} afbeelding(en) hieronder en voeg toe aan de post` }]
        : []),
      { id: `${platform}-caption`, label: "Plak de caption" },
      ...(hashtags ? [{ id: `${platform}-tags`, label: "Controleer of hashtags meegekomen zijn" }] : []),
      { id: `${platform}-publish`, label: "Publiceer of plan in" },
    ];
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4" />
          Handmatig posten (tijdens Meta review)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Meta app review nog niet afgerond — volg per platform de stappen om je post te publiceren.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => copy(caption, "caption")}
          >
            {copied === "caption" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Kopieer caption
          </Button>
          {hashtags && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => copy(hashtags, "tags")}
            >
              {copied === "tags" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              Kopieer hashtags
            </Button>
          )}
        </div>

        {media.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Media downloaden</div>
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <a
                  key={m.path}
                  href={m.url}
                  download={`post-${i + 1}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative h-16 w-16 overflow-hidden rounded-md border border-border"
                >
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {targets.map((p) => {
          const isFB = p === "facebook";
          const url = isFB
            ? "https://business.facebook.com/latest/posts/published_posts"
            : "https://www.instagram.com/";
          const brandCls = isFB ? "text-[#1877F2]" : "text-[#E4405F]";
          return (
            <div key={p} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isFB ? (
                    <Facebook className={cn("h-4 w-4", brandCls)} />
                  ) : (
                    <Instagram className={cn("h-4 w-4", brandCls)} />
                  )}
                  <span className="text-sm font-medium">{isFB ? "Facebook" : "Instagram"}</span>
                  <Badge variant="outline" className="text-[10px]">handmatig</Badge>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <ol className="space-y-1.5">
                {steps(p).map((s, i) => (
                  <li key={s.id} className="flex items-start gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => toggleStep(s.id)}
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        checked[s.id] ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                      aria-label="Vinkje"
                    >
                      {checked[s.id] && <Check className="h-3 w-3" />}
                    </button>
                    <span className={cn(checked[s.id] && "text-muted-foreground line-through")}>
                      {i + 1}. {s.label}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-2 flex justify-end">
                <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => markPosted(p)}>
                  <Check className="h-3.5 w-3.5" />
                  Markeer als gepost
                </Button>
              </div>
            </div>
          );
        })}

        {log.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Recent handmatig gepost</div>
            <ul className="space-y-1">
              {log.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="truncate">
                    {e.platform === "facebook" ? "FB" : "IG"} · {e.caption.slice(0, 50)}
                    {e.caption.length > 50 ? "…" : ""}
                  </span>
                  <span className="shrink-0">{new Date(e.postedAt).toLocaleString("nl-NL")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
