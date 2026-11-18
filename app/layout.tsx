import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { StoreProvider } from "@/store/StoreProvider";
import { AppBootstrap } from "@/components/layout/AppBootstrap";
import { BrandTheme } from "@/components/layout/BrandTheme";
import { LoginSheet } from "@/components/auth/LoginSheet";
import { ToastViewport } from "@/components/ui/Toast";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OQwik Dine",
  description: "Order straight from your table. Browse the menu, order in a few taps and pay on your phone.",
  manifest: "/site.webmanifest",
  // Table, payment and bill pages are personal: keep them out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#3A36E0",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <StoreProvider>
          <AppBootstrap />
          <BrandTheme />
          {children}
          <LoginSheet />
          <ToastViewport />
        </StoreProvider>
      </body>
    </html>
  );
}
