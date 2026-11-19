"use client";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DetailTabs({ tabs }: { tabs: { key: string; label: string; count?: number; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  return (
    <div>
      <div role="tablist" className="flex gap-6 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            id={`tab-${t.key}`}
            aria-selected={active === t.key}
            aria-controls={`panel-${t.key}`}
            onClick={() => setActive(t.key)}
            className={cn(
              "-mb-px flex h-11 items-center gap-1.5 border-b-2 text-[15px] font-semibold transition-colors",
              active === t.key ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
            {typeof t.count === "number" ? <span className="tabular text-sm font-medium text-muted">{t.count}</span> : null}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" id={`panel-${t.key}`} aria-labelledby={`tab-${t.key}`} hidden={active !== t.key} className="pt-4">
          {t.content}
        </div>
      ))}
    </div>
  );
}
