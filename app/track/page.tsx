import { Suspense } from "react";
import { TrackOrder } from "@/components/orders";
export const metadata = { title: "ติดตามคำสั่งซื้อ", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <Suspense fallback={<p className="page-loading">กำลังโหลด…</p>}>
      <TrackOrder />
    </Suspense>
  );
}
