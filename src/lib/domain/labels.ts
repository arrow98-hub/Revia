import type { ContactChannel, ReviewType, StoreKind } from "../types";
import type { DisplayStatus } from "./status";

export const STORE_LABELS: Record<StoreKind, string> = {
  amazon: "Amazon",
  walmart: "Walmart",
  tiktok: "TikTok Shop",
  temu: "Temu",
  other: "Otra",
};

export const CONTACT_LABELS: Record<ContactChannel, string> = {
  messenger: "Messenger",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

export const REVIEW_TYPE_LABELS: Record<ReviewType, string> = {
  stars: "Estrellas",
  comment: "Comentario",
  photos: "Fotos",
  video: "Video",
};

export const STATUS_LABELS: Record<DisplayStatus, string> = {
  arrives_today: "Llega hoy",
  in_transit: "En camino",
  arrival_unconfirmed: "Llegada sin confirmar",
  delayed: "Retrasado",
  review_pending: "Review pendiente",
  review_today: "Review hoy",
  review_overdue: "Review vencido",
  review_done: "Review hecho",
  received_no_review: "Recibido · sin review",
  cancelled: "Cancelado",
  returned: "Devuelto",
};

export const EVENT_LABELS: Record<string, string> = {
  created: "Producto registrado",
  expected_date_changed: "Fecha estimada cambiada",
  marked_delayed: "Marcado como retrasado",
  arrived: "Llegó",
  arrival_undone: "Llegada deshecha",
  review_done: "Review hecho",
  review_undone: "Review deshecho",
  edited: "Datos editados",
  cancelled: "Cancelado",
  returned: "Devuelto",
  trashed: "Enviado a la papelera",
  restored: "Restaurado de la papelera",
  reactivated: "Reactivado",
};

/** Enlace para abrir el chat con el proveedor, si se puede construir. */
export function contactLink(channel: ContactChannel | null, handle: string | null): string | null {
  if (!channel || !handle) return null;
  const h = handle.trim().replace(/^@/, "");
  if (!h) return null;
  switch (channel) {
    case "whatsapp": {
      const digits = h.replace(/\D/g, "");
      return digits.length >= 7 ? `https://wa.me/${digits}` : null;
    }
    case "instagram":
      return `https://ig.me/m/${encodeURIComponent(h)}`;
    case "messenger":
      return `https://m.me/${encodeURIComponent(h)}`;
  }
}

/** Normaliza un link pegado: quita espacios, añade https:// si falta y valida. */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(candidate);
    if (!["http:", "https:"].includes(u.protocol) || !u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
