"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Hoja de acción: bottom sheet en móvil, diálogo centrado en escritorio.
 * Sustituye a los modales clásicos (CLAUDE.md §6.7).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/30 data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            "fixed z-50 flex max-h-[92dvh] flex-col bg-surface shadow-lg focus:outline-none",
            "inset-x-0 bottom-0 rounded-t-[var(--radius-sheet)] data-[state=open]:animate-sheet-in",
            "lg:inset-auto lg:top-1/2 lg:left-1/2 lg:w-[460px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-[var(--radius-sheet)] lg:data-[state=open]:animate-dialog-in",
          )}
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong lg:hidden" aria-hidden />
          <div className="flex items-start justify-between gap-4 px-5 pt-3 pb-2 lg:pt-5">
            <div>
              <Dialog.Title className="text-lg font-bold text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="-mr-1 grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-bg-subtle hover:text-ink"
              aria-label="Cerrar"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer ? (
            <div className="flex gap-2 border-t border-border px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] [&>*]:flex-1">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
