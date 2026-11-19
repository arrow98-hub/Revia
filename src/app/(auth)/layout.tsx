import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg-subtle">
      <header className="px-6 pt-[max(24px,env(safe-area-inset-top))]">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-12 sm:items-center sm:pt-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
    </div>
  );
}
