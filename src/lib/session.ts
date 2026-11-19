import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cookie firmada que marca una sesión verificada con código.
 * Expira a las 24 h: después hay que volver a iniciar sesión (CLAUDE.md §5.3).
 */
export const SESSION_COOKIE = "revia_sid";
export const CHALLENGE_COOKIE = "revia_challenge";
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export interface SessionPayload {
  sid: string;
  uid: string;
  exp: number; // epoch ms
}

function secret(): string {
  const s = process.env.SESSION_COOKIE_SECRET;
  if (!s || s.length < 32) {
    if (process.env.NODE_ENV === "production") throw new Error("SESSION_COOKIE_SECRET debe tener al menos 32 caracteres");
    return "dev-only-secret-change-me-dev-only-secret";
  }
  return s;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Hash del código de 6 dígitos (nunca se guarda en claro). */
export function hashLoginCode(challengeId: string, code: string): string {
  return createHmac("sha256", secret()).update(`${challengeId}:${code}`).digest("hex");
}

export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
