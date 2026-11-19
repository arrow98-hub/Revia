import Link from "next/link";
import { AlertCircle, CalendarCheck, ChevronRight, PackageCheck, Sun } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState, SectionTitle } from "@/components/ui/misc";
import { buildDashboard } from "@/lib/domain/dashboard";
import { greeting, longDate, relativeDay, shortDate } from "@/lib/domain/dates";
import { STORE_LABELS } from "@/lib/domain/labels";
import type { ProductWithProvider } from "@/lib/types";
import { MonthlyBars } from "./activity-chart";
import { SetupCard } from "./setup-card";

export function DashboardView({
  products,
  today,
  timezone,
  firstName,
  userId,
}: {
  products: ProductWithProvider[];
  today: string;
  timezone: string;
  firstName: string;
  userId: string;
}) {
  const d = buildDashboard(products, today);
  const attention = [...d.overdue, ...d.unconfirmed];
  const nothingToday = d.arrivalsToday.length + d.reviewsToday.length + attention.length === 0;
  const storeMax = Math.max(1, ...d.byStore.map(([, n]) => n));

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-[26px] leading-tight font-bold lg:text-[30px]">
          {greeting(timezone)}, {firstName}
        </h1>
        <p className="mt-1 text-[15px] text-muted first-letter:uppercase">{longDate(today)}</p>
      </header>

      <SetupCard />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-8">
          {nothingToday ? (
            <section className="rounded-[var(--radius-card)] border border-border bg-surface shadow-xs">
              <EmptyState
                icon={Sun}
                title="Hoy no tienes pendientes"
                description={d.upcoming.length ? "Disfruta el día. Abajo tienes lo que viene esta semana." : "Disfruta el día. Cuando agregues productos, aquí verás lo que toca."}
                action={
                  products.length === 0 ? (
                    <Link href="/agregar" className="font-semibold text-primary">
                      Agregar mi primer producto
                    </Link>
                  ) : undefined
                }
              />
            </section>
          ) : null}

          {attention.length ? (
            <section aria-labelledby="sec-attention">
              <SectionTitle count={attention.length}>
                <AlertCircle className="size-5 text-danger" aria-hidden />
                <span id="sec-attention">Necesita tu atención</span>
              </SectionTitle>
              <ul className="flex flex-col gap-2">
                {attention.map((p) => (
                  <ProductCard key={p.id} product={p} today={today} userId={userId} />
                ))}
              </ul>
            </section>
          ) : null}

          {d.arrivalsToday.length ? (
            <section aria-labelledby="sec-arrivals">
              <SectionTitle count={d.arrivalsToday.length}>
                <PackageCheck className="size-5 text-primary" aria-hidden />
                <span id="sec-arrivals">Llegan hoy</span>
              </SectionTitle>
              <ul className="flex flex-col gap-2">
                {d.arrivalsToday.map((p) => (
                  <ProductCard key={p.id} product={p} today={today} userId={userId} />
                ))}
              </ul>
            </section>
          ) : null}

          {d.reviewsToday.length ? (
            <section aria-labelledby="sec-reviews">
              <SectionTitle count={d.reviewsToday.length}>
                <CalendarCheck className="size-5 text-review" aria-hidden />
                <span id="sec-reviews">Reviews para hoy</span>
              </SectionTitle>
              <ul className="flex flex-col gap-2">
                {d.reviewsToday.map((p) => (
                  <ProductCard key={p.id} product={p} today={today} userId={userId} />
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="sec-week">
            <SectionTitle
              action={
                <Link href="/calendario" className="inline-flex items-center text-sm font-semibold text-primary">
                  Calendario <ChevronRight className="size-4" aria-hidden />
                </Link>
              }
            >
              <span id="sec-week">Próximos 7 días</span>
            </SectionTitle>
            {d.upcoming.length ? (
              <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-xs">
                {d.upcoming.map((day) => (
                  <li key={day.date}>
                    <Link href={`/calendario?dia=${day.date}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-subtle">
                      <div className="w-24 shrink-0">
                        <p className="text-[15px] font-semibold">{relativeDay(day.date, today)}</p>
                        <p className="text-[13px] text-muted">{shortDate(day.date)}</p>
                      </div>
                      <p className="flex-1 text-sm text-neutral">
                        {[
                          day.arrivals.length ? `${day.arrivals.length} ${day.arrivals.length === 1 ? "llegada" : "llegadas"}` : null,
                          day.reviews.length ? `${day.reviews.length} ${day.reviews.length === 1 ? "review" : "reviews"}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <ChevronRight className="size-4 text-faint" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[var(--radius-card)] border border-dashed border-border px-4 py-5 text-sm text-muted">
                Nada programado para esta semana.
              </p>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-8">
          <section aria-labelledby="sec-summary">
            <SectionTitle>
              <span id="sec-summary">Resumen</span>
            </SectionTitle>
            <dl className="grid grid-cols-2 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-xs">
              {[
                { label: "En camino", value: d.stats.inTransit, href: "/productos?estado=arriving" },
                { label: "Reviews pendientes", value: d.stats.pendingReviews, href: "/productos?estado=to_review" },
                { label: "Hechos este mes", value: d.stats.doneThisMonth, href: "/productos?estado=done" },
                { label: "Total de productos", value: d.stats.total, href: "/productos" },
              ].map((s, i) => (
                <Link
                  key={s.label}
                  href={s.href}
                  className={`flex flex-col gap-0.5 px-4 py-3.5 transition-colors hover:bg-bg-subtle ${i % 2 === 0 ? "border-r border-border" : ""} ${i < 2 ? "border-b border-border" : ""}`}
                >
                  <dt className="order-2 text-[13px] text-muted">{s.label}</dt>
                  <dd className="tabular order-1 text-2xl font-bold text-ink">{s.value}</dd>
                </Link>
              ))}
            </dl>
          </section>

          {products.length > 0 ? (
            <details className="group rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-xs" open>
              <summary className="flex cursor-pointer list-none items-center justify-between text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                Tu actividad
                <ChevronRight className="size-4 text-muted transition-transform group-open:rotate-90" aria-hidden />
              </summary>
              <div className="mt-4">
                <MonthlyBars months={d.months} />
              </div>
              <div className="mt-6">
                <p className="mb-2.5 text-sm font-semibold">Por tienda</p>
                <ul className="flex flex-col gap-2">
                  {d.byStore.map(([store, n]) => (
                    <li key={store} className="grid grid-cols-[88px_1fr_32px] items-center gap-2 text-sm">
                      <span className="truncate text-neutral">{STORE_LABELS[store]}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-neutral-soft">
                        <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(n / storeMax) * 100}%` }} />
                      </span>
                      <span className="tabular text-right font-semibold">{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
