import {
  AlertCircle, Ban, CalendarCheck, Check, CheckCircle2, Clock, MessageSquareText, PackageCheck,
  PackageX, Camera, Star, Truck, Undo2, Video, MessageCircle, Send,
} from "lucide-react";
import { createElement, type ComponentType } from "react";
import type { DisplayStatus } from "@/lib/domain/status";
import type { ContactChannel, ReviewType } from "@/lib/types";

type Icon = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const REVIEW_TYPE_ICONS: Record<ReviewType, Icon> = {
  stars: Star,
  comment: MessageSquareText,
  photos: Camera,
  video: Video,
};

/** Glifo genérico estilo Instagram (lucide ya no incluye iconos de marca). */
function InstagramGlyph({ className }: { className?: string }) {
  return createElement(
    "svg",
    { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", className, "aria-hidden": true },
    createElement("rect", { x: 3, y: 3, width: 18, height: 18, rx: 5 }),
    createElement("circle", { cx: 12, cy: 12, r: 4 }),
    createElement("circle", { cx: 17.5, cy: 6.5, r: 0.6, fill: "currentColor" }),
  );
}

export const CONTACT_ICONS: Record<ContactChannel, Icon> = {
  messenger: Send,
  instagram: InstagramGlyph,
  whatsapp: MessageCircle,
};

export const STATUS_STYLE: Record<DisplayStatus, { icon: Icon; className: string; dot: string }> = {
  arrives_today: { icon: PackageCheck, className: "bg-info-soft text-info", dot: "bg-info" },
  in_transit: { icon: Truck, className: "bg-info-soft text-[#3b5bdb]", dot: "bg-[#60a5fa]" },
  arrival_unconfirmed: { icon: PackageX, className: "bg-warning-soft text-warning", dot: "bg-warning" },
  delayed: { icon: Clock, className: "bg-warning-soft text-warning", dot: "bg-warning" },
  review_pending: { icon: Star, className: "bg-review-soft text-review", dot: "bg-review" },
  review_today: { icon: CalendarCheck, className: "bg-primary text-white", dot: "bg-primary" },
  review_overdue: { icon: AlertCircle, className: "bg-danger-soft text-danger", dot: "bg-danger" },
  review_done: { icon: CheckCircle2, className: "bg-success-soft text-success", dot: "bg-success" },
  received_no_review: { icon: Check, className: "bg-success-soft text-[#3f6f52]", dot: "bg-[#4d7c5f]" },
  cancelled: { icon: Ban, className: "bg-neutral-soft text-neutral", dot: "bg-neutral" },
  returned: { icon: Undo2, className: "bg-returned-soft text-returned", dot: "bg-returned" },
};
