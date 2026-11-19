"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { createUserAction } from "./actions";

export function CreateUserButton() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => Math.random().toString(36).slice(2, 8) + "-" + Math.random().toString(36).slice(2, 8));
  const [pending, start] = useTransition();
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden /> Crear usuario
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Crear usuario"
        description="Comparte el correo y la contraseña temporal con la persona. Al entrar, pondrá su nombre y una contraseña nueva."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await createUserAction({ email, password });
                  if (!r.ok) return void toast.error(r.error);
                  toast.success(`Cuenta creada para ${email}`);
                  setOpen(false);
                  setEmail("");
                })
              }
            >
              Crear
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Correo" htmlFor="nu-email">
            <Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
          </Field>
          <Field label="Contraseña temporal" htmlFor="nu-pw" hint="Mínimo 8 caracteres. Cópiala antes de crear.">
            <Input id="nu-pw" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" className="tabular" />
          </Field>
        </div>
      </Sheet>
    </>
  );
}
