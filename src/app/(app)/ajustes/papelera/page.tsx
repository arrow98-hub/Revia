import Link from "next/link";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { ProductThumb } from "@/components/product-bits";
import { RestoreButton } from "@/components/restore-button";
import { EmptyState } from "@/components/ui/misc";
import { requireSession } from "@/lib/dal";
import { listProducts } from "@/lib/data";
import { dateTimeInTz } from "@/lib/domain/dates";

export const metadata = { title: "Papelera" };

export default async function TrashPage() {
  const { supabase, user, profile } = await requireSession();
  const items = await listProducts(supabase, user.id, { trashed: true });
  return (
    <div className="max-w-[720px]">
      <PageHeader title="Papelera" subtitle="Nada se borra para siempre. Restaura lo que necesites." back={{ href: "/ajustes", label: "Ajustes" }} />
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-xs">
              <ProductThumb src={p.image_url} alt="" size="sm" />
              <div className="min-w-0 flex-1">
                <Link href={`/productos/${p.id}`} className="line-clamp-1 text-[15px] font-semibold hover:text-primary">
                  {p.name}
                </Link>
                <p className="text-[13px] text-muted">
                  <span className="code-tag text-neutral">{p.code}</span> · enviado el {dateTimeInTz(p.deleted_at!, profile.timezone)}
                </p>
              </div>
              <RestoreButton id={p.id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState className="rounded-[var(--radius-card)] border border-dashed border-border" icon={Trash2} title="La papelera está vacía" />
      )}
    </div>
  );
}
