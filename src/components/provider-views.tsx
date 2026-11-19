import Link from "next/link";
import { ChevronRight, MessageCircleMore, Users } from "lucide-react";
import { CONTACT_ICONS } from "@/components/icons";
import { EmptyState } from "@/components/ui/misc";
import { CONTACT_LABELS, contactLink } from "@/lib/domain/labels";
import { shortDate } from "@/lib/domain/dates";
import type { ProviderStats } from "@/lib/data";

export function ProvidersList({ providers }: { providers: ProviderStats[] }) {
  if (!providers.length) {
    return (
      <EmptyState
        className="rounded-[var(--radius-card)] border border-dashed border-border"
        icon={Users}
        title="Aún no tienes proveedores"
        description="Se crean solos cuando agregas un producto."
      />
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-xs">
      {providers.map((p) => {
        const Icon = p.contact_channel ? CONTACT_ICONS[p.contact_channel] : null;
        return (
          <li key={p.id}>
            <Link href={`/proveedores/${p.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-subtle">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-[15px] font-bold text-primary uppercase">
                {p.name.trim().slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{p.name}</p>
                <p className="tabular flex items-center gap-1.5 text-[13px] text-muted">
                  {p.total} {p.total === 1 ? "colaboración" : "colaboraciones"}
                  {p.last ? <> · última {shortDate(p.last.slice(0, 10))}</> : null}
                  {Icon ? <Icon className="ml-1 size-3.5" aria-hidden /> : null}
                </p>
              </div>
              {p.active ? (
                <span className="tabular shrink-0 rounded-full bg-review-soft px-2 py-0.5 text-xs font-semibold text-review">
                  {p.active} {p.active === 1 ? "activo" : "activos"}
                </span>
              ) : null}
              <ChevronRight className="size-4 shrink-0 text-faint" aria-hidden />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ProviderSummary({ provider }: { provider: ProviderStats }) {
  const Icon = provider.contact_channel ? CONTACT_ICONS[provider.contact_channel] : null;
  const link = contactLink(provider.contact_channel, provider.contact_handle);
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-xs">
        {[
          { label: "Productos", value: provider.total },
          { label: "Reviews hechos", value: provider.reviewed },
          { label: "Activos", value: provider.active },
        ].map((s, i) => (
          <div key={s.label} className={`flex flex-col px-4 py-3 ${i < 2 ? "border-r border-border" : ""}`}>
            <dt className="order-2 text-[13px] text-muted">{s.label}</dt>
            <dd className="tabular order-1 text-2xl font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-xs">
        <p className="text-sm text-muted">Contacto</p>
        {provider.contact_channel && Icon ? (
          <p className="mt-1 flex items-center gap-2 text-[15px] font-semibold">
            <Icon className="size-4 text-muted" aria-hidden />
            {CONTACT_LABELS[provider.contact_channel]}
            {provider.contact_handle ? <span className="font-medium text-neutral">· {provider.contact_handle}</span> : null}
          </p>
        ) : (
          <p className="mt-1 text-[15px] text-muted">Sin contacto guardado</p>
        )}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-[var(--radius-field)] bg-primary-soft px-4 text-[15px] font-semibold text-primary transition-colors hover:bg-[#dbeafe]"
          >
            <MessageCircleMore className="size-4" aria-hidden /> Abrir chat
          </a>
        ) : null}
        {provider.first ? (
          <p className="mt-3 text-[13px] text-muted">
            Trabajan juntos desde el {shortDate(provider.first.slice(0, 10))}
          </p>
        ) : null}
        {provider.notes ? <p className="mt-3 text-[15px] whitespace-pre-wrap">{provider.notes}</p> : null}
      </div>
    </div>
  );
}
