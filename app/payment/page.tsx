import { Suspense } from "react";
import { Payment } from "@/components/orders";
export const metadata = { title: "ชำระเงินและแนบสลิป", robots: { index: false, follow: false } };
export default function Page() {
  return (
    <Suspense fallback={<p className="page-loading">กำลังเปิดคำสั่งซื้อ…</p>}>
      <Payment />
    </Suspense>
  );
}
