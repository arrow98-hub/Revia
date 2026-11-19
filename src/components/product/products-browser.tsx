"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, PackageSearch, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { ProductCard, statusSuffix } from "./product-card";
import { ProductActions } from "./product-actions";
import { ProductThumb, ReviewTypeList, StoreLabel } from "@/components/product-bits";
import { StatusBadge } from "@/components/status-badge";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/misc";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { REVIEW_TYPE_ICONS } from "@/components/icons";
import { displayStatus, relevantDate, STATUS_FILTERS, STATUS_PRIORITY, type StatusFilterKey } from "@/lib/domain/status";
import { REVIEW_TYPE_LABELS, STORE_LABELS } from "@/lib/domain/labels";
import { shortDate } from "@/lib/domain/dates";
import type { ProductWithProvider, ReviewType, StoreKind } from "@/lib/types";
import { cn } from "@/lib/utils";

type Sort = "urgent" | "recent" | "az";
const SORT_LABELS: Record<Sort, string> = { urgent: "Lo más urgente", recent: "Recientes", az: "A–Z" };

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function ProductsBrowser({ products, today, userId }: { products: ProductWithProvider[]; today: string; userId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = (params.get("estado") as StatusFilterKey) ?? "all";
  const [filter, setFilter] = useState<StatusFilterKey>(initial in STATUS_FILTERS ? initial : "all");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<Sort>("urgent");
  const [stores, setStores] = useState<StoreKind[]>([]);
  const [types, setTypes] = useState<ReviewType[]>([]);
  const [provider, setProvider] = useState<string>(params.get("proveedor") ?? "");
  const [sheet, setSheet] = useState(false);

  const providers = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => p.provider && m.set(p.provider.id, p.provider.name));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const rows = useMemo(() => {
    const nq = normalize(q.trim());
    const list = products
      .map((p) => ({ p, s: displayStatus(p, today) }))
      .filter(({ p, s }) => {
        if (!STATUS_FILTERS[filter].match(s)) return false;
        if (stores.length && !stores.includes(p.store)) return false;
        if (types.length && !types.every((t) => p.review_types.includes(t))) return false;
        if (provider && p.provider_id !== provider) return false;
        if (nq && !normalize(`${p.name} ${p.code} ${p.provider?.name ?? ""}`).includes(nq)) return false;
        return true;
      });
    list.sort((a, b) => {
      if (sort === "az") return a.p.name.localeCompare(b.p.name);
      if (sort === "recent") return b.p.registered_at.localeCompare(a.p.registered_at);
      const d = STATUS_PRIORITY[a.s] - STATUS_PRIORITY[b.s];
      return d !== 0 ? d : relevantDate(a.p).localeCompare(relevantDate(b.p));
    });
    return list;
  }, [products, today, filter, q, sort, stores, types, provider]);

  const advancedCount = stores.length + types.length + (provider ? 1 : 0);

  function selectFilter(k: StatusFilterKey) {
    setFilter(k);
    const sp = new URLSearchParams(params.toString());
    if (k === "all") sp.delete("estado");
    else sp.set("estado", k);
    router.replace(`/productos${sp.size ? `?${sp}` : ""}`, { scroll: false });
  }

  return (
    <div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, código o proveedor"
              className="h-10 w-full rounded-[var(--radius-field)] border border-border bg-surface pr-3 pl-10 text-[16px] shadow-xs placeholder:text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
            />
          </label>
          <Button variant="secondary" onClick={() => setSheet(true)} aria-label="Filtros y orden" className="relative shrink-0 max-sm:w-10 max-sm:px-0">
            <SlidersHorizontal className="size-[18px]" aria-hidden />
            <span className="max-sm:sr-only">Filtros</span>
            {advancedCount ? (
              <span className="tabular absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-white">
                {advancedCount}
              </span>
            ) : null}
          </Button>
        </div>
        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <ChipGroup label="Estado" className="flex-nowrap">
            {(Object.keys(STATUS_FILTERS) as StatusFilterKey[]).map((k) => (
              <Chip key={k} role="radio" selected={filter === k} onClick={() => selectFilter(k)} className="h-9 shrink-0">
                {STATUS_FILTERS[k].label}
              </Chip>
            ))}
          </ChipGroup>
        </div>
        <div className="flex items-center justify-between text-[13px] text-muted">
          <span className="tabular">
            {rows.length} {rows.length === 1 ? "producto" : "productos"}
          </span>
          <span className="inline-flex items-center gap-1">
            <ArrowDownUp className="size-3.5" aria-hidden /> {SORT_LABELS[sort]}
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-4 rounded-[var(--radius-card)] border border-dashed border-border"
          icon={PackageSearch}
          title={products.length ? "No hay productos con estos filtros" : "Aún no tienes productos"}
          description={products.length ? "Prueba con otro estado o limpia la búsqueda." : "Toca + para agregar el primero."}
          action={
            products.length ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setQ("");
                  setStores([]);
                  setTypes([]);
                  setProvider("");
                  selectFilter("all");
                }}
              >
                Limpiar filtros
              </Button>
            ) : (
              <Link href="/agregar" className="inline-flex items-center gap-1 font-semibold text-primary">
                <Plus className="size-4" /> Agregar producto
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* Móvil / tablet: tarjetas */}
          <ul className="mt-3 flex flex-col gap-2 lg:hidden">
            {rows.map(({ p }) => (
              <ProductCard key={p.id} product={p} today={today} userId={userId} />
            ))}
          </ul>
          {/* Escritorio: tabla */}
          <div className="mt-3 hidden overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface shadow-xs lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg-subtle text-[12.5px] font-semibold text-muted">
                <tr>
                  <th className="px-4 py-2.5">Código</th>
                  <th className="px-3 py-2.5">Producto</th>
                  <th className="hidden px-3 py-2.5 2xl:table-cell">Proveedor</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="px-3 py-2.5">Llegada</th>
                  <th className="px-3 py-2.5">Vence</th>
                  <th className="hidden px-3 py-2.5 2xl:table-cell">Review</th>
                  <th className="px-3 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(({ p, s }) => (
                  <tr key={p.id} className="transition-colors hover:bg-bg-subtle/70">
                    <td className="code-tag px-4 py-2.5 whitespace-nowrap text-neutral">{p.code}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/productos/${p.id}`} className="flex items-center gap-3 font-semibold text-ink hover:text-primary">
                        <ProductThumb src={p.image_url} alt="" size="sm" />
                        <span className="line-clamp-2 min-w-48 max-w-72">{p.name}</span>
                      </Link>
                      <p className="mt-0.5 ml-[52px] flex items-center gap-2 text-[13px] text-muted">
                        <span className="truncate 2xl:hidden">{p.provider?.name}</span>
                        <StoreLabel store={p.store} other={p.store_other} />
                      </p>
                    </td>
                    <td className="hidden max-w-36 truncate px-3 py-2.5 text-neutral 2xl:table-cell">{p.provider?.name}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={s} suffix={statusSuffix(p, s, today)} />
                    </td>
                    <td className="tabular px-3 py-2.5 whitespace-nowrap text-neutral">{shortDate(p.arrived_on ?? p.expected_arrival_date)}{p.arrived_on ? "" : " (est.)"}</td>
                    <td className={cn("tabular px-3 py-2.5 whitespace-nowrap", s === "review_overdue" ? "font-semibold text-danger" : "text-neutral")}>
                      {p.review_due_date ? shortDate(p.review_due_date) : "—"}
                    </td>
                    <td className="hidden px-3 py-2.5 2xl:table-cell">{p.requires_review ? <ReviewTypeList types={p.review_types} compact /> : <span className="text-muted">No lleva</span>}</td>
                    <td className="py-2.5 pr-3 pl-1">
                      <ProductActions product={p} status={s} userId={userId} today={today} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title="Filtros y orden"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setStores([]);
                setTypes([]);
                setProvider("");
                setSort("urgent");
              }}
            >
              <X className="size-4" aria-hidden /> Limpiar
            </Button>
            <Button onClick={() => setSheet(false)}>Ver {rows.length}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-sm font-semibold">Ordenar por</p>
            <ChipGroup label="Ordenar por">
              {(Object.keys(SORT_LABELS) as Sort[]).map((k) => (
                <Chip key={k} role="radio" selected={sort === k} onClick={() => setSort(k)}>
                  {SORT_LABELS[k]}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Tienda</p>
            <ChipGroup label="Tienda">
              {(Object.keys(STORE_LABELS) as StoreKind[]).map((k) => (
                <Chip key={k} selected={stores.includes(k)} onClick={() => setStores((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))}>
                  {STORE_LABELS[k]}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Tipo de review</p>
            <ChipGroup label="Tipo de review">
              {(Object.keys(REVIEW_TYPE_LABELS) as ReviewType[]).map((k) => (
                <Chip
                  key={k}
                  icon={REVIEW_TYPE_ICONS[k]}
                  selected={types.includes(k)}
                  onClick={() => setTypes((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))}
                >
                  {REVIEW_TYPE_LABELS[k]}
                </Chip>
              ))}
            </ChipGroup>
          </div>
          {providers.length ? (
            <div>
              <label htmlFor="flt-provider" className="mb-2 block text-sm font-semibold">
                Proveedor
              </label>
              <select
                id="flt-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="h-10 w-full rounded-[var(--radius-field)] border border-border bg-surface px-3 text-[16px] shadow-xs focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
              >
                <option value="">Todos</option>
                {providers.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </Sheet>
    </div>
  );
}
