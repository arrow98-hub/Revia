import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "md" | "sm" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white shadow-xs hover:bg-primary-hover active:bg-primary-press disabled:bg-primary/50",
  secondary:
    "bg-surface text-ink border border-border shadow-xs hover:bg-bg-subtle hover:border-border-strong active:bg-neutral-soft",
  ghost: "text-ink hover:bg-bg-subtle active:bg-neutral-soft",
  soft: "bg-primary-soft text-primary hover:bg-[#dbeafe] active:bg-[#bfdbfe]",
  danger: "bg-danger text-white shadow-xs hover:bg-[#b91c1c] active:bg-[#991b1b] disabled:bg-danger/50",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-4 text-[15px] gap-2",
  sm: "h-8 px-3 text-sm gap-1.5",
  icon: "h-10 w-10",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-field)] font-semibold",
        "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out-soft)]",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        "before:absolute before:-inset-1 before:content-['']", // área táctil ≥ 44px
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "relative inline-flex select-none items-center justify-center whitespace-nowrap rounded-[var(--radius-field)] font-semibold transition-[background-color,border-color,box-shadow] duration-150",
    variants[variant],
    sizes[size],
    className,
  );
}
