import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const BUCKET = "post-media";
const FOLDER = "library";

export type MediaItem = {
  path: string;
  url: string;
};

async function signUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export function MediaPicker({
  value,
  onChange,
  max = 4,
}: {
  value: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(FOLDER, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      const items = await Promise.all(
        (data ?? [])
          .filter((f) => f.name && !f.name.startsWith("."))
          .map(async (f) => {
            const path = `${FOLDER}/${f.name}`;
            return { path, url: await signUrl(path) };
          }),
      );
      setLibrary(items);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: MediaItem[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${FOLDER}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        uploaded.push({ path, url: await signUrl(path) });
      }
      setLibrary((cur) => [...uploaded, ...cur]);
      toast.success(`${uploaded.length} bestand(en) geüpload`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeFromLibrary = async (path: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return toast.error(error.message);
    setLibrary((cur) => cur.filter((i) => i.path !== path));
    onChange(value.filter((i) => i.path !== path));
  };

  const toggle = (item: MediaItem) => {
    const exists = value.find((v) => v.path === item.path);
    if (exists) onChange(value.filter((v) => v.path !== item.path));
    else if (value.length >= max) toast.error(`Max ${max} afbeeldingen`);
    else onChange([...value, item]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((item) => (
          <div key={item.path} className="group relative h-20 w-20 overflow-hidden rounded-md border border-border">
            <img src={item.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v.path !== item.path))}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Verwijder"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-20 w-20 flex-col gap-1">
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">Media</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Mediabibliotheek</DialogTitle>
            </DialogHeader>
            <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
              <p className="text-xs text-muted-foreground">
                {value.length}/{max} geselecteerd · klik op een afbeelding om te (de)selecteren
              </p>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="gap-1.5"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                  Upload
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : library.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <ImagePlus className="h-8 w-8" />
                Nog geen media — upload je eerste afbeelding.
              </div>
            ) : (
              <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto pt-3 sm:grid-cols-4 md:grid-cols-5">
                {library.map((item) => {
                  const selected = value.some((v) => v.path === item.path);
                  return (
                    <div
                      key={item.path}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-md border-2 transition-colors",
                        selected ? "border-primary" : "border-transparent hover:border-border",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(item)}
                        className="block h-full w-full"
                      >
                        <img src={item.url} alt="" className="h-full w-full object-cover" />
                      </button>
                      {selected && (
                        <div className="pointer-events-none absolute right-1 top-1 rounded-full bg-primary p-1 text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFromLibrary(item.path)}
                        className="absolute bottom-1 right-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label="Verwijder uit bibliotheek"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
