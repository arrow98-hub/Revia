import { PageHeader } from "@/components/shell/page-header";
import { PRODUCT_TABS, Segmented } from "@/components/shell/segmented";
import { ProvidersList } from "@/components/provider-views";
import { requireSession } from "@/lib/dal";
import { listProducts, listProviders, providerStats } from "@/lib/data";

export const metadata = { title: "Proveedores" };

export default async function ProvidersPage() {
  const { supabase, user } = await requireSession();
  const [providers, products] = await Promise.all([listProviders(supabase, user.id), listProducts(supabase, user.id)]);
  return (
    <div>
      <PageHeader title="Productos" />
      <Segmented items={PRODUCT_TABS} active="proveedores" />
      <ProvidersList providers={providerStats(providers, products)} />
    </div>
  );
}
