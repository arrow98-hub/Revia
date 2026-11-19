"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellOff, BellRing, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { TimezoneSelect } from "@/components/timezone-select";
import { usePushSubscription } from "@/components/pwa/use-push";
import { sendTestNotification, updateProfile } from "@/app/(app)/actions";

export function ProfileForm({ firstName, lastName, timezone }: { firstName: string; lastName: string; timezone: string }) {
  const [fn, setFn] = useState(firstName);
  const [ln, setLn] = useState(lastName);
  const [tz, setTz] = useState(timezone);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = fn !== firstName || ln !== lastName || tz !== timezone;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateProfile({ firstName: fn, lastName: ln, timezone: tz });
          if (!res.ok) return void toast.error(res.error);
          toast.success("Perfil guardado");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="st-fn">
          <Input id="st-fn" value={fn} onChange={(e) => setFn(e.target.value)} maxLength={60} />
        </Field>
        <Field label="Primer apellido" htmlFor="st-ln">
          <Input id="st-ln" value={ln} onChange={(e) => setLn(e.target.value)} maxLength={60} />
        </Field>
      </div>
      <Field label="Zona horaria" htmlFor="st-tz" hint="Define qué es “hoy” y la hora del aviso de las 8:00 a. m.">
        <TimezoneSelect id="st-tz" value={tz} onChange={setTz} />
      </Field>
      <div>
        <Button type="submit" disabled={!dirty} loading={pending}>
          Guardar
        </Button>
      </div>
    </form>
  );
}

export function NotificationSettings() {
  const push = usePushSubscription();
  const [testing, start] = useTransition();
  if (push.loading) return <p className="text-sm text-muted">Revisando este dispositivo…</p>;
  if (!push.supported) {
    return (
      <p className="text-sm text-muted">
        Este navegador no admite notificaciones. En iPhone, primero instala Revia: Safari → Compartir → “Agregar a pantalla de inicio”.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-center gap-2 text-[15px] font-medium">
        {push.subscribed ? <BellRing className="size-5 text-success" aria-hidden /> : <BellOff className="size-5 text-muted" aria-hidden />}
        {push.subscribed ? "Avisos activados en este dispositivo" : push.permission === "denied" ? "Avisos bloqueados en el navegador" : "Avisos desactivados"}
      </p>
      <p className="text-sm text-muted">Un aviso a las 8:00 a. m., solo si hay llegadas, reviews o algo atrasado.</p>
      <div className="flex flex-wrap gap-2">
        {push.subscribed ? (
          <>
            <Button
              variant="secondary"
              loading={testing}
              onClick={() =>
                start(async () => {
                  const r = await sendTestNotification();
                  if (r.ok) toast.success("Enviamos un aviso de prueba");
                  else toast.error(r.error);
                })
              }
            >
              <Send className="size-4" aria-hidden /> Probar aviso
            </Button>
            <Button variant="ghost" loading={push.busy} onClick={push.unsubscribe}>
              Desactivar
            </Button>
          </>
        ) : push.permission !== "denied" ? (
          <Button loading={push.busy} onClick={push.subscribe}>
            <BellRing className="size-4" aria-hidden /> Activar avisos
          </Button>
        ) : (
          <p className="text-sm text-warning">Para activarlos, permite las notificaciones de este sitio en los ajustes del navegador.</p>
        )}
      </div>
    </div>
  );
}

export function ExportCard() {
  const [trash, setTrash] = useState(false);
  const q = trash ? "&papelera=1" : "";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Descarga todos tus productos, proveedores e historial. Son tuyos y te los puedes llevar cuando quieras.</p>
      <label className="flex items-center gap-2 text-[15px]">
        <input type="checkbox" checked={trash} onChange={(e) => setTrash(e.target.checked)} className="size-4" />
        Incluir productos en la papelera
      </label>
      <div className="flex flex-wrap gap-2">
        <a href={`/api/export?formato=xlsx${q}`} className="inline-flex h-10 items-center rounded-[var(--radius-field)] bg-primary px-4 text-[15px] font-semibold text-white shadow-xs transition-colors hover:bg-primary-hover">
          Descargar Excel
        </a>
        <a href={`/api/export?formato=csv${q}`} className="inline-flex h-10 items-center rounded-[var(--radius-field)] border border-border bg-surface px-4 text-[15px] font-semibold shadow-xs transition-colors hover:bg-bg-subtle">
          Descargar CSV
        </a>
      </div>
    </div>
  );
}
