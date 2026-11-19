import { format, parseISO, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import type { Product, StoreKind } from "../types";
import { addDaysISO, daysBetween } from "./dates";
import { displayStatus } from "./status";

type P = Pick<
  Product,
  "status" | "expected_arrival_date" | "review_due_date" | "requires_review" | "arrived_on" | "reviewed_on" | "store" | "registered_at"
>;

export function buildDashboard<T extends P>(products: T[], today: string) {
  const withStatus = products.map((p) => ({ p, s: displayStatus(p, today) }));
  const arrivalsToday = withStatus.filter((x) => x.s === "arrives_today").map((x) => x.p);
  const reviewsToday = withStatus.filter((x) => x.s === "review_today").map((x) => x.p);
  const overdue = withStatus.filter((x) => x.s === "review_overdue").map((x) => x.p);
  const unconfirmed = withStatus.filter((x) => x.s === "arrival_unconfirmed").map((x) => x.p);

  const month = today.slice(0, 7);
  const stats = {
    inTransit: withStatus.filter((x) => ["in_transit", "delayed", "arrives_today", "arrival_unconfirmed"].includes(x.s)).length,
    pendingReviews: withStatus.filter((x) => ["review_pending", "review_today", "review_overdue"].includes(x.s)).length,
    doneThisMonth: products.filter((p) => p.status === "completed" && p.requires_review && p.reviewed_on?.startsWith(month)).length,
    total: products.length,
  };

  // Próximos 7 días (sin contar hoy)
  const upcoming: { date: string; arrivals: T[]; reviews: T[] }[] = [];
  for (let i = 1; i <= 7; i++) {
    const date = addDaysISO(today, i);
    const arrivals = products.filter((p) => (p.status === "in_transit" || p.status === "delayed") && p.expected_arrival_date === date);
    const reviews = products.filter((p) => p.status === "received" && p.review_due_date === date);
    if (arrivals.length || reviews.length) upcoming.push({ date, arrivals, reviews });
  }

  // Recibidos por mes (últimos 6 meses, incluyendo el actual)
  const base = parseISO(`${month}-01`);
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(base, 5 - i);
    const key = format(d, "yyyy-MM");
    return {
      key,
      label: format(d, "MMM", { locale: es }).replace(".", ""),
      count: products.filter((p) => p.arrived_on?.startsWith(key)).length,
    };
  });

  const byStore = (Object.entries(
    products.reduce<Record<string, number>>((acc, p) => {
      acc[p.store] = (acc[p.store] ?? 0) + 1;
      return acc;
    }, {}),
  ) as [StoreKind, number][]).sort((a, b) => b[1] - a[1]);

  return { arrivalsToday, reviewsToday, overdue, unconfirmed, stats, upcoming, months, byStore };
}

/** Conteos para la notificación de las 8:00 a. m. */
export function digestCounts(products: P[], today: string) {
  let arrivals = 0, reviews = 0, overdue = 0, unconfirmed = 0;
  for (const p of products) {
    const s = displayStatus(p, today);
    if (s === "arrives_today") arrivals++;
    else if (s === "review_today") reviews++;
    else if (s === "review_overdue") overdue++;
    else if (s === "arrival_unconfirmed") unconfirmed++;
  }
  return { arrivals, reviews, overdue, unconfirmed };
}

export function overdueDays(dueISO: string, today: string) {
  return Math.max(0, daysBetween(dueISO, today));
}
