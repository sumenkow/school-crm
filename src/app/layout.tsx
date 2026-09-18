import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/context/RoleContext";
import { ToastProvider } from "@/context/ToastContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { AppShell } from "@/components/layout/AppShell";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "YouEurope School CRM — Система управления школой",
  description: "Единая платформа управления образовательной школой, CRM, посещаемость и финансы",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "School CRM",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1565C0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${roboto.variable}`}>
      <body className="flex flex-col" style={{ backgroundColor: 'var(--md-background)', color: 'var(--md-on-background)' }}>
        <RoleProvider>
          <LanguageProvider>
            <ToastProvider>
              <AppShell>
                {children}
              </AppShell>
            </ToastProvider>
          </LanguageProvider>
        </RoleProvider>
      </body>
    </html>
  );
}
