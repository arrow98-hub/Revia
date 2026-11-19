import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, ProductEvent, ProductPhoto, ProductWithProvider, Provider } from "./types";

export const PRODUCT_SELECT = "*, provider:providers(id, name)";

export async function listProducts(
  supabase: SupabaseClient,
  userId: string,
  opts: { trashed?: boolean } = {},
): Promise<ProductWithProvider[]> {
  let q = supabase.from("products").select(PRODUCT_SELECT).eq("user_id", userId);
  q = opts.trashed ? q.not("deleted_at", "is", null) : q.is("deleted_at", null);
  const { data, error } = await q.order("registered_at", { ascending: false }).limit(5000);
  if (error) throw error;
  return (data ?? []) as ProductWithProvider[];
}

export async function listProviders(supabase: SupabaseClient, userId: string): Promise<Provider[]> {
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []) as Provider[];
}

export async function getProductDetail(supabase: SupabaseClient, id: string) {
  const [{ data: product }, { data: events }, { data: photos }] = await Promise.all([
    supabase.from("products").select(PRODUCT_SELECT).eq("id", id).maybeSingle(),
    supabase.from("product_events").select("*").eq("product_id", id).order("created_at", { ascending: false }),
    supabase.from("product_photos").select("*").eq("product_id", id).order("created_at"),
  ]);
  return {
    product: product as ProductWithProvider | null,
    events: (events ?? []) as ProductEvent[],
    photos: (photos ?? []) as ProductPhoto[],
  };
}

/** URLs firmadas (1 h) para fotos privadas. */
export async function signPhotos(supabase: SupabaseClient, photos: ProductPhoto[]) {
  if (photos.length === 0) return [] as (ProductPhoto & { url: string | null })[];
  const { data } = await supabase.storage
    .from("product-photos")
    .createSignedUrls(photos.map((p) => p.storage_path), 60 * 60);
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return photos.map((p) => ({ ...p, url: map.get(p.storage_path) ?? null }));
}

export type ProviderStats = Provider & {
  total: number;
  active: number;
  reviewed: number;
  first: string | null;
  last: string | null;
};

export function providerStats(providers: Provider[], products: Product[]): ProviderStats[] {
  return providers
    .map((pv) => {
      const own = products.filter((p) => p.provider_id === pv.id);
      const dates = own.map((p) => p.registered_at).sort();
      return {
        ...pv,
        total: own.length,
        active: own.filter((p) => ["in_transit", "delayed", "received"].includes(p.status)).length,
        reviewed: own.filter((p) => p.status === "completed" && p.requires_review).length,
        first: dates[0] ?? null,
        last: dates[dates.length - 1] ?? null,
      };
    })
    .sort((a, b) => (b.last ?? "").localeCompare(a.last ?? ""));
}
