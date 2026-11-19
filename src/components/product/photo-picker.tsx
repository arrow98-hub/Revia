"use client";
import { useRef } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

/** Selector de varias fotos (cámara o galería) con vista previa. La subida ocurre al guardar. */
export function PhotoPicker({
  photos,
  onChange,
  label,
  busy,
}: {
  photos: PendingPhoto[];
  onChange: (photos: PendingPhoto[]) => void;
  label: string;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs font-medium text-muted">Opcional</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-border bg-bg-subtle">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.preview} alt="" className="size-full object-cover" />
            {busy ? (
              <div className="absolute inset-0 grid place-items-center bg-white/60">
                <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
              </div>
            ) : (
              <button
                type="button"
                aria-label="Quitar foto"
                onClick={() => {
                  URL.revokeObjectURL(p.preview);
                  onChange(photos.filter((x) => x.id !== p.id));
                }}
                className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-ink/70 text-white"
              >
                <X className="size-4" aria-hidden />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-muted transition-colors",
            "hover:border-primary hover:bg-primary-soft hover:text-primary disabled:opacity-50",
          )}
        >
          {photos.length ? <ImagePlus className="size-5" aria-hidden /> : <Camera className="size-5" aria-hidden />}
          <span className="text-[12px] font-semibold">{photos.length ? "Otra" : "Agregar"}</span>
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
          onChange([
            ...photos,
            ...files.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) })),
          ]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
