"use client";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import Link from "next/link";

const CHECK_EVERY_MS = 30 * 60 * 1000;
const SEEN_KEY = "revia:lastSeenVersion";

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible */
  }
}

/**
 * Aviso de actualización (CLAUDE.md §10):
 * - Si /api/version reporta otra versión o hay un SW esperando → "Hay una nueva versión · Actualizar".
 * - Tras actualizar, muestra una vez "Novedades".
 */
export function UpdateBanner({ currentVersion }: { currentVersion: string }) {
  const [available, setAvailable] = useState<string | null>(null);
  const [justUpdated, setJustUpdated] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const seen = safeGet(SEEN_KEY);
    if (seen && seen !== currentVersion) setJustUpdated(true);
    if (!seen) safeSet(SEEN_KEY, currentVersion);
  }, [currentVersion]);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const { version } = (await res.json()) as { version: string };
      if (version && version !== currentVersion) setAvailable(version);
    } catch {
      /* sin conexión */
    }
  }, [currentVersion]);

  useEffect(() => {
    check();
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    const t = setInterval(check, CHECK_EVERY_MS);
    navigator.serviceWorker?.getRegistration().then((reg) => {
      if (!reg) return;
      if (reg.waiting && navigator.serviceWorker.controller) setAvailable((v) => v ?? "nueva");
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        sw?.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) setAvailable((v) => v ?? "nueva");
        });
      });
    });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(t);
    };
  }, [check]);

  async function update() {
    setUpdating(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      if (reg?.waiting) {
        navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
        reg.waiting.postMessage({ type: "SKIP_WAITING" });
        setTimeout(() => location.reload(), 2500);
        return;
      }
    } catch {
      /* continuar con recarga simple */
    }
    location.reload();
  }

  if (available) {
    return (
      <div role="status" className="fixed inset-x-3 bottom-[88px] z-50 mx-auto max-w-md animate-sheet-in lg:bottom-6">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
          <RefreshCw className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="flex-1 text-sm font-medium">
            Hay una nueva versión{available !== "nueva" ? <span className="tabular"> ({available})</span> : null}
          </p>
          <button
            onClick={update}
            disabled={updating}
            className="h-8 rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {updating ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>
    );
  }

  if (justUpdated) {
    return (
      <div role="status" className="fixed inset-x-3 bottom-[88px] z-50 mx-auto max-w-md animate-sheet-in lg:bottom-6">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
          <Sparkles className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="flex-1 text-sm font-medium">
            Revia se actualizó a la <span className="tabular">v{currentVersion}</span>
          </p>
          <Link
            href="/ajustes/novedades"
            onClick={() => {
              safeSet(SEEN_KEY, currentVersion);
              setJustUpdated(false);
            }}
            className="text-sm font-semibold text-primary"
          >
            Ver novedades
          </Link>
          <button
            aria-label="Cerrar"
            onClick={() => {
              safeSet(SEEN_KEY, currentVersion);
              setJustUpdated(false);
            }}
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-bg-subtle"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }
  return null;
}
