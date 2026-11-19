import { timingSafeEqual } from "node:crypto";
import { getAdminSupabase } from "@/lib/supabase/server";
import { digestCounts } from "@/lib/domain/dashboard";
import { localTime, todayISO } from "@/lib/domain/dates";
import { digestText, sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIGEST_HOUR = 8;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Lo llama pg_cron cada 15 min (ver SETUP.md). Envía UN aviso al día por usuario,
 * a las 8:00 a. m. de su zona horaria, y solo si tiene algo pendiente (CLAUDE.md §7).
 */
async function handle(req: Request) {
  if (!authorized(req)) return new Response("No autorizado", { status: 401 });
  const admin = getAdminSupabase();
  const now = new Date();

  const { data: profiles, error } = await admin.from("profiles").select("id, timezone").not("onboarded_at", "is", null);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const due = (profiles ?? []).filter((p) => localTime(p.timezone, now).hour === DIGEST_HOUR);
  const results: { user: string; sent: number; skipped?: string }[] = [];

  for (const p of due) {
    const today = todayISO(p.timezone, now);
    const { data: already } = await admin
      .from("notification_log")
      .select("user_id")
      .eq("user_id", p.id)
      .eq("local_date", today)
      .eq("kind", "digest")
      .maybeSingle();
    if (already) continue;

    const { data: products } = await admin
      .from("products")
      .select("status, expected_arrival_date, review_due_date, requires_review, arrived_on, reviewed_on, store, registered_at")
      .eq("user_id", p.id)
      .is("deleted_at", null)
      .in("status", ["in_transit", "delayed", "received"]);

    const body = digestText(digestCounts(products ?? [], today));
    // Se registra aunque no haya nada, para no volver a evaluar al usuario hoy.
    await admin.from("notification_log").insert({ user_id: p.id, local_date: today, kind: "digest" });
    if (!body) {
      results.push({ user: p.id, sent: 0, skipped: "sin pendientes" });
      continue;
    }
    const sent = await sendPushToUser(p.id, { title: "Tu día en Revia", body, url: "/", tag: `digest-${today}` });
    results.push({ user: p.id, sent });
  }

  return Response.json({ checked: profiles?.length ?? 0, due: due.length, results });
}

export const GET = handle;
export const POST = handle;
