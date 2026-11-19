import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { ServiceWorker } from "@/components/pwa/service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Revia", template: "%s · Revia" },
  description: "Tu central diaria de reviews.",
  applicationName: "Revia",
  appleWebApp: { capable: true, title: "Revia", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-dvh bg-bg antialiased">
        {children}
        <Toaster
          position="bottom-center"
          offset={96}
          mobileOffset={{ bottom: 150 }}
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !border !border-border !shadow-lg !font-sans !text-[15px]",
              actionButton: "!bg-primary !rounded-lg !font-semibold",
            },
          }}
        />
        <ServiceWorker />
      </body>
    </html>
  );
}
