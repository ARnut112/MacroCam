import type { Metadata } from "next";
import { StoreProvider } from "@/components/store-provider";
import { Footer, Header } from "@/components/shell";
import { getCatalog, getSettings, isDemoMode } from "@/lib/site";
import "./globals.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "MacroCam — กล้อง เลนส์ และอุปกรณ์สำหรับทุกมุมมอง", template: "%s | MacroCam" },
  description:
    "เลือกชมกล้อง เลนส์ ไฟ แฟลช และอุปกรณ์ถ่ายภาพมือหนึ่งและมือสองที่ MacroCam ราคาที่แสดงรวมค่าจัดส่งแล้ว ซื้อได้โดยไม่ต้องสมัครสมาชิก",
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "MacroCam",
    images: [{ url: "/images/hero-camera.webp", width: 1536, height: 1024 }],
  },
  robots: isDemoMode() ? { index: false, follow: false } : { index: true, follow: true },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [products, settings] = await Promise.all([getCatalog(), getSettings()]);
  const checkoutEnabled =
    isDemoMode() ||
    (process.env.STORE_CHECKOUT_ENABLED === "true" &&
      Boolean(
        settings.paymentQrUrl &&
        settings.paymentAccount &&
        settings.shippingPolicy &&
        settings.returnPolicy &&
        settings.privacyPolicy &&
        settings.warrantyPolicy,
      ));
  return (
    <html lang="th">
      <body>
        <a href="#main-content" className="skip-link">
          ข้ามไปยังเนื้อหา
        </a>
        <StoreProvider
          initialProducts={products}
          initialSettings={settings}
          isDemo={isDemoMode()}
          checkoutEnabled={checkoutEnabled}
        >
          <Header />
          <main id="main-content">{children}</main>
          <Footer />
        </StoreProvider>
      </body>
    </html>
  );
}
