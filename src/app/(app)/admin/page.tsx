import Link from "next/link";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, SectionTitle } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/dal";
import { PRODUCT_SELECT } from "@/lib/data";
import { displayStatus } from "@/lib/domain/status";
import { todayISO, shortDate } from "@/lib/domain/dates";
import type { Profile, ProductWithProvider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CreateUserButton } from "./create-user";

export const metadata = { title: "Administración" };

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ usuario?: string }> }) {
  const { supabase } = await requireAdmin();
  const { usuario } = await searchParams;
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at");
  const users = (profiles ?? []) as Profile[];

  const { data: all } = await supabase.from("products").select("user_id, status, deleted_at, product_photos(bytes)");
  const counts = new Map<string, { products: number; bytes: number }>();
  for (const p of (all ?? []) as { user_id: string; product_photos: { bytes: number | null }[] }[]) {
    const c = counts.get(p.user_id) ?? { products: 0, bytes: 0 };
    c.products++;
    c.bytes += p.product_photos.reduce((a, x) => a + (x.bytes ?? 0), 0);
    counts.set(p.user_id, c);
  }
  const totalMb = [...counts.values()].reduce((a, c) => a + c.bytes, 0) / 1024 / 1024;

  const selected = users.find((u) => u.id === usuario) ?? null;
  let products: ProductWithProvider[] = [];
  if (selected) {
    const { data } = await supabase.from("products").select(PRODUCT_SELECT).eq("user_id", selected.id).order("registered_at", { ascending: false });
    products = (data ?? []) as ProductWithProvider[];
  }
  const today = selected ? todayISO(selected.timezone) : "";

  return (
    <div>
      <PageHeader
        title="Administración"
        subtitle={`Solo lectura · ${users.length} usuarios · fotos: ${totalMb.toFixed(1)} MB de 1024 MB del plan gratuito`}
        actions={<CreateUserButton />}
      />
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section>
          <SectionTitle count={users.length}>Usuarios</SectionTitle>
          <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-xs">
            {users.map((u) => {
              const c = counts.get(u.id);
              return (
                <li key={u.id}>
                  <Link
                    href={`/admin?usuario=${u.id}`}
                    className={cn("block px-4 py-3 transition-colors hover:bg-bg-subtle", u.id === usuario && "bg-primary-soft")}
                  >
                    <p className="text-[15px] font-semibold">
                      {u.first_name ? `${u.first_name} ${u.last_name ?? ""}` : <span className="text-muted">Sin bienvenida</span>}
                      {u.role === "admin" ? <span className="ml-2 rounded-full bg-neutral-soft px-1.5 py-0.5 text-[11px] font-semibold text-neutral">admin</span> : null}
                    </p>
                    <p className="truncate text-[13px] text-muted">{u.email}</p>
                    <p className="tabular text-[13px] text-muted">
                      {u.code_prefix ?? "—"} · {c?.products ?? 0} productos · {((c?.bytes ?? 0) / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <section>
          {selected ? (
            <>
              <SectionTitle count={products.length}>Productos de {selected.first_name ?? selected.email}</SectionTitle>
              <ul className="flex flex-col gap-2">
                {products.map((p) => {
                  const s = displayStatus(p, today);
                  return (
                    <li key={p.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3 shadow-xs">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{p.name}</p>
                        <p className="text-[13px] text-muted">
                          <span className="code-tag text-neutral">{p.code}</span> · {p.provider?.name} · {shortDate(p.registered_at.slice(0, 10))}
                          {p.deleted_at ? " · en papelera" : ""}
                        </p>
                      </div>
                      <StatusBadge status={s} className="max-sm:hidden" />
                      <Link href={`/admin/producto/${p.id}`} aria-label={`Ver ${p.name}`} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-bg-subtle hover:text-ink">
                        <Eye className="size-[18px]" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <EmptyState className="rounded-[var(--radius-card)] border border-dashed border-border" icon={Eye} title="Elige una persona" description="Verás sus productos en modo solo lectura." />
          )}
        </section>
      </div>
    </div>
  );
}
