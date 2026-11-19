"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { restoreProduct } from "@/app/(app)/actions";

export function RestoreButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await restoreProduct(id);
          if (!r.ok) return void toast.error(r.error);
          toast.success("Producto restaurado");
          router.refresh();
        })
      }
    >
      <RotateCcw className="size-4" aria-hidden /> Restaurar
    </Button>
  );
}
