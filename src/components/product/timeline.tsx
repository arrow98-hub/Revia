import { CalendarClock, Check, CheckCircle2, Circle, Clock, Pencil, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import type { ComponentType } from "react";
import { EVENT_LABELS } from "@/lib/domain/labels";
import { dateTimeInTz, shortDate } from "@/lib/domain/dates";
import type { ProductEvent } from "@/lib/types";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  created: Plus,
  expected_date_changed: CalendarClock,
  marked_delayed: Clock,
  arrived: Check,
  review_done: CheckCircle2,
  arrival_undone: Undo2,
  review_undone: Undo2,
  edited: Pencil,
  trashed: Trash2,
  restored: RotateCcw,
  reactivated: RotateCcw,
  returned: RotateCcw,
};

function detail(e: ProductEvent): string | null {
  const p = e.payload as { from?: string; to?: string; date?: string; expected?: string };
  if (p.from && p.to) return `${shortDate(p.from)} → ${shortDate(p.to)}`;
  if (e.type === "arrived" && p.date) return `Llegó el ${shortDate(p.date)}`;
  if (e.type === "review_done" && p.date) return `Hecho el ${shortDate(p.date)}`;
  if (e.type === "created" && p.expected) return `Llegada estimada: ${shortDate(p.expected)}`;
  return null;
}

export function Timeline({ events, timezone }: { events: ProductEvent[]; timezone: string }) {
  if (!events.length) return <p className="text-sm text-muted">Sin movimientos todavía.</p>;
  return (
    <ol className="relative flex flex-col gap-4 pl-1">
      {events.map((e, i) => {
        const Icon = ICONS[e.type] ?? Circle;
        const d = detail(e);
        return (
          <li key={e.id} className="relative flex gap-3">
            {i < events.length - 1 ? <span className="absolute top-8 bottom-[-16px] left-[15px] w-px bg-border" aria-hidden /> : null}
            <span className="relative grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-neutral">
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 pt-1">
              <p className="text-[15px] font-semibold text-ink">{EVENT_LABELS[e.type] ?? e.type}</p>
              {d ? <p className="tabular text-sm text-neutral">{d}</p> : null}
              {e.note ? <p className="mt-0.5 text-sm text-neutral italic">“{e.note}”</p> : null}
              <p className="mt-0.5 text-[12.5px] text-muted">{dateTimeInTz(e.created_at, timezone)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
