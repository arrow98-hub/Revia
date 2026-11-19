import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CHALLENGE_COOKIE } from "@/lib/session";
import { CodeForm } from "./code-form";

export const metadata = { title: "Código de acceso" };

export default async function CodePage() {
  const jar = await cookies();
  if (!jar.get(CHALLENGE_COOKIE)) redirect("/login");
  return (
    <div className="rounded-[var(--radius-sheet)] border border-border bg-surface p-6 shadow-md sm:p-8">
      <h1 className="text-2xl font-bold">Revisa tu correo</h1>
      <p className="mt-1 text-[15px] text-muted">Escribe el código de 6 dígitos que te acabamos de enviar.</p>
      <CodeForm />
    </div>
  );
}
