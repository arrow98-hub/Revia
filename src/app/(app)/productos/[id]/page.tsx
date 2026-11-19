import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { requireSession } from "@/lib/dal";
import { getProductDetail, signPhotos } from "@/lib/data";

export const metadata = { title: "Producto" };

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase, user, profile, today } = await requireSession();
  const { product, events, photos } = await getProductDetail(supabase, id);
  if (!product || product.user_id !== user.id) notFound();
  const signed = await signPhotos(supabase, photos);
  return (
    <div>
      <PageHeader back={{ href: product.deleted_at ? "/ajustes/papelera" : "/productos", label: product.deleted_at ? "Papelera" : "Productos" }} />
      <div>
        <ProductDetailView product={product} events={events} photos={signed} today={today} timezone={profile.timezone} userId={user.id} />
      </div>
    </div>
  );
}
