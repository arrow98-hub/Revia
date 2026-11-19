"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardPaste, ExternalLink, Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/field";
import { CONTACT_ICONS, REVIEW_TYPE_ICONS } from "@/components/icons";
import { CONTACT_LABELS, normalizeUrl, REVIEW_TYPE_LABELS, STORE_LABELS } from "@/lib/domain/labels";
import { addDaysISO, fullDate } from "@/lib/domain/dates";
import type { ContactChannel, ReviewType, StoreKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { createProduct, updateProduct, type ProductInput } from "@/app/(app)/actions";

const STORES: StoreKind[] = ["amazon", "walmart", "tiktok", "temu", "other"];
const CHANNELS: ContactChannel[] = ["messenger", "instagram", "whatsapp"];
const REVIEW_TYPES: ReviewType[] = ["stars", "comment", "photos", "video"];
const DAY_PRESETS = [3, 7, 14];

export interface ProductFormValues {
  requiresReview: boolean;
  name: string;
  url: string;
  store: StoreKind;
  storeOther: string;
  providerName: string;
  contactChannel: ContactChannel | null;
  contactHandle: string;
  reviewTypes: ReviewType[];
  reviewDays: number | null;
  expectedArrivalDate: string;
  notes: string;
}

export function emptyProductValues(today: string): ProductFormValues {
  return {
    requiresReview: true,
    name: "",
    url: "",
    store: "amazon",
    storeOther: "",
    providerName: "",
    contactChannel: null,
    contactHandle: "",
    reviewTypes: [],
    reviewDays: 7,
    expectedArrivalDate: addDaysISO(today, 1),
    notes: "",
  };
}

export function ProductForm({
  providers,
  today,
  initial,
  productId,
  arrivedOn,
}: {
  providers: { name: string; contact_handle: string | null }[];
  today: string;
  initial?: ProductFormValues;
  productId?: string;
  arrivedOn?: string | null;
}) {
  const router = useRouter();
  const editing = Boolean(productId);
  const [v, setV] = useState<ProductFormValues>(initial ?? emptyProductValues(today));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customDays, setCustomDays] = useState(() => (initial?.reviewDays ? !DAY_PRESETS.includes(initial.reviewDays) : false));
  const [showNotes, setShowNotes] = useState(Boolean(initial?.notes));
  const [showHandle, setShowHandle] = useState(Boolean(initial?.contactHandle));
  const [providerFocus, setProviderFocus] = useState(false);
  const [pending, start] = useTransition();
  const nameRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormValues>(k: K, value: ProductFormValues[K]) => {
    setV((prev) => ({ ...prev, [k]: value }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const suggestions = useMemo(() => {
    const q = v.providerName.trim().toLowerCase();
    const list = providers.filter((p) => !q || p.name.toLowerCase().includes(q));
    return list.slice(0, 6);
  }, [providers, v.providerName]);
  const exactProvider = providers.some((p) => p.name.toLowerCase() === v.providerName.trim().toLowerCase());
  const normalizedUrl = v.url ? normalizeUrl(v.url) : null;

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) set("url", text.trim());
    } catch {
      toast.error("No pudimos leer el portapapeles. Mantén presionado el campo y elige “Pegar”.");
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!v.name.trim()) local.name = "Escribe el nombre del producto";
    if (!v.providerName.trim()) local.providerName = "Escribe o elige un proveedor";
    if (v.store === "other" && !v.storeOther.trim()) local.storeOther = "Escribe el nombre de la tienda";
    if (v.url && !normalizedUrl) local.url = "El link no parece válido";
    if (v.requiresReview && (!v.reviewDays || v.reviewDays < 1)) local.reviewDays = "Elige los días para el review";
    if (!v.expectedArrivalDate) local.expectedArrivalDate = "Elige la fecha estimada";
    if (Object.keys(local).length) {
      setErrors(local);
      toast.error("Revisa los campos marcados");
      return;
    }
    const payload: ProductInput = { ...v, reviewDays: v.requiresReview ? v.reviewDays : null };
    start(async () => {
      if (editing && productId) {
        const res = await updateProduct(productId, payload);
        if (!res.ok) {
          setErrors(res.fieldErrors ?? {});
          toast.error(res.error);
          return;
        }
        toast.success("Cambios guardados");
        router.push(`/productos/${productId}`);
        return;
      }
      const res = await createProduct(payload);
      if (!res.ok || !res.data) {
        if (!res.ok) {
          setErrors(res.fieldErrors ?? {});
          toast.error(res.error);
        }
        return;
      }
      const { id, code } = res.data;
      toast.success(`Producto ${code} agregado`, { action: { label: "Ver", onClick: () => router.push(`/productos/${id}`) } });
      setV({ ...emptyProductValues(today), store: v.store });
      setCustomDays(false);
      setShowNotes(false);
      setShowHandle(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      nameRef.current?.focus({ preventScroll: true });
    });
  }

  const dueHint =
    v.requiresReview && v.reviewDays
      ? arrivedOn
        ? `Vence el ${fullDate(addDaysISO(arrivedOn, v.reviewDays))} (llegó el ${fullDate(arrivedOn)}).`
        : `Se cuentan desde el día que llegue. Si llega el ${fullDate(v.expectedArrivalDate)}, vence el ${fullDate(addDaysISO(v.expectedArrivalDate, v.reviewDays))}.`
      : undefined;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6 pb-24 lg:pb-0">
      {/* 1. ¿Lleva review? */}
      <div className="flex items-center justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-bg-subtle px-4 py-3.5">
        <div>
          <p id="lbl-review" className="text-[15px] font-semibold">
            {v.requiresReview ? "Este producto lleva review" : "Este producto no lleva review"}
          </p>
          <p className="text-[13px] text-muted">
            {v.requiresReview ? "Te avisaremos cuando toque hacerlo." : "Igual confirmarás cuando llegue."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={v.requiresReview}
          aria-labelledby="lbl-review"
          onClick={() => set("requiresReview", !v.requiresReview)}
          className={cn(
            "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
            v.requiresReview ? "bg-primary" : "bg-border-strong",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[var(--ease-out-soft)]",
              v.requiresReview && "translate-x-5",
            )}
          />
        </button>
      </div>

      {/* 2. Nombre */}
      <Field label="Nombre del producto" htmlFor="name" error={errors.name} hint="Como tú lo reconozcas mejor.">
        <Input
          ref={nameRef}
          id="name"
          value={v.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Ej.: Lámpara LED escritorio"
          aria-invalid={Boolean(errors.name)}
          autoComplete="off"
          maxLength={200}
        />
      </Field>

      {/* 3. Link */}
      <Field
        label="Link"
        htmlFor="url"
        optional
        error={errors.url}
        hint={normalizedUrl ? undefined : "Pega aquí el link del producto en la tienda."}
      >
        <div className="flex gap-2">
          <Input
            id="url"
            type="url"
            inputMode="url"
            value={v.url}
            onChange={(e) => set("url", e.target.value)}
            placeholder="https://…"
            aria-invalid={Boolean(errors.url)}
            autoComplete="off"
          />
          <Button type="button" variant="secondary" onClick={paste} className="shrink-0">
            <ClipboardPaste className="size-4" aria-hidden /> Pegar
          </Button>
        </div>
        {normalizedUrl ? (
          <a href={normalizedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-[13px] font-semibold text-primary">
            Abrir link para comprobarlo <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </Field>

      {/* 4. Tienda */}
      <Field label="Tienda" error={errors.storeOther}>
        <ChipGroup label="Tienda">
          {STORES.map((s) => (
            <Chip key={s} role="radio" selected={v.store === s} onClick={() => set("store", s)} icon={s === "other" ? Store : undefined}>
              {STORE_LABELS[s]}
            </Chip>
          ))}
        </ChipGroup>
        {v.store === "other" ? (
          <Input
            aria-label="Nombre de la tienda"
            value={v.storeOther}
            onChange={(e) => set("storeOther", e.target.value)}
            placeholder="¿Cuál tienda?"
            className="mt-1"
            aria-invalid={Boolean(errors.storeOther)}
            maxLength={60}
          />
        ) : null}
      </Field>

      {/* 5. Proveedor */}
      <Field label="Proveedor" htmlFor="provider" error={errors.providerName}>
        <div className="relative">
          <Input
            id="provider"
            value={v.providerName}
            onChange={(e) => set("providerName", e.target.value)}
            onFocus={() => setProviderFocus(true)}
            onBlur={() => setTimeout(() => setProviderFocus(false), 150)}
            placeholder="Escribe o elige uno"
            aria-invalid={Boolean(errors.providerName)}
            autoComplete="off"
            role="combobox"
            aria-expanded={providerFocus && (suggestions.length > 0 || Boolean(v.providerName.trim()))}
            aria-controls="provider-list"
            maxLength={120}
          />
          {providerFocus && (suggestions.length > 0 || (v.providerName.trim() && !exactProvider)) ? (
            <ul
              id="provider-list"
              role="listbox"
              className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-lg"
            >
              {suggestions.map((p) => (
                <li key={p.name} role="option" aria-selected={p.name === v.providerName}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      set("providerName", p.name);
                      setProviderFocus(false);
                    }}
                    className="flex h-10 w-full items-center rounded-lg px-3 text-left text-[15px] hover:bg-bg-subtle"
                  >
                    {p.name}
                  </button>
                </li>
              ))}
              {v.providerName.trim() && !exactProvider ? (
                <li role="option" aria-selected={false}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setProviderFocus(false)}
                    className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[15px] font-semibold text-primary hover:bg-primary-soft"
                  >
                    <Plus className="size-4" aria-hidden /> Crear “{v.providerName.trim()}”
                  </button>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </Field>

      {/* 6. Contacto */}
      <Field label="¿Por dónde te contactó?" optional>
        <ChipGroup label="Medio de contacto">
          {CHANNELS.map((c) => (
            <Chip
              key={c}
              role="radio"
              selected={v.contactChannel === c}
              onClick={() => set("contactChannel", v.contactChannel === c ? null : c)}
              icon={CONTACT_ICONS[c]}
            >
              {CONTACT_LABELS[c]}
            </Chip>
          ))}
        </ChipGroup>
        {v.contactChannel && !exactProvider ? (
          showHandle ? (
            <Input
              aria-label="Usuario o teléfono del proveedor"
              value={v.contactHandle}
              onChange={(e) => set("contactHandle", e.target.value)}
              placeholder={v.contactChannel === "whatsapp" ? "Teléfono, ej.: +1 305 555 1234" : "@usuario"}
              className="mt-1"
              maxLength={120}
            />
          ) : (
            <button type="button" onClick={() => setShowHandle(true)} className="mt-1 w-fit text-[13px] font-semibold text-primary">
              + Guardar usuario o teléfono del proveedor
            </button>
          )
        ) : null}
      </Field>

      {/* 7–8. Review */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-[var(--ease-out-soft)]",
          v.requiresReview ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!v.requiresReview}
        inert={!v.requiresReview}
      >
        <div className="flex flex-col gap-6 overflow-hidden">
          <Field label="Tipo de review" optional hint="Marca lo que pidió el proveedor. Si no pidió nada, déjalo así.">
            <ChipGroup label="Tipo de review">
              {REVIEW_TYPES.map((t) => (
                <Chip
                  key={t}
                  selected={v.reviewTypes.includes(t)}
                  onClick={() => set("reviewTypes", v.reviewTypes.includes(t) ? v.reviewTypes.filter((x) => x !== t) : [...v.reviewTypes, t])}
                  icon={REVIEW_TYPE_ICONS[t]}
                  showCheck
                >
                  {REVIEW_TYPE_LABELS[t]}
                </Chip>
              ))}
            </ChipGroup>
          </Field>

          <Field label="Días para el review" error={errors.reviewDays} hint={dueHint}>
            <ChipGroup label="Días para el review">
              {DAY_PRESETS.map((d) => (
                <Chip
                  key={d}
                  role="radio"
                  selected={!customDays && v.reviewDays === d}
                  onClick={() => {
                    setCustomDays(false);
                    set("reviewDays", d);
                  }}
                  className="tabular min-w-16 justify-center"
                >
                  {d} días
                </Chip>
              ))}
              <Chip
                role="radio"
                selected={customDays}
                onClick={() => {
                  setCustomDays(true);
                  set("reviewDays", null);
                }}
              >
                Otro
              </Chip>
            </ChipGroup>
            {customDays ? (
              <div className="mt-1 flex items-center gap-2">
                <Input
                  aria-label="Número de días"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={90}
                  autoFocus
                  value={v.reviewDays ?? ""}
                  onChange={(e) => set("reviewDays", e.target.value ? Math.min(90, Math.max(0, Number(e.target.value))) : null)}
                  className="tabular w-24"
                  aria-invalid={Boolean(errors.reviewDays)}
                />
                <span className="text-sm text-muted">días</span>
              </div>
            ) : null}
          </Field>
        </div>
      </div>

      {/* 9. Fecha estimada */}
      <Field
        label={arrivedOn ? "Fecha estimada de llegada (original)" : "¿Cuándo llega aprox.?"}
        htmlFor="eta"
        error={errors.expectedArrivalDate}
        hint={arrivedOn ? undefined : "La que te indica la tienda al hacer el pedido."}
      >
        <Input
          id="eta"
          type="date"
          value={v.expectedArrivalDate}
          onChange={(e) => set("expectedArrivalDate", e.target.value)}
          aria-invalid={Boolean(errors.expectedArrivalDate)}
          className="sm:max-w-56"
        />
      </Field>

      {/* 10. Notas */}
      {showNotes ? (
        <Field label="Notas" htmlFor="notes" optional>
          <Textarea id="notes" value={v.notes} onChange={(e) => set("notes", e.target.value)} maxLength={4000} />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowNotes(true)} className="-mt-2 w-fit text-sm font-semibold text-primary">
          + Agregar nota
        </button>
      )}

      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto flex max-w-[640px] gap-2 lg:mx-0">
          {editing ? (
            <Button type="button" variant="secondary" onClick={() => router.back()} className="flex-1 lg:flex-none">
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" loading={pending} className="flex-1 lg:flex-none lg:px-8">
            {editing ? "Guardar cambios" : "Guardar producto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
