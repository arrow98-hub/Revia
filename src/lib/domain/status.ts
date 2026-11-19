import type { Product } from "../types";
import { daysBetween } from "./dates";

export type DisplayStatus =
  | "arrives_today"
  | "in_transit"
  | "arrival_unconfirmed"
  | "delayed"
  | "review_pending"
  | "review_today"
  | "review_overdue"
  | "review_done"
  | "received_no_review"
  | "cancelled"
  | "returned";

type StatusInput = Pick<
  Product,
  "status" | "expected_arrival_date" | "review_due_date" | "requires_review"
>;

/** Estado que ve la usuaria, derivado del estado guardado y de "hoy" (CLAUDE.md §4.4). */
export function displayStatus(p: StatusInput, today: string): DisplayStatus {
  switch (p.status) {
    case "in_transit":
    case "delayed": {
      const diff = daysBetween(today, p.expected_arrival_date);
      if (diff === 0) return "arrives_today";
      if (diff < 0) return "arrival_unconfirmed";
      return p.status === "delayed" ? "delayed" : "in_transit";
    }
    case "received": {
      if (!p.review_due_date) return "review_pending";
      const diff = daysBetween(today, p.review_due_date);
      if (diff === 0) return "review_today";
      if (diff < 0) return "review_overdue";
      return "review_pending";
    }
    case "completed":
      return p.requires_review ? "review_done" : "received_no_review";
    case "cancelled":
      return "cancelled";
    case "returned":
      return "returned";
  }
}

/** Agrupaciones usadas por los filtros de la lista de productos. */
export const STATUS_FILTERS = {
  all: { label: "Todos", match: () => true },
  arriving: {
    label: "En camino",
    match: (s: DisplayStatus) => ["arrives_today", "in_transit", "delayed", "arrival_unconfirmed"].includes(s),
  },
  to_review: {
    label: "Por reseñar",
    match: (s: DisplayStatus) => ["review_pending", "review_today", "review_overdue"].includes(s),
  },
  attention: {
    label: "Atención",
    match: (s: DisplayStatus) => ["review_overdue", "arrival_unconfirmed"].includes(s),
  },
  done: {
    label: "Completados",
    match: (s: DisplayStatus) => ["review_done", "received_no_review"].includes(s),
  },
  closed: {
    label: "Cancelados",
    match: (s: DisplayStatus) => ["cancelled", "returned"].includes(s),
  },
} as const;

export type StatusFilterKey = keyof typeof STATUS_FILTERS;

/** Prioridad para ordenar: lo urgente primero. */
export const STATUS_PRIORITY: Record<DisplayStatus, number> = {
  review_overdue: 0,
  arrival_unconfirmed: 1,
  review_today: 2,
  arrives_today: 3,
  review_pending: 4,
  delayed: 5,
  in_transit: 6,
  review_done: 7,
  received_no_review: 8,
  returned: 9,
  cancelled: 10,
};

/** Fecha relevante para ordenar "próximos vencimientos primero". */
export function relevantDate(p: Pick<Product, "status" | "expected_arrival_date" | "review_due_date" | "reviewed_on" | "arrived_on">): string {
  if (p.status === "received" && p.review_due_date) return p.review_due_date;
  if (p.status === "in_transit" || p.status === "delayed") return p.expected_arrival_date;
  return p.reviewed_on ?? p.arrived_on ?? p.expected_arrival_date;
}
