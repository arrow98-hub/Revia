import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { requireAdmin } from "@/lib/dal";
import { getProductDetail, signPhotos } from "@/lib/data";
import { todayISO } from "@/lib/domain/dates";

export const metadata = { title: "Producto (admin)" };

export default async function AdminProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { product, events, photos } = await getProductDetail(supabase, id);
  if (!product) notFound();
  const { data: owner } = await supabase.from("profiles").select("timezone, first_name").eq("id", product.user_id).single();
  const tz = owner?.timezone ?? "America/New_York";
  const signed = await signPhotos(supabase, photos);
  return (
    <div>
      <PageHeader back={{ href: `/admin?usuario=${product.user_id}`, label: `Productos de ${owner?.first_name ?? "usuario"}` }} />
      <p className="mb-4 rounded-lg bg-warning-soft px-3 py-2 text-sm font-medium text-warning">Vista de administrador · solo lectura</p>
      <ProductDetailView product={product} events={events} photos={signed} today={todayISO(tz)} timezone={tz} userId={product.user_id} readOnly />
    </div>
  );
}
