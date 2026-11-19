"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ children, align = "end" }: { children: ReactNode; align?: "start" | "end" }) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className="z-50 min-w-52 rounded-xl border border-border bg-surface p-1 shadow-lg data-[state=open]:animate-fade-in"
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  icon: Icon,
  children,
  onSelect,
  tone = "default",
}: {
  icon?: ComponentType<{ className?: string }>;
  children: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-[15px] font-medium outline-none transition-colors",
        tone === "danger" ? "text-danger data-[highlighted]:bg-danger-soft" : "text-ink data-[highlighted]:bg-bg-subtle",
      )}
    >
      {Icon ? <Icon className="size-[18px]" /> : null}
      {children}
    </DropdownMenu.Item>
  );
}

export const MenuSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-border" />;
