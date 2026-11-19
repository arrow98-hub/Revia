import Link from "next/link";
import { ChevronRight, LogOut, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { ExportCard, NotificationSettings, ProfileForm } from "@/components/settings-client";
import { requireSession } from "@/lib/dal";
import { logout } from "@/app/(auth)/actions";

export const metadata = { title: "Ajustes" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-xs sm:p-5">
      <h2 className="mb-4 text-[17px] font-bold">{title}</h2>
      {children}
    </section>
  );
}

function LinkRow({ href, icon, children, hint }: { href: string; icon: ReactNode; children: ReactNode; hint?: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-subtle">
      <span className="text-muted">{icon}</span>
      <span className="flex-1 text-[15px] font-semibold">{children}</span>
      {hint ? <span className="tabular text-sm text-muted">{hint}</span> : null}
      <ChevronRight className="size-4 text-faint" aria-hidden />
    </Link>
  );
}

export default async function SettingsPage() {
  const { supabase, user, profile } = await requireSession();
  const { count: trashed } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .not("deleted_at", "is", null);
  const version = process.env.NEXT_PUBLIC_APP_VERSION;

  return (
    <div className="max-w-[720px]">
      <PageHeader title="Ajustes" subtitle={profile.email ?? undefined} />
      <div className="flex flex-col gap-5">
        <Section title="Perfil">
          <div className="mb-4 rounded-xl bg-bg-subtle px-4 py-3">
            <p className="text-sm text-muted">Tu código de productos</p>
            <p className="code-tag text-lg">{profile.code_prefix}-00001</p>
            <p className="text-[13px] text-muted">No se puede cambiar.</p>
          </div>
          <ProfileForm firstName={profile.first_name ?? ""} lastName={profile.last_name ?? ""} timezone={profile.timezone} />
        </Section>

        <Section title="Notificaciones">
          <NotificationSettings />
        </Section>

        <nav aria-label="Más opciones" className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-xs">
          <LinkRow href="/ajustes/papelera" icon={<Trash2 className="size-5" />} hint={trashed ? String(trashed) : undefined}>
            Papelera
          </LinkRow>
          <LinkRow href="/ajustes/novedades" icon={<Sparkles className="size-5" />} hint={`v${version}`}>
            Novedades
          </LinkRow>
          {profile.role === "admin" ? (
            <LinkRow href="/admin" icon={<ShieldCheck className="size-5" />}>
              Administración
            </LinkRow>
          ) : null}
        </nav>

        <Section title="Exportar mis datos">
          <ExportCard />
        </Section>

        <form action={logout}>
          <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-border bg-surface text-[15px] font-semibold text-danger shadow-xs transition-colors hover:bg-danger-soft">
            <LogOut className="size-4" aria-hidden /> Cerrar sesión
          </button>
        </form>
        <p className="tabular text-center text-xs text-muted">
          Revia v{version} · {process.env.NEXT_PUBLIC_COMMIT_SHA}
        </p>
      </div>
    </div>
  );
}
