"use server";

import { randomInt, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAdminSupabase, getServerSupabase, getStatelessSupabase } from "@/lib/supabase/server";
import {
  CHALLENGE_COOKIE,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  decodeSession,
  encodeSession,
  hashLoginCode,
  safeEqualHex,
} from "@/lib/session";
import { sendLoginCodeEmail } from "@/lib/email";
import { buildCodePrefix } from "@/lib/domain/codes";
import { isValidTimezone } from "@/lib/domain/dates";

export type AuthState = { error?: string; info?: string } | undefined;

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_FAILED_LOGINS = 5; // por 15 min
const MAX_CODES_PER_HOUR = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

async function issueChallenge(userId: string, email: string) {
  const admin = getAdminSupabase();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("login_challenges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_CODES_PER_HOUR) {
    return { error: "Pediste demasiados códigos. Espera unos minutos e inténtalo de nuevo." } as const;
  }

  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error } = await admin.from("login_challenges").insert({
    id,
    user_id: userId,
    email,
    code_hash: hashLoginCode(id, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    ip: await clientIp(),
  });
  if (error) return { error: "No pudimos generar el código. Inténtalo de nuevo." } as const;

  try {
    await sendLoginCodeEmail(email, code);
  } catch (e) {
    console.error("[login] fallo enviando código", e);
    return { error: "No pudimos enviar el código a tu correo. Inténtalo de nuevo en un momento." } as const;
  }

  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CODE_TTL_MS / 1000,
  });
  return { ok: true } as const;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

/** Paso 1: correo + contraseña. Si es correcta, envía el código por email. */
export async function loginWithPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { email, password } = parsed.data;

  const admin = getAdminSupabase();
  const ip = await clientIp();
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count: failures } = await admin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .ilike("email", email)
    .eq("success", false)
    .gte("created_at", since);
  if ((failures ?? 0) >= MAX_FAILED_LOGINS) {
    return { error: "Demasiados intentos. Por seguridad, espera 15 minutos." };
  }

  const stateless = getStatelessSupabase();
  const { data, error } = await stateless.auth.signInWithPassword({ email, password });
  await admin.from("login_attempts").insert({ email, ip, success: !error });
  if (error || !data.session || !data.user) {
    return { error: "Correo o contraseña incorrectos." };
  }
  // La contraseña es válida, pero la sesión real solo se crea tras el código.
  await admin.auth.admin.signOut(data.session.access_token, "local").catch(() => undefined);

  const res = await issueChallenge(data.user.id, email);
  if ("error" in res) return { error: res.error };
  redirect("/login/codigo");
}

/** Reenvía un código nuevo para el reto en curso. */
export async function resendCode(): Promise<AuthState> {
  const jar = await cookies();
  const challengeId = jar.get(CHALLENGE_COOKIE)?.value;
  if (!challengeId) return { error: "Tu intento expiró. Vuelve a escribir tu contraseña." };
  const admin = getAdminSupabase();
  const { data: ch } = await admin.from("login_challenges").select("*").eq("id", challengeId).maybeSingle();
  if (!ch) return { error: "Tu intento expiró. Vuelve a escribir tu contraseña." };
  if (Date.now() - new Date(ch.created_at).getTime() < RESEND_COOLDOWN_MS) {
    return { error: "Espera un minuto antes de pedir otro código." };
  }
  // El código anterior deja de servir
  await admin.from("login_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);
  const res = await issueChallenge(ch.user_id, ch.email);
  if ("error" in res) return { error: res.error };
  return { info: "Te enviamos un código nuevo." };
}

/** Paso 2: verificar el código y crear la sesión real (válida 24 h). */
export async function verifyLoginCode(_: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { error: "El código tiene 6 dígitos." };

  const jar = await cookies();
  const challengeId = jar.get(CHALLENGE_COOKIE)?.value;
  if (!challengeId) return { error: "Tu intento expiró. Vuelve a escribir tu contraseña." };

  const admin = getAdminSupabase();
  const { data: ch } = await admin.from("login_challenges").select("*").eq("id", challengeId).maybeSingle();
  if (!ch || ch.consumed_at || new Date(ch.expires_at).getTime() < Date.now()) {
    return { error: "El código venció. Pide uno nuevo." };
  }
  if (ch.attempts >= MAX_CODE_ATTEMPTS) {
    return { error: "Demasiados intentos con este código. Pide uno nuevo." };
  }
  if (!safeEqualHex(hashLoginCode(ch.id, code), ch.code_hash)) {
    await admin.from("login_challenges").update({ attempts: ch.attempts + 1 }).eq("id", ch.id);
    const left = MAX_CODE_ATTEMPTS - ch.attempts - 1;
    return { error: left > 0 ? `Código incorrecto. Te quedan ${left} intentos.` : "Código incorrecto. Pide uno nuevo." };
  }
  await admin.from("login_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);

  // Crear la sesión de Supabase sin enviar correo: enlace mágico generado y verificado en el servidor.
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: ch.email });
  if (linkError || !link.properties?.hashed_token) return { error: "No pudimos iniciar tu sesión. Inténtalo de nuevo." };
  const supabase = await getServerSupabase();
  const { error: otpError } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (otpError) return { error: "No pudimos iniciar tu sesión. Inténtalo de nuevo." };

  const h = await headers();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const { data: sessionRow, error: sessionError } = await admin
    .from("user_sessions")
    .insert({ user_id: ch.user_id, expires_at: new Date(expiresAt).toISOString(), user_agent: h.get("user-agent")?.slice(0, 300) })
    .select("id")
    .single();
  if (sessionError || !sessionRow) return { error: "No pudimos iniciar tu sesión. Inténtalo de nuevo." };

  jar.set(SESSION_COOKIE, encodeSession({ sid: sessionRow.id, uid: ch.user_id, exp: expiresAt }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  jar.delete(CHALLENGE_COOKIE);
  redirect("/");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const session = decodeSession(jar.get(SESSION_COOKIE)?.value);
  if (session) {
    await getAdminSupabase().from("user_sessions").update({ revoked_at: new Date().toISOString() }).eq("id", session.sid);
  }
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, "Escribe tu nombre").max(60),
  lastName: z.string().trim().min(1, "Escribe tu primer apellido").max(60),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
  timezone: z.string().refine(isValidTimezone, "Zona horaria no válida"),
});

/** Bienvenida: nombre, apellido (→ prefijo de código), nueva contraseña y zona horaria. */
export async function completeOnboarding(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = onboardingSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    password: formData.get("password"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { firstName, lastName, password, timezone } = parsed.data;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: pwError } = await supabase.auth.updateUser({ password });
  if (pwError) {
    const same = pwError.message.toLowerCase().includes("different");
    return { error: same ? "La nueva contraseña debe ser distinta a la temporal." : "No pudimos guardar tu contraseña." };
  }

  const admin = getAdminSupabase();
  const { data: current } = await admin.from("profiles").select("code_prefix").eq("id", user.id).single();
  const { error } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      timezone,
      code_prefix: current?.code_prefix ?? buildCodePrefix(firstName, lastName),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) return { error: "No pudimos guardar tus datos. Inténtalo de nuevo." };
  redirect("/?bienvenida=1");
}
