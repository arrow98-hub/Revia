import "server-only";
import webpush from "web-push";
import { getAdminSupabase } from "./supabase/server";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

/** Envía a todos los dispositivos del usuario. Devuelve cuántos envíos funcionaron. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;
  const admin = getAdminSupabase();
  const { data: subs } = await admin.from("push_subscriptions").select("*").eq("user_id", userId);
  let ok = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 6, urgency: "normal" },
        );
        ok++;
        await admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString() }).eq("id", s.id);
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("[push] error", status, e);
        }
      }
    }),
  );
  return ok;
}

/** "Hoy: 2 llegadas, 1 review. 1 review vencido." */
export function digestText(c: { arrivals: number; reviews: number; overdue: number; unconfirmed: number }): string | null {
  const today: string[] = [];
  if (c.arrivals) today.push(`${c.arrivals} ${c.arrivals === 1 ? "llegada" : "llegadas"}`);
  if (c.reviews) today.push(`${c.reviews} ${c.reviews === 1 ? "review" : "reviews"}`);
  const attention: string[] = [];
  if (c.overdue) attention.push(`${c.overdue} ${c.overdue === 1 ? "review vencido" : "reviews vencidos"}`);
  if (c.unconfirmed) attention.push(`${c.unconfirmed} ${c.unconfirmed === 1 ? "llegada sin confirmar" : "llegadas sin confirmar"}`);
  if (!today.length && !attention.length) return null;
  const parts: string[] = [];
  if (today.length) parts.push(`Hoy: ${today.join(", ")}.`);
  if (attention.length) parts.push(`${attention.join(", ").replace(/^./, (m) => m.toUpperCase())}.`);
  return parts.join(" ");
}
