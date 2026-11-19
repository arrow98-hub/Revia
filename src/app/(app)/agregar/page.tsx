import { PageHeader } from "@/components/shell/page-header";
import { ProductForm } from "@/components/product/product-form";
import { requireSession } from "@/lib/dal";
import { listProviders } from "@/lib/data";

export const metadata = { title: "Agregar producto" };

export default async function AddPage() {
  const { supabase, user, today } = await requireSession();
  const providers = await listProviders(supabase, user.id);
  return (
    <div className="max-w-[640px]">
      <PageHeader title="Agregar producto" subtitle="La fecha y hora de registro se guardan solas." />
      <ProductForm providers={providers} today={today} />
    </div>
  );
}
