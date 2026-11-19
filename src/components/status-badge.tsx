import { STATUS_LABELS } from "@/lib/domain/labels";
import type { DisplayStatus } from "@/lib/domain/status";
import { cn } from "@/lib/utils";
import { STATUS_STYLE } from "./icons";

export function StatusBadge({ status, className, suffix }: { status: DisplayStatus; className?: string; suffix?: string }) {
  const { icon: Icon, className: tone } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 max-w-full min-w-0 items-center gap-1 overflow-hidden rounded-full px-2 text-[12.5px] font-semibold whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {STATUS_LABELS[status]}
        {suffix ? <span className="font-medium opacity-80"> · {suffix}</span> : null}
      </span>
    </span>
  );
}
