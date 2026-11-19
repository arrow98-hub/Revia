import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { decodeSession, SESSION_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/version", "/api/cron", "/sin-configurar", "/dev"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refresca la sesión de Supabase y aplica la regla de 24 h (CLAUDE.md §5.3).
 * Es una comprobación optimista: la autorización real está en RLS y en lib/dal.ts.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  if (!url || !anon) {
    if (isPublic(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/sin-configurar", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const valid = Boolean(user && session && session.uid === user.id);

  if (!valid && user) {
    // Pasaron las 24 h (o falta la verificación por código): cerrar sesión.
    await supabase.auth.signOut();
  }

  if (!valid && !isPublic(pathname)) {
    const to = new URL("/login", request.url);
    if (user) to.searchParams.set("expirada", "1");
    const redirect = NextResponse.redirect(to);
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    redirect.cookies.delete(SESSION_COOKIE);
    return redirect;
  }

  if (valid && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|icons/|logo.svg|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
