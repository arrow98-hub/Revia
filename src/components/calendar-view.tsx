"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarX2 } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { longDate } from "@/lib/domain/dates";
import type { ProductWithProvider } from "@/lib/types";
import { cn } from "@/lib/utils";

type DayInfo = { arrivals: ProductWithProvider[]; reviews: ProductWithProvider[]; overdue: boolean };
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

export function CalendarView({ products, today, userId }: { products: ProductWithProvider[]; today: string; userId: string }) {
  const params = useSearchParams();
  const initialDay = params.get("dia") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("dia")!) ? params.get("dia")! : today;
  const [selected, setSelected] = useState(initialDay);
  const [month, setMonth] = useState(() => startOfMonth(parseISO(initialDay)));

  const index = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const get = (d: string) => {
      if (!map.has(d)) map.set(d, { arrivals: [], reviews: [], overdue: false });
      return map.get(d)!;
    };
    for (const p of products) {
      if (p.status === "in_transit" || p.status === "delayed") get(p.expected_arrival_date).arrivals.push(p);
      if (p.status === "received" && p.review_due_date) {
        const info = get(p.review_due_date);
        info.reviews.push(p);
        if (p.review_due_date < today) info.overdue = true;
      }
    }
    return map;
  }, [products, today]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const sel = index.get(selected);
  const selItems = [...(sel?.reviews ?? []), ...(sel?.arrivals ?? [])];

  function swipe(start: number, end: number) {
    if (Math.abs(end - start) < 60) return;
    setMonth((m) => addMonths(m, end < start ? 1 : -1));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <section aria-label="Calendario" className="rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-xs sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold capitalize">{format(month, "MMMM yyyy", { locale: es })}</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setMonth(startOfMonth(parseISO(today)));
                setSelected(today);
              }}
            >
              Hoy
            </Button>
            <Button variant="ghost" size="icon" aria-label="Mes anterior" onClick={() => setMonth((m) => addMonths(m, -1))}>
              <ChevronLeft className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Mes siguiente" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight className="size-5" />
            </Button>
          </div>
        </div>

        <div
          className="grid grid-cols-7 gap-y-1"
          onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
          onTouchEnd={(e) => swipe(Number((e.currentTarget as HTMLElement).dataset.x), e.changedTouches[0].clientX)}
        >
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-semibold text-muted" aria-hidden>
              {d}
            </div>
          ))}
          {days.map((d) => {
            const iso = format(d, "yyyy-MM-dd");
            const info = index.get(iso);
            const inMonth = isSameMonth(d, month);
            const isToday = iso === today;
            const isSel = iso === selected;
            const label = [
              longDate(iso),
              info?.arrivals.length ? `${info.arrivals.length} llegadas` : null,
              info?.reviews.length ? `${info.reviews.length} reviews` : null,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <button
                key={iso}
                onClick={() => setSelected(iso)}
                aria-label={label}
                aria-pressed={isSel}
                className={cn(
                  "mx-auto flex h-12 w-full max-w-14 flex-col items-center justify-center gap-1 rounded-xl text-[15px] transition-colors sm:h-14",
                  !inMonth && "text-faint",
                  inMonth && !isSel && "text-ink hover:bg-bg-subtle",
                  isToday && !isSel && "bg-primary-soft font-bold text-primary",
                  isSel && "bg-primary font-bold text-white shadow-sm",
                )}
              >
                <span className="tabular leading-none">{format(d, "d")}</span>
                <span className="flex h-1.5 gap-0.5" aria-hidden>
                  {info?.arrivals.length ? <span className={cn("size-1.5 rounded-full", isSel ? "bg-white" : "bg-info")} /> : null}
                  {info?.reviews.length ? (
                    <span className={cn("size-1.5 rounded-full", isSel ? "bg-white/80" : info.overdue ? "bg-danger" : "bg-review")} />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-[13px] text-muted">
          <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-info" aria-hidden /> Llegada</li>
          <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-review" aria-hidden /> Review</li>
          <li className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-danger" aria-hidden /> Review vencido</li>
        </ul>
      </section>

      <section aria-live="polite">
        <h2 className="mb-3 text-[17px] font-bold first-letter:uppercase">{selected === today ? "Hoy" : longDate(selected)}</h2>
        {selItems.length ? (
          <ul className="flex flex-col gap-2">
            {selItems.map((p) => (
              <ProductCard key={`${p.id}-${p.status}`} product={p} today={today} userId={userId} />
            ))}
          </ul>
        ) : (
          <EmptyState
            className="rounded-[var(--radius-card)] border border-dashed border-border"
            icon={CalendarX2}
            title="Nada para este día"
            description="Los días con puntos tienen llegadas o reviews."
          />
        )}
      </section>
    </div>
  );
}
