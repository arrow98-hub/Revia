import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { CalendarView } from "@/components/calendar-view";
import { requireSession } from "@/lib/dal";
import { listProducts } from "@/lib/data";

export const metadata = { title: "Calendario" };

export default async function CalendarPage() {
  const { supabase, user, today } = await requireSession();
  const products = await listProducts(supabase, user.id);
  return (
    <div>
      <PageHeader title="Calendario" subtitle="Llegadas y reviews de cada día." />
      <Suspense>
        <CalendarView products={products} today={today} userId={user.id} />
      </Suspense>
    </div>
  );
}
