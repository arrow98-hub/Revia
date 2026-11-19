"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** Barras simples de un solo tono: productos recibidos por mes. Tooltip al pasar/tocar. */
export function MonthlyBars({ months }: { months: { key: string; label: string; count: number }[] }) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...months.map((m) => m.count));
  const current = months[months.length - 1]?.key;
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold text-ink">Productos recibidos por mes</figcaption>
      <div className="relative flex h-36 items-end gap-[2px] border-b border-border" role="list">
        {months.map((m) => {
          const h = (m.count / max) * 100;
          const show = active === m.key || (active === null && m.key === current);
          return (
            <div
              key={m.key}
              role="listitem"
              tabIndex={0}
              aria-label={`${m.label}: ${m.count} productos`}
              onMouseEnter={() => setActive(m.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(m.key)}
              onBlur={() => setActive(null)}
              onClick={() => setActive((a) => (a === m.key ? null : m.key))}
              className="group relative flex h-full flex-1 items-end justify-center px-2 outline-none"
            >
              {show ? (
                <span className="tabular absolute -top-1 z-10 -translate-y-full rounded-md bg-ink px-1.5 py-0.5 text-xs font-semibold text-white shadow-md">
                  {m.count}
                </span>
              ) : null}
              <div
                className={cn(
                  "w-full max-w-10 rounded-t-[4px] transition-[height,background-color] duration-200",
                  m.key === current ? "bg-primary" : "bg-primary/45 group-hover:bg-primary/70 group-focus-visible:bg-primary/70",
                )}
                style={{ height: `${Math.max(h, m.count ? 4 : 1.5)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[2px]">
        {months.map((m) => (
          <span key={m.key} className={cn("flex-1 text-center text-xs capitalize", m.key === current ? "font-semibold text-ink" : "text-muted")}>
            {m.label}
          </span>
        ))}
      </div>
    </figure>
  );
}
