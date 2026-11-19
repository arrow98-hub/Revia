"use client";
import imageCompression from "browser-image-compression";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { PhotoKind } from "@/lib/types";

/**
 * Capa de almacenamiento de fotos (CLAUDE.md §8.3).
 * Hoy: Supabase Storage. Mañana se puede añadir Google Drive implementando la misma interfaz.
 */
export interface PhotoStorage {
  upload(file: File, opts: { userId: string; productId: string; kind: PhotoKind }): Promise<UploadedPhotoInfo>;
}

export interface UploadedPhotoInfo {
  path: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
}

async function dimensions(file: Blob): Promise<{ width: number | null; height: number | null }> {
  try {
    const bmp = await createImageBitmap(file);
    const out = { width: bmp.width, height: bmp.height };
    bmp.close();
    return out;
  } catch {
    return { width: null, height: null };
  }
}

/** Comprime SIEMPRE antes de subir: lado mayor 1600px, WebP, objetivo ≤ 300 KB. */
export async function compressPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 1600,
    fileType: "image/webp",
    initialQuality: 0.75,
    useWebWorker: true,
  });
}

export const supabasePhotoStorage: PhotoStorage = {
  async upload(file, { userId, productId, kind }) {
    const compressed = await compressPhoto(file);
    const path = `${userId}/${productId}/${kind}/${crypto.randomUUID()}.webp`;
    const supabase = getBrowserSupabase();
    const { error } = await supabase.storage
      .from("product-photos")
      .upload(path, compressed, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
    if (error) throw error;
    const dims = await dimensions(compressed);
    return { path, ...dims, bytes: compressed.size };
  },
};
