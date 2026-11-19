import { addDaysISO } from "@/lib/domain/dates";
import type { ProductEvent, ProductWithProvider, Provider } from "@/lib/types";

/** Datos de ejemplo SOLO para la vista previa en desarrollo (/dev/*). */
export function fixtures(today: string) {
  const uid = "00000000-0000-0000-0000-000000000001";
  const providers: Provider[] = [
    { id: "p1", user_id: uid, name: "HomeLux Store", contact_channel: "whatsapp", contact_handle: "+1 305 555 0101", notes: "Siempre envía rápido.", created_at: "2026-06-01T12:00:00Z", deleted_at: null },
    { id: "p2", user_id: uid, name: "Bella Beauty Co.", contact_channel: "instagram", contact_handle: "@bellabeauty", notes: null, created_at: "2026-07-10T12:00:00Z", deleted_at: null },
    { id: "p3", user_id: uid, name: "TechNova", contact_channel: "messenger", contact_handle: null, notes: null, created_at: "2026-08-02T12:00:00Z", deleted_at: null },
    { id: "p4", user_id: uid, name: "Cocina Feliz", contact_channel: "whatsapp", contact_handle: null, notes: null, created_at: "2026-09-12T12:00:00Z", deleted_at: null },
  ];
  const pv = (id: string) => ({ id, name: providers.find((p) => p.id === id)!.name });
  let n = 0;
  const mk = (o: Partial<ProductWithProvider> & { provider_id: string; name: string }): ProductWithProvider => {
    n++;
    const reviewDays = o.requires_review === false ? null : (o.review_days ?? 7);
    const arrived = o.arrived_on ?? null;
    return {
      id: `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
      user_id: uid,
      code: `JADO-${String(n).padStart(5, "0")}`,
      contact_channel: "whatsapp",
      store: "amazon",
      store_other: null,
      url: "https://www.amazon.com/dp/B0EXAMPLE",
      image_url: null,
      requires_review: true,
      review_types: ["stars", "comment"],
      status: "in_transit",
      registered_at: `${addDaysISO(today, -10 - n)}T14:20:00Z`,
      expected_arrival_date: today,
      reviewed_on: null,
      notes: null,
      deleted_at: null,
      created_at: "",
      updated_at: "",
      ...o,
      review_days: reviewDays,
      arrived_on: arrived,
      review_due_date: o.requires_review !== false && arrived && reviewDays ? addDaysISO(arrived, reviewDays) : null,
      provider: pv(o.provider_id),
    } as ProductWithProvider;
  };
  const products: ProductWithProvider[] = [
    mk({ name: "Lámpara LED de escritorio con carga inalámbrica", provider_id: "p1", expected_arrival_date: today, review_types: ["stars", "photos"] }),
    mk({ name: "Set de brochas de maquillaje (12 piezas)", provider_id: "p2", store: "tiktok", expected_arrival_date: today, contact_channel: "instagram" }),
    mk({ name: "Organizador de cocina giratorio", provider_id: "p4", status: "received", arrived_on: addDaysISO(today, -7), review_days: 7, review_types: ["stars", "comment", "photos"] }),
    mk({ name: "Audífonos inalámbricos deportivos", provider_id: "p3", status: "received", arrived_on: addDaysISO(today, -10), review_days: 7, review_types: ["stars", "video"], contact_channel: "messenger" }),
    mk({ name: "Botella térmica 1 L", provider_id: "p1", expected_arrival_date: addDaysISO(today, -2) }),
    mk({ name: "Cargador portátil 20.000 mAh", provider_id: "p3", status: "delayed", expected_arrival_date: addDaysISO(today, 3), store: "walmart" }),
    mk({ name: "Sérum facial vitamina C", provider_id: "p2", status: "received", arrived_on: addDaysISO(today, -2), review_days: 14, review_types: ["photos"] }),
    mk({ name: "Cuchillos de cerámica", provider_id: "p4", expected_arrival_date: addDaysISO(today, 1), review_days: 3 }),
    mk({ name: "Funda para tablet 10\"", provider_id: "p3", expected_arrival_date: addDaysISO(today, 4), requires_review: false, review_types: [] }),
    mk({ name: "Cortina blackout", provider_id: "p1", status: "completed", arrived_on: addDaysISO(today, -20), reviewed_on: addDaysISO(today, -15), review_types: ["stars"] }),
    mk({ name: "Rizador de pestañas", provider_id: "p2", status: "completed", arrived_on: addDaysISO(today, -40), reviewed_on: addDaysISO(today, -35), store: "temu" }),
    mk({ name: "Tapete de yoga", provider_id: "p1", status: "completed", arrived_on: addDaysISO(today, -60), requires_review: false, review_types: [] }),
    mk({ name: "Mini licuadora portátil", provider_id: "p4", status: "completed", arrived_on: addDaysISO(today, -90), reviewed_on: addDaysISO(today, -84) }),
    mk({ name: "Soporte de celular para auto", provider_id: "p3", status: "cancelled", expected_arrival_date: addDaysISO(today, -5) }),
  ];
  const events: ProductEvent[] = [
    { id: "e3", product_id: products[0].id, type: "expected_date_changed", payload: { from: addDaysISO(today, -1), to: today }, note: "Amazon adelantó la entrega", created_at: `${addDaysISO(today, -1)}T15:02:00Z` },
    { id: "e2", product_id: products[0].id, type: "marked_delayed", payload: { from: addDaysISO(today, -3), to: addDaysISO(today, -1) }, note: null, created_at: `${addDaysISO(today, -3)}T13:40:00Z` },
    { id: "e1", product_id: products[0].id, type: "created", payload: { expected: addDaysISO(today, -3) }, note: null, created_at: `${addDaysISO(today, -6)}T12:10:00Z` },
  ];
  return { uid, providers, products, events };
}
