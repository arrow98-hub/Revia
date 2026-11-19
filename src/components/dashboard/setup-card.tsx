"use client";
import { useEffect, useState } from "react";
import { BellRing, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/components/pwa/use-push";

const DISMISS_KEY = "revia:setupDismissed";

/** Tarjeta de primeros pasos: activar notificaciones e instalar la app. Se puede cerrar. */
export function SetupCard() {
  const push = usePushSubscription();
  const [standalone, setStandalone] = useState(true);
  const [dismissed, setDismissed] = useState(true);
  const [installEvt, setInstallEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    setStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true);
    setIsIOS(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const needsPush = push.supported && !push.subscribed;
  const needsInstall = !standalone;
  if (dismissed || push.loading || (!needsPush && !needsInstall)) return null;

  return (
    <section className="relative mb-6 rounded-[var(--radius-card)] border border-border bg-bg-subtle p-4">
      <button
        aria-label="Cerrar"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {}
          setDismissed(true);
        }}
        className="absolute top-2 right-2 grid size-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-ink"
      >
        <X className="size-4" />
      </button>
      <h2 className="pr-8 text-[15px] font-bold">Deja Revia lista en tu teléfono</h2>
      <ul className="mt-3 flex flex-col gap-3">
        {needsInstall ? (
          <li className="flex items-start gap-3">
            <Download className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Instálala en tu pantalla de inicio</p>
              <p className="text-muted">
                {isIOS
                  ? "En Safari toca Compartir y luego “Agregar a pantalla de inicio”. En iPhone es necesario para recibir avisos."
                  : "Así se abre como una app y te llegan los avisos."}
              </p>
              {installEvt ? (
                <Button size="sm" variant="soft" className="mt-2" onClick={() => installEvt.prompt()}>
                  Instalar Revia
                </Button>
              ) : null}
            </div>
          </li>
        ) : null}
        {needsPush ? (
          <li className="flex items-start gap-3">
            <BellRing className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="flex-1 text-sm">
              <p className="font-semibold">Activa el aviso de las 8:00 a. m.</p>
              <p className="text-muted">Un solo aviso al día, y solo si tienes algo pendiente.</p>
              {push.permission === "denied" ? (
                <p className="mt-1 text-warning">Bloqueaste los avisos. Actívalos desde los ajustes del navegador.</p>
              ) : (
                <Button size="sm" variant="soft" className="mt-2" loading={push.busy} onClick={push.subscribe}>
                  Activar avisos
                </Button>
              )}
            </div>
          </li>
        ) : null}
      </ul>
    </section>
  );
}
