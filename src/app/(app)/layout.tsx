import { BottomNav, Sidebar } from "@/components/shell/nav";
import { UpdateBanner } from "@/components/pwa/update-banner";
import { requireSession } from "@/lib/dal";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireSession();
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  return (
    <div className="flex min-h-dvh">
      <Sidebar isAdmin={profile.role === "admin"} version={version} />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-[1120px] px-4 pt-[max(20px,env(safe-area-inset-top))] pb-32 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          {children}
        </main>
      </div>
      <UpdateBanner currentVersion={version} />
      <BottomNav />
    </div>
  );
}
