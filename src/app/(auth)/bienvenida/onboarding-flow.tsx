"use client";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Globe } from "lucide-react";
import { completeOnboarding } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { buildCodePrefix, formatProductCode } from "@/lib/domain/codes";
import { timezoneLabel, TimezoneSelect } from "@/components/timezone-select";

const STEPS = ["Tus datos", "Contraseña", "Zona horaria"] as const;

export function OnboardingFlow({ email }: { email: string }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [timezone, setTimezone] = useState("America/New_York");
  const [detected, setDetected] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [localError, setLocalError] = useState<string>();

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setDetected(tz);
        setTimezone(tz);
      }
    } catch {
      setChoosing(true);
    }
  }, []);

  const prefix = useMemo(() => buildCodePrefix(firstName || "", lastName || ""), [firstName, lastName]);

  function next() {
    setLocalError(undefined);
    if (step === 0) {
      if (!firstName.trim() || !lastName.trim()) return setLocalError("Escribe tu nombre y tu primer apellido.");
    }
    if (step === 1) {
      if (password.length < 8) return setLocalError("La contraseña debe tener al menos 8 caracteres.");
      if (password !== confirm) return setLocalError("Las contraseñas no coinciden.");
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="rounded-[var(--radius-sheet)] border border-border bg-surface p-6 shadow-md sm:p-8">
      <ol className="mb-6 flex gap-1.5" aria-label="Progreso">
        {STEPS.map((s, i) => (
          <li key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-border"}`}>
            <span className="sr-only">
              Paso {i + 1}: {s}
              {i === step ? " (actual)" : ""}
            </span>
          </li>
        ))}
      </ol>

      <form
        action={action}
        onSubmit={(e) => {
          if (step < STEPS.length - 1) {
            e.preventDefault();
            next();
          }
        }}
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="firstName" value={firstName} />
        <input type="hidden" name="lastName" value={lastName} />
        <input type="hidden" name="password" value={password} />
        <input type="hidden" name="timezone" value={timezone} />

        {step === 0 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">Te damos la bienvenida</h1>
              <p className="mt-1 text-[15px] text-muted">Empecemos con tu nombre. Solo tomará un minuto.</p>
            </div>
            <Field label="Nombre" htmlFor="fn">
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" autoFocus />
            </Field>
            <Field label="Primer apellido" htmlFor="ln">
              <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
            </Field>
            <div className="rounded-xl bg-bg-subtle px-4 py-3">
              <p className="text-sm text-muted">Tus productos se verán así:</p>
              <p className="code-tag mt-0.5 text-lg text-ink">{formatProductCode(prefix, 1)}</p>
              <p className="mt-1 text-[13px] text-muted">Este código no se puede cambiar después.</p>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">Crea tu contraseña</h1>
              <p className="mt-1 text-[15px] text-muted">Reemplaza la contraseña temporal por una tuya.</p>
            </div>
            <input type="email" name="username" value={email} autoComplete="username" readOnly hidden />
            <Field label="Nueva contraseña" htmlFor="pw" hint="Mínimo 8 caracteres.">
              <div className="relative">
                <Input
                  id="pw"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
              </div>
            </Field>
            <Field label="Repite la contraseña" htmlFor="pw2">
              <Input id="pw2" type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <h1 className="text-2xl font-bold">Tu zona horaria</h1>
              <p className="mt-1 text-[15px] text-muted">La usamos para avisarte a las 8:00 a. m. y calcular qué toca hoy.</p>
            </div>
            {detected && !choosing ? (
              <div className="flex items-start gap-3 rounded-xl border border-border bg-bg-subtle p-4">
                <Globe className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="flex-1">
                  <p className="text-sm text-muted">Detectamos:</p>
                  <p className="font-semibold">{timezoneLabel(detected)}</p>
                  <button type="button" onClick={() => setChoosing(true)} className="mt-2 text-sm font-semibold text-primary">
                    No es correcto, elegir otra
                  </button>
                </div>
              </div>
            ) : (
              <Field label="Zona horaria" htmlFor="tz">
                <TimezoneSelect id="tz" value={timezone} onChange={setTimezone} />
              </Field>
            )}
          </>
        ) : null}

        {localError || state?.error ? (
          <p role="alert" className="text-sm font-medium text-danger">
            {localError ?? state?.error}
          </p>
        ) : null}

        <div className="mt-2 flex gap-2">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={() => setStep((s) => s - 1)} aria-label="Atrás">
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}
          <Button type="submit" loading={pending} className="flex-1">
            {step < STEPS.length - 1 ? "Continuar" : "Empezar a usar Revia"}
          </Button>
        </div>
      </form>
    </div>
  );
}
