"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { supabasePhotoStorage } from "@/lib/storage/photos";
import { addPhotos, removePhoto } from "@/app/(app)/actions";
import type { PhotoKind } from "@/lib/types";

export interface GalleryPhoto {
  id: string;
  kind: PhotoKind;
  url: string | null;
  created_at: string;
}

export function PhotoGallery({
  photos,
  productId,
  userId,
  kind,
  title,
  emptyText,
  readOnly,
}: {
  photos: GalleryPhoto[];
  productId: string;
  userId: string;
  kind: PhotoKind;
  title: string;
  emptyText: string;
  readOnly?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<GalleryPhoto | null>(null);
  const router = useRouter();

  async function onFiles(files: File[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      const uploaded = [];
      for (const f of files) uploaded.push(await supabasePhotoStorage.upload(f, { userId, productId, kind }));
      const res = await addPhotos(productId, kind, uploaded);
      if (!res.ok) toast.error(res.error);
      else toast.success(files.length === 1 ? "Foto guardada" : `${files.length} fotos guardadas`);
      router.refresh();
    } catch {
      toast.error("No pudimos subir las fotos. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p)}
            className="aspect-square overflow-hidden rounded-xl border border-border bg-bg-subtle transition-shadow hover:shadow-sm"
            aria-label="Ver foto"
          >
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
            ) : null}
          </button>
        ))}
        {!readOnly ? (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-primary">
            {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <ImagePlus className="size-5" aria-hidden />}
            <span className="text-[12px] font-semibold">{busy ? "Subiendo…" : "Agregar"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={busy}
              onChange={(e) => {
                onFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </div>
      {photos.length === 0 && readOnly ? <p className="text-sm text-muted">{emptyText}</p> : null}
      {photos.length === 0 && !readOnly ? <p className="mt-2 text-[13px] text-muted">{emptyText}</p> : null}

      <Dialog.Root open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/85 data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed inset-0 z-50 flex flex-col focus:outline-none">
            <Dialog.Title className="sr-only">Foto</Dialog.Title>
            <Dialog.Description className="sr-only">Vista ampliada</Dialog.Description>
            <div className="flex justify-end gap-2 p-3 pt-[max(12px,env(safe-area-inset-top))]">
              {!readOnly && open ? (
                <button
                  onClick={async () => {
                    const res = await removePhoto(open.id);
                    if (!res.ok) toast.error(res.error);
                    else toast.success("Foto eliminada");
                    setOpen(null);
                    router.refresh();
                  }}
                  className="flex h-10 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"
                >
                  <Trash2 className="size-4" aria-hidden /> Eliminar
                </button>
              ) : null}
              <Dialog.Close className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Cerrar">
                <X className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex flex-1 items-center justify-center p-4" onClick={() => setOpen(null)}>
              {open?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={open.url} alt="" className="max-h-full max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
              ) : null}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}
