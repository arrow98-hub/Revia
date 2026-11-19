"use client";
import type { ComponentType, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chip seleccionable (radio o checkbox visual). Siempre icono + texto. */
export function Chip({
  selected,
  onClick,
  icon: Icon,
  children,
  role = "checkbox",
  className,
  showCheck,
}: {
  selected: boolean;
  onClick: () => void;
  icon?: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: ReactNode;
  role?: "checkbox" | "radio";
  className?: string;
  showCheck?: boolean;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-10 items-center gap-2 rounded-full border px-3.5 text-[14px] font-semibold",
        "transition-[background-color,border-color,color,box-shadow] duration-150 ease-[var(--ease-out-soft)] active:scale-[0.98]",
        selected
          ? "border-primary bg-primary-soft text-primary shadow-[0_0_0_1px_var(--color-primary)_inset]"
          : "border-border bg-surface text-muted shadow-xs hover:border-border-strong hover:text-ink",
        className,
      )}
    >
      {Icon ? <Icon className="size-[18px] shrink-0" aria-hidden /> : null}
      <span>{children}</span>
      {showCheck && selected ? <Check className="size-4 shrink-0" aria-hidden /> : null}
    </button>
  );
}

export function ChipGroup({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {children}
    </div>
  );
}
