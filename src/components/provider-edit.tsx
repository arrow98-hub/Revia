"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { Field, Input, Textarea } from "@/components/ui/field";
import { CONTACT_ICONS } from "@/components/icons";
import { CONTACT_LABELS } from "@/lib/domain/labels";
import type { ContactChannel, Provider } from "@/lib/types";
import { updateProvider } from "@/app/(app)/actions";

export function ProviderEditButton({ provider }: { provider: Provider }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(provider.name);
  const [channel, setChannel] = useState<ContactChannel | null>(provider.contact_channel);
  const [handle, setHandle] = useState(provider.contact_handle ?? "");
  const [notes, setNotes] = useState(provider.notes ?? "");
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil className="size-4" aria-hidden /> Editar
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Editar proveedor"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const res = await updateProvider(provider.id, { name, contactChannel: channel, contactHandle: handle, notes });
                  if (!res.ok) return void toast.error(res.error);
                  toast.success("Proveedor actualizado");
                  setOpen(false);
                  router.refresh();
                })
              }
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Nombre" htmlFor="pv-name">
            <Input id="pv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </Field>
          <Field label="Medio de contacto" optional>
            <ChipGroup label="Medio de contacto">
              {(Object.keys(CONTACT_LABELS) as ContactChannel[]).map((c) => (
                <Chip key={c} role="radio" icon={CONTACT_ICONS[c]} selected={channel === c} onClick={() => setChannel(channel === c ? null : c)}>
                  {CONTACT_LABELS[c]}
                </Chip>
              ))}
            </ChipGroup>
          </Field>
          <Field label="Usuario o teléfono" htmlFor="pv-handle" optional>
            <Input id="pv-handle" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@usuario o +1 305 555 1234" maxLength={120} />
          </Field>
          <Field label="Notas" htmlFor="pv-notes" optional>
            <Textarea id="pv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
          </Field>
        </div>
      </Sheet>
    </>
  );
}
