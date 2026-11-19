import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={cn("size-8", className)} aria-hidden>
      <rect width="512" height="512" rx="116" fill="#2563EB" />
      <g fill="none" stroke="#FFFFFF" strokeWidth="26" strokeLinejoin="round" strokeLinecap="round">
        <path d="M256 112 L388 178 L256 244 L124 178 Z" fill="#FFFFFF" fillOpacity="0.16" />
        <path d="M124 178 V326 L256 392 V244" />
        <path d="M388 178 V258" />
        <path d="M190 145 L322 211" />
      </g>
      <circle cx="372" cy="356" r="74" fill="#FFFFFF" stroke="#2563EB" strokeWidth="18" />
      <path d="M338 357 L362 381 L408 333" fill="none" stroke="#2563EB" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[19px] font-bold tracking-tight text-ink">Revia</span>
    </span>
  );
}
