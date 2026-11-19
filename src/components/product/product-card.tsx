import Link from "next/link";
import { ProductThumb, ReviewTypeList, StoreLabel } from "@/components/product-bits";
import { StatusBadge } from "@/components/status-badge";
import { displayStatus, type DisplayStatus } from "@/lib/domain/status";
import { relativeDay, shortDate } from "@/lib/domain/dates";
import type { ProductWithProvider } from "@/lib/types";
import { ProductActions } from "./product-actions";

export function statusSuffix(p: ProductWithProvider, s: DisplayStatus, today: string): string | undefined {
  switch (s) {
    case "in_transit":
    case "delayed":
      return relativeDay(p.expected_arrival_date, today).toLowerCase();
    case "arrival_unconfirmed":
      return `era el ${shortDate(p.expected_arrival_date)}`;
    case "review_pending":
      return p.review_due_date ? relativeDay(p.review_due_date, today).toLowerCase() : undefined;
    case "review_overdue":
      return p.review_due_date ? relativeDay(p.review_due_date, today).toLowerCase() : undefined;
    default:
      return undefined;
  }
}

export function ProductCard({
  product,
  today,
  userId,
  actions = true,
}: {
  product: ProductWithProvider;
  today: string;
  userId: string;
  actions?: boolean;
}) {
  const s = displayStatus(product, today);
  const showTypes =
    product.requires_review && product.review_types.length > 0 && (s === "review_pending" || s === "review_today" || s === "review_overdue");
  return (
    <li className="group relative rounded-[var(--radius-card)] border border-border bg-surface p-3 shadow-xs transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-3">
        <ProductThumb src={product.image_url} alt="" />
        <div className="min-w-0 flex-1 pt-0.5">
          <Link
            href={`/productos/${product.id}`}
            className="line-clamp-2 text-[15px] leading-snug font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[13px] text-muted">
            <span className="code-tag shrink-0 text-neutral">{product.code}</span>
            <span className="truncate">{product.provider?.name}</span>
            <StoreLabel store={product.store} other={product.store_other} className="hidden shrink-0 sm:inline-flex" />
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2 sm:pl-[68px]">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <StatusBadge status={s} suffix={statusSuffix(product, s, today)} />
          {showTypes ? <ReviewTypeList types={product.review_types} compact /> : null}
        </div>
        {actions ? (
          <div className="relative z-10 shrink-0">
            <ProductActions product={product} status={s} userId={userId} today={today} />
          </div>
        ) : null}
      </div>
    </li>
  );
}
