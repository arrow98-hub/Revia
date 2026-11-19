import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireSession } from "@/lib/dal";
import { listProducts } from "@/lib/data";

export const metadata = { title: "Inicio" };

export default async function HomePage() {
  const { supabase, user, profile, today } = await requireSession();
  const products = await listProducts(supabase, user.id);
  return (
    <DashboardView
      products={products}
      today={today}
      timezone={profile.timezone}
      firstName={profile.first_name ?? ""}
      userId={user.id}
    />
  );
}
