"use client";
import { useEffect } from "react";

/** Registra el service worker. El parámetro ?v= fuerza un SW nuevo en cada versión. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    const v = process.env.NEXT_PUBLIC_APP_VERSION ?? "0";
    navigator.serviceWorker.register(`/sw.js?v=${v}`, { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
