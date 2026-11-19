"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginWithPassword } from "../actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginWithPassword, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
      <Field label="Correo" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <div className="relative">
          <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-11" />
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
      {state?.error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" loading={pending} className="mt-1 w-full">
        Continuar
      </Button>
      <p className="text-center text-[13px] text-muted">Te enviaremos un código a tu correo para confirmar que eres tú.</p>
    </form>
  );
}
