"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, LayoutList, Plus, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

const ITEMS = [
  { href: "/", label: "Inicio", icon: House, match: (p: string) => p === "/" },
  { href: "/calendario", label: "Calendario", icon: CalendarDays, match: (p: string) => p.startsWith("/calendario") },
  { href: "/agregar", label: "Agregar", icon: Plus, match: (p: string) => p.startsWith("/agregar"), primary: true },
  { href: "/productos", label: "Productos", icon: LayoutList, match: (p: string) => p.startsWith("/productos") || p.startsWith("/proveedores") },
  { href: "/ajustes", label: "Ajustes", icon: Settings, match: (p: string) => p.startsWith("/ajustes") },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 px-1 pb-[max(6px,env(safe-area-inset-bottom))]">
        {ITEMS.map(({ href, label, icon: Icon, match, primary }) => {
          const active = match(pathname);
          return (
            <li key={href} className="flex justify-center">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 text-[11.5px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted hover:text-ink",
                )}
              >
                {primary ? (
                  <span
                    className={cn(
                      "-mt-5 grid size-12 place-items-center rounded-full bg-primary text-white shadow-md ring-4 ring-surface transition-transform active:scale-95",
                      active && "bg-primary-press",
                    )}
                  >
                    <Icon className="size-6" strokeWidth={2.25} aria-hidden />
                  </span>
                ) : (
                  <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-primary-soft")}>
                    <Icon className="size-[21px]" strokeWidth={active ? 2.25 : 1.9} aria-hidden />
                  </span>
                )}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Sidebar({ isAdmin, version }: { isAdmin: boolean; version: string }) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-bg-subtle px-4 py-6 lg:flex">
      <Link href="/" className="px-2">
        <Logo />
      </Link>
      <Link
        href="/agregar"
        className="mt-6 flex h-10 items-center justify-center gap-2 rounded-[var(--radius-field)] bg-primary font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover"
      >
        <Plus className="size-5" aria-hidden /> Agregar producto
      </Link>
      <nav aria-label="Principal" className="mt-4">
        <ul className="flex flex-col gap-0.5">
          {ITEMS.filter((i) => !i.primary).map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold transition-colors",
                    active ? "bg-surface text-primary shadow-xs" : "text-neutral hover:bg-surface/70 hover:text-ink",
                  )}
                >
                  <Icon className="size-[19px]" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          {isAdmin ? (
            <li className="mt-4 border-t border-border pt-4">
              <Link
                href="/admin"
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-[15px] font-semibold transition-colors",
                  pathname.startsWith("/admin") ? "bg-surface text-primary shadow-xs" : "text-neutral hover:bg-surface/70 hover:text-ink",
                )}
              >
                <ShieldCheck className="size-[19px]" aria-hidden /> Admin
              </Link>
            </li>
          ) : null}
        </ul>
      </nav>
      <p className="tabular mt-auto px-3 text-xs text-muted">Revia v{version}</p>
    </aside>
  );
}
