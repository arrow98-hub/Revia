"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Ban, CalendarClock, Check, Clock, MoreHorizontal, Pencil, RotateCcw, Trash2, Undo2,
} from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { PhotoPicker, type PendingPhoto } from "./photo-picker";
import { supabasePhotoStorage } from "@/lib/storage/photos";
import { addDaysISO, fullDate, shortDate } from "@/lib/domain/dates";
import type { DisplayStatus } from "@/lib/domain/status";
import type { Product } from "@/lib/types";
import type { ActionResult } from "@/lib/utils";
import {
  cancelProduct, changeExpectedDate, markArrived, markDelayed, markReturned, markReviewed,
  reactivateProduct, trashProduct, undoArrival, undoReview, type UploadedPhoto,
} from "@/app/(app)/actions";

export type ActionableProduct = Pick<
  Product,
  "id" | "name" | "code" | "status" | "requires_review" | "expected_arrival_date" | "arrived_on" | "review_days" | "review_due_date"
>;

type SheetKind = "arrival" | "delay" | "date" | "review" | "trash" | null;

async function uploadAll(photos: PendingPhoto[], userId: string, productId: string, kind: "arrival" | "review") {
  const out: UploadedPhoto[] = [];
  for (const p of photos) {
    out.push(await supabasePhotoStorage.upload(p.file, { userId, productId, kind }));
  }
  return out;
}

function useRun() {
  const [pending, start] = useTransition();
  const router = useRouter();
  function run(fn: () => Promise<ActionResult>, opts: { success: string; undo?: () => Promise<ActionResult>; onDone?: () => void }) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      opts.onDone?.();
      toast.success(opts.success, opts.undo
        ? {
            action: {
              label: "Deshacer",
              onClick: async () => {
                const r = await opts.undo!();
                if (r.ok) router.refresh();
                else toast.error(r.error);
              },
            },
          }
        : undefined);
      router.refresh();
    });
  }
  return { pending, run };
}

/** Botón principal según el estado + menú secundario + hojas de acción. */
export function ProductActions({
  product,
  status,
  userId,
  today,
  layout = "row",
  showEdit = false,
}: {
  product: ActionableProduct;
  status: DisplayStatus;
  userId: string;
  today: string;
  layout?: "row" | "detail";
  showEdit?: boolean;
}) {
  const [sheet, setSheet] = useState<SheetKind>(null);
  const { pending, run } = useRun();
  const router = useRouter();
  const inTransit = product.status === "in_transit" || product.status === "delayed";
  const canReview = product.status === "received";
  const canUndoArrival = product.status === "received" || (product.status === "completed" && !product.requires_review);
  const canUndoReview = product.status === "completed" && product.requires_review;

  const primary = inTransit ? (
    <Button size={layout === "row" ? "sm" : "md"} onClick={() => setSheet("arrival")} className={layout === "detail" ? "flex-1" : ""}>
      <Check className="size-4" aria-hidden /> Llegó
    </Button>
  ) : canReview ? (
    <Button size={layout === "row" ? "sm" : "md"} onClick={() => setSheet("review")} className={layout === "detail" ? "flex-1" : ""}>
      <Check className="size-4" aria-hidden /> Hecho
    </Button>
  ) : null;

  return (
    <div className={layout === "detail" ? "flex w-full gap-2" : "flex items-center gap-1.5"}>
      {primary}
      <Menu>
        <MenuTrigger asChild>
          <Button variant={layout === "detail" ? "secondary" : "ghost"} size={layout === "row" ? "sm" : "icon"} aria-label={`Más acciones para ${product.name}`} className={layout === "row" ? "w-8 px-0" : ""}>
            <MoreHorizontal className="size-[18px]" aria-hidden />
          </Button>
        </MenuTrigger>
        <MenuContent>
          {inTransit ? (
            <>
              <MenuItem icon={Clock} onSelect={() => setSheet("delay")}>Se retrasó</MenuItem>
              <MenuItem icon={CalendarClock} onSelect={() => setSheet("date")}>Cambiar fecha</MenuItem>
            </>
          ) : null}
          {canUndoArrival ? (
            <MenuItem icon={Undo2} onSelect={() => run(() => undoArrival(product.id), { success: "Llegada deshecha" })}>
              Deshacer llegada
            </MenuItem>
          ) : null}
          {canUndoReview ? (
            <MenuItem icon={Undo2} onSelect={() => run(() => undoReview(product.id), { success: "Review marcado como pendiente" })}>
              Deshacer review
            </MenuItem>
          ) : null}
          {showEdit ? (
            <MenuItem icon={Pencil} onSelect={() => router.push(`/productos/${product.id}/editar`)}>Editar</MenuItem>
          ) : null}
          {inTransit ? (
            <MenuItem icon={Ban} onSelect={() => run(() => cancelProduct(product.id), { success: "Producto cancelado", undo: () => reactivateProduct(product.id) })}>
              Cancelar pedido
            </MenuItem>
          ) : null}
          {product.status === "received" || product.status === "completed" ? (
            <MenuItem icon={RotateCcw} onSelect={() => run(() => markReturned(product.id), { success: "Marcado como devuelto", undo: () => reactivateProduct(product.id) })}>
              Marcar devuelto
            </MenuItem>
          ) : null}
          {product.status === "cancelled" || product.status === "returned" ? (
            <MenuItem icon={RotateCcw} onSelect={() => run(() => reactivateProduct(product.id), { success: "Producto reactivado" })}>
              Reactivar
            </MenuItem>
          ) : null}
          <MenuSeparator />
          <MenuItem icon={Trash2} tone="danger" onSelect={() => setSheet("trash")}>Enviar a la papelera</MenuItem>
        </MenuContent>
      </Menu>

      <ArrivalSheet open={sheet === "arrival"} onClose={() => setSheet(null)} product={product} userId={userId} today={today} />
      <DateSheet open={sheet === "delay" || sheet === "date"} mode={sheet === "delay" ? "delay" : "date"} onClose={() => setSheet(null)} product={product} today={today} />
      <ReviewSheet open={sheet === "review"} onClose={() => setSheet(null)} product={product} userId={userId} today={today} />
      <TrashSheet open={sheet === "trash"} onClose={() => setSheet(null)} product={product} pending={pending} onConfirm={() =>
        run(() => trashProduct(product.id), {
          success: "Enviado a la papelera",
          onDone: () => {
            setSheet(null);
            if (layout === "detail") router.push("/productos");
          },
        })
      } />
      <span className="sr-only" aria-live="polite">{status}</span>
    </div>
  );
}

function ArrivalSheet({ open, onClose, product, userId, today }: { open: boolean; onClose: () => void; product: ActionableProduct; userId: string; today: string }) {
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const due = product.requires_review && product.review_days ? addDaysISO(date, product.review_days) : null;

  async function submit() {
    setBusy(true);
    try {
      const uploaded = await uploadAll(photos, userId, product.id, "arrival");
      const res = await markArrived(product.id, { date, note, photos: uploaded });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPhotos([]);
      setNote("");
      onClose();
      toast.success(due ? `¡Llegó! Review antes del ${shortDate(due)}` : "¡Llegó! Producto completado", {
        action: { label: "Deshacer", onClick: async () => { await undoArrival(product.id); router.refresh(); } },
      });
      router.refresh();
    } catch {
      toast.error("No pudimos subir las fotos. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && !busy && onClose()}
      title="Confirmar llegada"
      description={product.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} loading={busy}>Llegó</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="¿Qué día llegó?" htmlFor="arr-date" hint={due ? `El plazo del review empieza este día: vence el ${fullDate(due)}.` : "Este producto no lleva review."}>
          <Input id="arr-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
        </Field>
        <PhotoPicker label="Fotos de cómo llegó" photos={photos} onChange={setPhotos} busy={busy} />
        <Field label="Nota" htmlFor="arr-note" optional>
          <Textarea id="arr-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: llegó con la caja un poco golpeada" className="min-h-20" />
        </Field>
      </div>
    </Sheet>
  );
}

function DateSheet({ open, mode, onClose, product, today }: { open: boolean; mode: "delay" | "date"; onClose: () => void; product: ActionableProduct; today: string }) {
  const [date, setDate] = useState(product.expected_arrival_date > today ? product.expected_arrival_date : addDaysISO(today, 1));
  const [note, setNote] = useState("");
  const { pending, run } = useRun();
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={mode === "delay" ? "Se retrasó" : "Cambiar fecha de llegada"}
      description={`${product.name} · ahora: ${shortDate(product.expected_arrival_date)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            loading={pending}
            onClick={() =>
              run(() => (mode === "delay" ? markDelayed(product.id, { date, note }) : changeExpectedDate(product.id, { date, note })), {
                success: `Nueva fecha: ${shortDate(date)}`,
                onDone: onClose,
              })
            }
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Nueva fecha estimada" htmlFor="new-date" hint="Puedes cambiarla las veces que necesites; queda en el historial.">
          <Input id="new-date" type="date" value={date} onChange={(e) => setDate(e.target.value || date)} />
        </Field>
        <Field label="Nota" htmlFor="date-note" optional>
          <Input id="date-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: Amazon cambió la entrega" />
        </Field>
      </div>
    </Sheet>
  );
}

function ReviewSheet({ open, onClose, product, userId, today }: { open: boolean; onClose: () => void; product: ActionableProduct; userId: string; today: string }) {
  const [date, setDate] = useState(today);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    try {
      const uploaded = await uploadAll(photos, userId, product.id, "review");
      const res = await markReviewed(product.id, { date, photos: uploaded });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setPhotos([]);
      onClose();
      toast.success("¡Review hecho!", {
        action: { label: "Deshacer", onClick: async () => { await undoReview(product.id); router.refresh(); } },
      });
      router.refresh();
    } catch {
      toast.error("No pudimos subir las capturas. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && !busy && onClose()}
      title="Review hecho"
      description={product.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={submit} loading={busy}>Marcar como hecho</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="¿Qué día lo hiciste?" htmlFor="rev-date">
          <Input id="rev-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
        </Field>
        <PhotoPicker label="Capturas del review" photos={photos} onChange={setPhotos} busy={busy} />
        <p className="text-[13px] text-muted">Guárdalas por si el proveedor te las pide más adelante.</p>
      </div>
    </Sheet>
  );
}

function TrashSheet({ open, onClose, product, onConfirm, pending }: { open: boolean; onClose: () => void; product: ActionableProduct; onConfirm: () => void; pending: boolean }) {
  const [armed, setArmed] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setArmed(false);
          onClose();
        }
      }}
      title="¿Enviar a la papelera?"
      description={`${product.name} · ${product.code}`}
      footer={
        <>
          <Button variant="secondary" onClick={() => { setArmed(false); onClose(); }}>Cancelar</Button>
          <Button variant="danger" loading={pending} onClick={() => (armed ? onConfirm() : setArmed(true))}>
            {armed ? "Sí, enviar" : "Enviar a la papelera"}
          </Button>
        </>
      }
    >
      <p className="text-[15px] text-muted">
        {armed
          ? "Toca “Sí, enviar” para confirmar."
          : "No se borra para siempre: lo podrás restaurar desde Ajustes → Papelera."}
      </p>
    </Sheet>
  );
}
