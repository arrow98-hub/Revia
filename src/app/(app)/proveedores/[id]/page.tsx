import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { ProviderSummary } from "@/components/provider-views";
import { ProviderEditButton } from "@/components/provider-edit";
import { ProductCard } from "@/components/product/product-card";
import { SectionTitle } from "@/components/ui/misc";
import { requireSession } from "@/lib/dal";
import { listProducts, listProviders, providerStats } from "@/lib/data";

export const metadata = { title: "Proveedor" };

export default async function ProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, today } = await requireSession();
  const [providers, products] = await Promise.all([listProviders(supabase, user.id), listProducts(supabase, user.id)]);
  const provider = providerStats(providers, products).find((p) => p.id === id);
  if (!provider) notFound();
  const own = products.filter((p) => p.provider_id === id);
  return (
    <div>
      <PageHeader title={provider.name} back={{ href: "/proveedores", label: "Proveedores" }} actions={<ProviderEditButton provider={provider} />} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <section className="order-2 lg:order-1">
          <SectionTitle count={own.length}>Sus productos</SectionTitle>
          <ul className="flex flex-col gap-2">
            {own.map((p) => (
              <ProductCard key={p.id} product={p} today={today} userId={user.id} />
            ))}
          </ul>
        </section>
        <div className="order-1 lg:order-2">
          <ProviderSummary provider={provider} />
        </div>
      </div>
    </div>
  );
}
