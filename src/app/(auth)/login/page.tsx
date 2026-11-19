import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expirada?: string }> }) {
  const { expirada } = await searchParams;
  return (
    <div className="rounded-[var(--radius-sheet)] border border-border bg-surface p-6 shadow-md sm:p-8">
      <h1 className="text-2xl font-bold">Hola de nuevo</h1>
      <p className="mt-1 text-[15px] text-muted">Entra para ver lo que tienes hoy.</p>
      {expirada ? (
        <p className="mt-5 rounded-lg bg-info-soft px-3 py-2.5 text-sm font-medium text-info">
          Por seguridad, tu sesión se cierra cada 24 horas. Vuelve a iniciar sesión.
        </p>
      ) : null}
      <LoginForm />
    </div>
  );
}
