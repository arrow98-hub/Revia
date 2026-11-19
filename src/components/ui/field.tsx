import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-sm font-semibold text-ink">
        {label}
        {optional ? <span className="text-xs font-medium text-muted">Opcional</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const fieldBase =
  "w-full rounded-[var(--radius-field)] border border-border bg-surface px-3 text-[16px] text-ink shadow-xs placeholder:text-muted/80 " +
  "transition-[border-color,box-shadow] duration-150 hover:border-border-strong " +
  "focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/12 disabled:bg-bg-subtle disabled:text-muted";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(fieldBase, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-24 py-2.5 leading-normal", className)} {...props} />;
  },
);
