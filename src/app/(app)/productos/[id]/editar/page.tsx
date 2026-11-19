import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ProductForm } from "@/components/product/product-form";
import { requireSession } from "@/lib/dal";
import { getProductDetail, listProviders } from "@/lib/data";

export const metadata = { title: "Editar producto" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, today } = await requireSession();
  const [{ product }, providers] = await Promise.all([getProductDetail(supabase, id), listProviders(supabase, user.id)]);
  if (!product || product.user_id !== user.id || product.deleted_at) notFound();
  const provider = providers.find((p) => p.id === product.provider_id);
  return (
    <div className="max-w-[640px]">
      <PageHeader title="Editar producto" subtitle={product.code} back={{ href: `/productos/${id}`, label: "Volver" }} />
      <ProductForm
        providers={providers}
        today={today}
        productId={id}
        arrivedOn={product.arrived_on}
        initial={{
          requiresReview: product.requires_review,
          name: product.name,
          url: product.url ?? "",
          store: product.store,
          storeOther: product.store_other ?? "",
          providerName: provider?.name ?? product.provider?.name ?? "",
          contactChannel: product.contact_channel,
          contactHandle: "",
          reviewTypes: product.review_types,
          reviewDays: product.review_days ?? 7,
          expectedArrivalDate: product.expected_arrival_date,
          notes: product.notes ?? "",
        }}
      />
    </div>
  );
}
