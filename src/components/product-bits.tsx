import { Package } from "lucide-react";
import { REVIEW_TYPE_LABELS, STORE_LABELS } from "@/lib/domain/labels";
import type { ReviewType, StoreKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { REVIEW_TYPE_ICONS } from "./icons";

export function StoreLabel({ store, other, className }: { store: StoreKind; other?: string | null; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium text-muted", className)}>
      <span className="size-1.5 rounded-full bg-border-strong" aria-hidden />
      {store === "other" && other ? other : STORE_LABELS[store]}
    </span>
  );
}

export function ReviewTypeList({ types, compact }: { types: ReviewType[]; compact?: boolean }) {
  if (types.length === 0) {
    return <span className="text-[13px] text-muted">Sin requisitos</span>;
  }
  return (
    <ul className={cn("flex gap-1.5", compact ? "flex-nowrap" : "flex-wrap")} aria-label="Tipo de review">
      {types.map((t) => {
        const Icon = REVIEW_TYPE_ICONS[t];
        return (
          <li
            key={t}
            className="inline-flex h-6 items-center gap-1 rounded-full border border-border bg-bg-subtle px-2 text-[12px] font-semibold text-neutral"
            title={REVIEW_TYPE_LABELS[t]}
          >
            <Icon className="size-3.5" aria-hidden />
            {compact ? <span className="sr-only">{REVIEW_TYPE_LABELS[t]}</span> : REVIEW_TYPE_LABELS[t]}
          </li>
        );
      })}
    </ul>
  );
}

export function ProductThumb({ src, alt, size = "md" }: { src: string | null; alt: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "size-10" : size === "lg" ? "size-24" : "size-14";
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-xl border border-border bg-bg-subtle", dims)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" className="size-full object-contain p-1" />
      ) : (
        <div className="grid size-full place-items-center text-faint">
          <Package className={size === "lg" ? "size-9" : "size-6"} aria-hidden />
        </div>
      )}
    </div>
  );
}
