import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSupabase } from "./supabase/server";
import { decodeSession, SESSION_COOKIE } from "./session";
import type { Profile } from "./types";
import { todayISO } from "./domain/dates";

/** Usuario autenticado + perfil. Redirige si no hay sesión válida (24 h). */
export const requireSession = cache(async (opts?: { allowNotOnboarded?: boolean }) => {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const session = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session || session.uid !== user.id) redirect("/login?expirada=1");

  const { data: sessionRow } = await supabase
    .from("user_sessions")
    .select("id, expires_at, revoked_at")
    .eq("id", session.sid)
    .maybeSingle();
  if (!sessionRow || sessionRow.revoked_at || new Date(sessionRow.expires_at).getTime() < Date.now()) {
    redirect("/login?expirada=1");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  if (!profile) redirect("/login");
  if (!profile.onboarded_at && !opts?.allowNotOnboarded) redirect("/bienvenida");

  return { supabase, user, profile, today: todayISO(profile.timezone) };
});

export async function requireAdmin() {
  const ctx = await requireSession();
  if (ctx.profile.role !== "admin") redirect("/");
  return ctx;
}
