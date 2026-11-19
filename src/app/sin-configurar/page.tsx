import { LogoMark } from "@/components/logo";

export const metadata = { title: "Configuración pendiente" };

export default function NotConfigured() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <LogoMark className="size-12" />
      <h1 className="mt-6 text-2xl font-bold">Falta conectar Supabase</h1>
      <p className="mt-2 text-muted">
        Agrega <code className="rounded bg-bg-subtle px-1">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
        <code className="rounded bg-bg-subtle px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> a las variables de entorno y vuelve a
        desplegar. Los pasos están en <strong>SETUP.md</strong>.
      </p>
    </main>
  );
}
