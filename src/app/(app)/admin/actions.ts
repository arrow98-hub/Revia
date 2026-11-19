"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/dal";
import { getAdminSupabase } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/utils";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Correo no válido"),
  password: z.string().min(8, "La contraseña temporal debe tener al menos 8 caracteres").max(72),
});

/** Crea una cuenta nueva. La persona completará su nombre y cambiará la contraseña en la bienvenida. */
export async function createUserAction(input: z.input<typeof schema>): Promise<ActionResult> {
  await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos" };
  const { error } = await getAdminSupabase().auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });
  if (error) {
    return { ok: false, error: error.message.toLowerCase().includes("already") ? "Ya existe una cuenta con ese correo." : error.message };
  }
  revalidatePath("/admin");
  return { ok: true };
}
