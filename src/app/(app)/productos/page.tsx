import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { PRODUCT_TABS, Segmented } from "@/components/shell/segmented";
import { ProductsBrowser } from "@/components/product/products-browser";
import { requireSession } from "@/lib/dal";
import { listProducts } from "@/lib/data";

export const metadata = { title: "Productos" };

export default async function ProductsPage() {
  const { supabase, user, today } = await requireSession();
  const products = await listProducts(supabase, user.id);
  return (
    <div>
      <PageHeader title="Productos" />
      <Segmented items={PRODUCT_TABS} active="productos" />
      <Suspense>
        <ProductsBrowser products={products} today={today} userId={user.id} />
      </Suspense>
    </div>
  );
}
