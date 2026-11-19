"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/dal";
import { normalizeUrl } from "@/lib/domain/labels";
import { fetchPreviewImage } from "@/lib/link-preview";
import { getAdminSupabase } from "@/lib/supabase/server";
import { isValidTimezone } from "@/lib/domain/dates";
import type { ActionResult } from "@/lib/utils";
import type { Product } from "@/lib/types";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");
const note = z.string().trim().max(2000).optional().transform((v) => (v ? v : null));

function refreshAll() {
  revalidatePath("/", "layout");
}

// ─── Producto: crear / editar ────────────────────────────────────

const productSchema = z
  .object({
    requiresReview: z.boolean(),
    name: z.string().trim().min(1, "Escribe el nombre del producto").max(200),
    url: z.string().trim().max(2048).optional().default(""),
    store: z.enum(["amazon", "walmart", "tiktok", "temu", "other"]),
    storeOther: z.string().trim().max(60).optional().default(""),
    providerName: z.string().trim().min(1, "Escribe o elige un proveedor").max(120),
    contactChannel: z.enum(["messenger", "instagram", "whatsapp"]).nullable(),
    contactHandle: z.string().trim().max(120).optional().default(""),
    reviewTypes: z.array(z.enum(["stars", "comment", "photos", "video"])).default([]),
    reviewDays: z.number().int().min(1, "Mínimo 1 día").max(90, "Máximo 90 días").nullable(),
    expectedArrivalDate: isoDate,
    notes: z.string().trim().max(4000).optional().default(""),
  })
  .superRefine((v, ctx) => {
    if (v.store === "other" && !v.storeOther) ctx.addIssue({ code: "custom", path: ["storeOther"], message: "Escribe el nombre de la tienda" });
    if (v.requiresReview && !v.reviewDays) ctx.addIssue({ code: "custom", path: ["reviewDays"], message: "Elige los días para el review" });
    if (v.url && !normalizeUrl(v.url)) ctx.addIssue({ code: "custom", path: ["url"], message: "El link no parece válido" });
  });

export type ProductInput = z.input<typeof productSchema>;

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

async function findOrCreateProvider(
  supabase: Awaited<ReturnType<typeof requireSession>>["supabase"],
  userId: string,
  name: string,
  channel: string | null,
  handle: string,
) {
  const { data: existing } = await supabase
    .from("providers")
    .select("id, contact_channel, contact_handle")
    .eq("user_id", userId)
    .ilike("name", name.replace(/[%_]/g, (c) => `\\${c}`))
    .is("deleted_at", null)
    .maybeSingle();
  if (existing) {
    const patch: Record<string, string> = {};
    if (handle && !existing.contact_handle) patch.contact_handle = handle;
    if (channel && !existing.contact_channel) patch.contact_channel = channel;
    if (Object.keys(patch).length) await supabase.from("providers").update(patch).eq("id", existing.id);
    return existing.id as string;
  }
  const { data, error } = await supabase
    .from("providers")
    .insert({ name, contact_channel: channel, contact_handle: handle || null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

function schedulePreview(productId: string, url: string | null) {
  if (!url) return;
  after(async () => {
    const image = await fetchPreviewImage(url);
    if (!image) return;
    try {
      await getAdminSupabase().from("products").update({ image_url: image }).eq("id", productId);
    } catch {
      /* best-effort */
    }
  });
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ id: string; code: string }>> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const { supabase, user } = await requireSession();

  try {
    const providerId = await findOrCreateProvider(supabase, user.id, v.providerName, v.contactChannel, v.contactHandle);
    const url = v.url ? normalizeUrl(v.url) : null;
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: v.name,
        url,
        store: v.store,
        store_other: v.store === "other" ? v.storeOther : null,
        provider_id: providerId,
        contact_channel: v.contactChannel,
        requires_review: v.requiresReview,
        review_types: v.requiresReview ? v.reviewTypes : [],
        review_days: v.requiresReview ? v.reviewDays : null,
        expected_arrival_date: v.expectedArrivalDate,
        notes: v.notes || null,
      })
      .select("id, code")
      .single();
    if (error) throw error;
    await supabase.from("product_events").insert({ product_id: data.id, type: "created", payload: { expected: v.expectedArrivalDate } });
    schedulePreview(data.id, url);
    refreshAll();
    return { ok: true, data };
  } catch (e) {
    console.error("[createProduct]", e);
    return { ok: false, error: "No pudimos guardar el producto. Inténtalo de nuevo." };
  }
}

export async function updateProduct(id: string, input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  const { supabase, user } = await requireSession();
  const { data: current } = await supabase.from("products").select("*").eq("id", id).eq("user_id", user.id).single<Product>();
  if (!current) return { ok: false, error: "Producto no encontrado" };

  try {
    const providerId = await findOrCreateProvider(supabase, user.id, v.providerName, v.contactChannel, v.contactHandle);
    const url = v.url ? normalizeUrl(v.url) : null;
    const patch = {
      name: v.name,
      url,
      image_url: url === current.url ? current.image_url : null,
      store: v.store,
      store_other: v.store === "other" ? v.storeOther : null,
      provider_id: providerId,
      contact_channel: v.contactChannel,
      requires_review: v.requiresReview,
      review_types: v.requiresReview ? v.reviewTypes : [],
      review_days: v.requiresReview ? v.reviewDays : null,
      expected_arrival_date: v.expectedArrivalDate,
      notes: v.notes || null,
      // Si deja de llevar review y ya llegó, se completa; si pasa a llevarlo, vuelve a pendiente.
      status:
        current.status === "received" && !v.requiresReview
          ? "completed"
          : current.status === "completed" && v.requiresReview && !current.requires_review
            ? "received"
            : current.status,
    };
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) throw error;

    const events: { product_id: string; type: string; payload: object }[] = [];
    if (current.expected_arrival_date !== v.expectedArrivalDate) {
      events.push({ product_id: id, type: "expected_date_changed", payload: { from: current.expected_arrival_date, to: v.expectedArrivalDate } });
    }
    events.push({ product_id: id, type: "edited", payload: {} });
    await supabase.from("product_events").insert(events);
    if (url && url !== current.url) schedulePreview(id, url);
    refreshAll();
    return { ok: true };
  } catch (e) {
    console.error("[updateProduct]", e);
    return { ok: false, error: "No pudimos guardar los cambios." };
  }
}

// ─── Fotos ────────────────────────────────────────────────────────

const photoSchema = z.object({
  path: z.string().min(10).max(400),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  bytes: z.number().int().positive().nullable(),
});
export type UploadedPhoto = z.infer<typeof photoSchema>;

async function registerPhotos(
  supabase: Awaited<ReturnType<typeof requireSession>>["supabase"],
  userId: string,
  productId: string,
  kind: "arrival" | "review",
  photos: UploadedPhoto[],
) {
  const valid = z.array(photoSchema).max(20).parse(photos).filter((p) => p.path.startsWith(`${userId}/${productId}/${kind}/`));
  if (valid.length === 0) return;
  const { error } = await supabase.from("product_photos").insert(
    valid.map((p) => ({ product_id: productId, kind, storage_path: p.path, width: p.width, height: p.height, bytes: p.bytes })),
  );
  if (error) throw error;
}

export async function addPhotos(productId: string, kind: "arrival" | "review", photos: UploadedPhoto[]): Promise<ActionResult> {
  const { supabase, user } = await requireSession();
  try {
    await registerPhotos(supabase, user.id, productId, kind, photos);
    revalidatePath(`/productos/${productId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "No pudimos guardar las fotos." };
  }
}

export async function removePhoto(photoId: string): Promise<ActionResult> {
  const { supabase, user } = await requireSession();
  const { data: photo } = await supabase.from("product_photos").select("*").eq("id", photoId).eq("user_id", user.id).maybeSingle();
  if (!photo) return { ok: false, error: "Foto no encontrada" };
  await supabase.storage.from("product-photos").remove([photo.storage_path]);
  await supabase.from("product_photos").delete().eq("id", photoId);
  revalidatePath(`/productos/${photo.product_id}`);
  return { ok: true };
}

// ─── Transiciones de estado ──────────────────────────────────────

async function loadOwn(id: string) {
  const ctx = await requireSession();
  const { data } = await ctx.supabase.from("products").select("*").eq("id", id).eq("user_id", ctx.user.id).single<Product>();
  return { ...ctx, product: data };
}

async function transition(
  id: string,
  allowed: Product["status"][],
  patch: (p: Product) => Partial<Product>,
  event: (p: Product) => { type: string; payload?: object; note?: string | null },
  after_?: (ctx: Awaited<ReturnType<typeof loadOwn>>) => Promise<void>,
): Promise<ActionResult> {
  const ctx = await loadOwn(id);
  const { supabase, product } = ctx;
  if (!product || product.deleted_at) return { ok: false, error: "Producto no encontrado" };
  if (!allowed.includes(product.status)) return { ok: false, error: "Esta acción ya no aplica a este producto." };
  const { error } = await supabase.from("products").update(patch(product)).eq("id", id);
  if (error) {
    console.error("[transition]", error);
    return { ok: false, error: "No pudimos guardar el cambio." };
  }
  const e = event(product);
  await supabase.from("product_events").insert({ product_id: id, type: e.type, payload: e.payload ?? {}, note: e.note ?? null });
  if (after_) await after_(ctx);
  refreshAll();
  return { ok: true };
}

const arrivalSchema = z.object({ date: isoDate, note, photos: z.array(photoSchema).default([]) });

export async function markArrived(id: string, input: z.input<typeof arrivalSchema>): Promise<ActionResult> {
  const parsed = arrivalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa la fecha de llegada." };
  const { date, note: n, photos } = parsed.data;
  const ctx = await requireSession();
  if (date > ctx.today) return { ok: false, error: "La fecha de llegada no puede ser futura." };
  return transition(
    id,
    ["in_transit", "delayed"],
    (p) => ({ status: p.requires_review ? "received" : "completed", arrived_on: date }),
    () => ({ type: "arrived", payload: { date }, note: n }),
    async ({ supabase, user }) => registerPhotos(supabase, user.id, id, "arrival", photos),
  );
}

const dateNoteSchema = z.object({ date: isoDate, note });

export async function markDelayed(id: string, input: z.input<typeof dateNoteSchema>): Promise<ActionResult> {
  const parsed = dateNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Elige la nueva fecha." };
  const { date, note: n } = parsed.data;
  return transition(
    id,
    ["in_transit", "delayed"],
    () => ({ status: "delayed", expected_arrival_date: date }),
    (p) => ({ type: "marked_delayed", payload: { from: p.expected_arrival_date, to: date }, note: n }),
  );
}

export async function changeExpectedDate(id: string, input: z.input<typeof dateNoteSchema>): Promise<ActionResult> {
  const parsed = dateNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Elige la nueva fecha." };
  const { date, note: n } = parsed.data;
  return transition(
    id,
    ["in_transit", "delayed"],
    () => ({ expected_arrival_date: date }),
    (p) => ({ type: "expected_date_changed", payload: { from: p.expected_arrival_date, to: date }, note: n }),
  );
}

const reviewSchema = z.object({ date: isoDate, note, photos: z.array(photoSchema).default([]) });

export async function markReviewed(id: string, input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa la fecha." };
  const { date, note: n, photos } = parsed.data;
  return transition(
    id,
    ["received"],
    () => ({ status: "completed", reviewed_on: date }),
    () => ({ type: "review_done", payload: { date }, note: n }),
    async ({ supabase, user }) => registerPhotos(supabase, user.id, id, "review", photos),
  );
}

export async function undoArrival(id: string): Promise<ActionResult> {
  return transition(
    id,
    ["received", "completed"],
    (p) => (p.status === "completed" && p.requires_review ? {} : { status: "in_transit", arrived_on: null, reviewed_on: null }),
    () => ({ type: "arrival_undone" }),
  );
}

export async function undoReview(id: string): Promise<ActionResult> {
  return transition(
    id,
    ["completed"],
    (p) => (p.requires_review ? { status: "received", reviewed_on: null } : {}),
    () => ({ type: "review_undone" }),
  );
}

export async function cancelProduct(id: string): Promise<ActionResult> {
  return transition(id, ["in_transit", "delayed"], () => ({ status: "cancelled" }), () => ({ type: "cancelled" }));
}

export async function markReturned(id: string): Promise<ActionResult> {
  return transition(id, ["received", "completed"], () => ({ status: "returned" }), () => ({ type: "returned" }));
}

export async function reactivateProduct(id: string): Promise<ActionResult> {
  return transition(
    id,
    ["cancelled", "returned"],
    (p) => (p.arrived_on ? { status: p.requires_review && !p.reviewed_on ? "received" : "completed" } : { status: "in_transit" }),
    () => ({ type: "reactivated" }),
  );
}

// ─── Papelera ─────────────────────────────────────────────────────

export async function trashProduct(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireSession();
  const { error } = await supabase.from("products").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "No pudimos enviarlo a la papelera." };
  await supabase.from("product_events").insert({ product_id: id, type: "trashed" });
  refreshAll();
  return { ok: true };
}

export async function restoreProduct(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireSession();
  const { error } = await supabase.from("products").update({ deleted_at: null }).eq("id", id).eq("user_id", user.id);
  if (error) return { ok: false, error: "No pudimos restaurarlo." };
  await supabase.from("product_events").insert({ product_id: id, type: "restored" });
  refreshAll();
  return { ok: true };
}

// ─── Proveedores ──────────────────────────────────────────────────

const providerSchema = z.object({
  name: z.string().trim().min(1, "Escribe el nombre").max(120),
  contactChannel: z.enum(["messenger", "instagram", "whatsapp"]).nullable(),
  contactHandle: z.string().trim().max(120).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export async function updateProvider(id: string, input: z.input<typeof providerSchema>): Promise<ActionResult> {
  const parsed = providerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const v = parsed.data;
  const { supabase, user } = await requireSession();
  const { error } = await supabase
    .from("providers")
    .update({ name: v.name, contact_channel: v.contactChannel, contact_handle: v.contactHandle || null, notes: v.notes || null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return { ok: false, error: error.code === "23505" ? "Ya tienes un proveedor con ese nombre." : "No pudimos guardar el proveedor." };
  }
  refreshAll();
  return { ok: true };
}

// ─── Perfil y notificaciones ──────────────────────────────────────

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Escribe tu nombre").max(60),
  lastName: z.string().trim().min(1, "Escribe tu apellido").max(60),
  timezone: z.string().refine(isValidTimezone, "Zona horaria no válida"),
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const { supabase, user } = await requireSession();
  const { error } = await supabase
    .from("profiles")
    .update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, timezone: parsed.data.timezone })
    .eq("id", user.id);
  if (error) return { ok: false, error: "No pudimos guardar tu perfil." };
  refreshAll();
  return { ok: true };
}

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});

export async function savePushSubscription(sub: z.input<typeof subscriptionSchema>, userAgent: string): Promise<ActionResult> {
  const parsed = subscriptionSchema.safeParse(sub);
  if (!parsed.success) return { ok: false, error: "Suscripción no válida" };
  const { user } = await requireSession();
  // service_role: el endpoint es único global y puede estar ligado a una sesión anterior del mismo dispositivo
  const admin = getAdminSupabase();
  const { error } = await admin.from("push_subscriptions").upsert(
    { user_id: user.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, user_agent: userAgent.slice(0, 300) },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false, error: "No pudimos activar las notificaciones." };
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult> {
  const { supabase } = await requireSession();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { ok: true };
}

export async function sendTestNotification(): Promise<ActionResult> {
  const { user } = await requireSession();
  const { sendPushToUser } = await import("@/lib/push");
  const sent = await sendPushToUser(user.id, {
    title: "Revia",
    body: "¡Listo! Así te llegará el resumen de cada mañana.",
    url: "/",
    tag: "revia-test",
  });
  return sent > 0 ? { ok: true } : { ok: false, error: "No encontramos este dispositivo. Activa las notificaciones primero." };
}
