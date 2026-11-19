"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { resendCode, verifyLoginCode, type AuthState } from "../../actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LENGTH = 6;

export function CodeForm() {
  const [state, action, pending] = useActionState(verifyLoginCode, undefined);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [resendState, setResendState] = useState<AuthState>();
  const [cooldown, setCooldown] = useState(60);
  const [resending, startResend] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const code = digits.join("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (code.length === LENGTH && !pending) formRef.current?.requestSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (state?.error) {
      setDigits(Array(LENGTH).fill(""));
      refs.current[0]?.focus();
    }
  }, [state]);

  function fill(from: number, value: string) {
    const clean = value.replace(/\D/g, "");
    if (!clean) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 0; i < clean.length && from + i < LENGTH; i++) next[from + i] = clean[i];
      return next;
    });
    refs.current[Math.min(from + clean.length, LENGTH - 1)]?.focus();
  }

  return (
    <form ref={formRef} action={action} className="mt-6">
      <input type="hidden" name="code" value={code} />
      <div className="flex justify-between gap-2" role="group" aria-label="Código de 6 dígitos">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={i === 0}
            maxLength={i === 0 ? LENGTH : 1}
            aria-label={`Dígito ${i + 1}`}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setDigits((p) => p.map((x, j) => (j === i ? "" : x)));
              } else fill(i, v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < LENGTH - 1) refs.current[i + 1]?.focus();
            }}
            onPaste={(e) => {
              e.preventDefault();
              fill(0, e.clipboardData.getData("text"));
            }}
            className={cn(
              "tabular h-14 w-full min-w-0 rounded-[var(--radius-field)] border bg-surface text-center text-2xl font-bold text-ink shadow-xs",
              "transition-[border-color,box-shadow] duration-150 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12",
              state?.error ? "border-danger" : "border-border",
            )}
          />
        ))}
      </div>

      {state?.error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      {resendState?.info ? <p className="mt-3 text-sm font-medium text-success">{resendState.info}</p> : null}
      {resendState?.error ? <p className="mt-3 text-sm font-medium text-danger">{resendState.error}</p> : null}

      <Button type="submit" loading={pending} disabled={code.length !== LENGTH} className="mt-5 w-full">
        Entrar
      </Button>

      <div className="mt-4 flex items-center justify-between text-sm">
        <Link href="/login" className="font-medium text-muted hover:text-ink">
          Cambiar correo
        </Link>
        <button
          type="button"
          disabled={cooldown > 0 || resending}
          onClick={() =>
            startResend(async () => {
              const r = await resendCode();
              setResendState(r);
              if (!r?.error) setCooldown(60);
            })
          }
          className="tabular font-semibold text-primary disabled:font-medium disabled:text-muted"
        >
          {cooldown > 0 ? `Reenviar en ${cooldown} s` : resending ? "Enviando…" : "Reenviar código"}
        </button>
      </div>
    </form>
  );
}
