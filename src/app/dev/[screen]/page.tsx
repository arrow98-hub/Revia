import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { ProductsBrowser } from "@/components/product/products-browser";
import { ProductForm } from "@/components/product/product-form";
import { ProductDetailView } from "@/components/product/product-detail-view";
import { CalendarView } from "@/components/calendar-view";
import { ProvidersList, ProviderSummary } from "@/components/provider-views";
import { PageHeader } from "@/components/shell/page-header";
import { PRODUCT_TABS, Segmented } from "@/components/shell/segmented";
import { BottomNav, Sidebar } from "@/components/shell/nav";
import { providerStats } from "@/lib/data";
import { todayISO } from "@/lib/domain/dates";
import { fixtures } from "../fixtures";

/** Vista previa con datos de ejemplo. Solo en desarrollo; en producción responde 404. */
export default async function DevPreview({ params }: { params: Promise<{ screen: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { screen } = await params;
  const tz = "America/New_York";
  const today = todayISO(tz);
  const { uid, providers, products, events } = fixtures(today);

  let body: React.ReactNode;
  switch (screen) {
    case "inicio":
      body = <DashboardView products={products} today={today} timezone={tz} firstName="Jane" userId={uid} />;
      break;
    case "vacio":
      body = <DashboardView products={[]} today={today} timezone={tz} firstName="Jane" userId={uid} />;
      break;
    case "productos":
      body = (
        <>
          <PageHeader title="Productos" />
          <Segmented items={PRODUCT_TABS} active="productos" />
          <Suspense>
            <ProductsBrowser products={products} today={today} userId={uid} />
          </Suspense>
        </>
      );
      break;
    case "agregar":
      body = (
        <div className="max-w-[640px]">
          <PageHeader title="Agregar producto" subtitle="La fecha y hora de registro se guardan solas." />
          <ProductForm providers={providers} today={today} />
        </div>
      );
      break;
    case "detalle":
      body = (
        <>
          <PageHeader back={{ href: "/productos", label: "Productos" }} />
          <ProductDetailView product={products[0]} events={events} photos={[]} today={today} timezone={tz} userId={uid} />
        </>
      );
      break;
    case "calendario":
      body = (
        <>
          <PageHeader title="Calendario" subtitle="Llegadas y reviews de cada día." />
          <Suspense>
            <CalendarView products={products} today={today} userId={uid} />
          </Suspense>
        </>
      );
      break;
    case "proveedores": {
      const stats = providerStats(providers, products);
      body = (
        <>
          <PageHeader title="Productos" />
          <Segmented items={PRODUCT_TABS} active="proveedores" />
          <ProvidersList providers={stats} />
          <div className="mt-8 max-w-md">
            <ProviderSummary provider={stats[0]} />
          </div>
        </>
      );
      break;
    }
    default:
      notFound();
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar isAdmin={false} version="1.0.0" />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-[1120px] px-4 pt-5 pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">{body}</main>
      </div>
      <BottomNav />
    </div>
  );
}
