import Link from "next/link";
import { cn } from "@/lib/utils";

export function Segmented({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav aria-label="Secciones" className="mb-5 inline-flex rounded-xl bg-neutral-soft p-1">
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === active ? "page" : undefined}
          className={cn(
            "rounded-lg px-4 py-1.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-150",
            i.key === active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

export const PRODUCT_TABS = [
  { href: "/productos", label: "Productos", key: "productos" },
  { href: "/proveedores", label: "Proveedores", key: "proveedores" },
];
