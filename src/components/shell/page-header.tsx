import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="mb-5 lg:mb-7">
      {back ? (
        <Link href={back.href} className="-ml-1.5 mb-2 inline-flex h-9 items-center gap-0.5 rounded-lg pr-2 text-sm font-semibold text-muted hover:text-ink">
          <ChevronLeft className="size-5" aria-hidden />
          {back.label}
        </Link>
      ) : null}
      {title || subtitle || actions ? (
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? <h1 className="text-[26px] leading-tight font-bold text-ink lg:text-[30px]">{title}</h1> : null}
          {subtitle ? <p className="mt-1 text-[15px] text-muted first-letter:uppercase">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      ) : null}
    </header>
  );
}
