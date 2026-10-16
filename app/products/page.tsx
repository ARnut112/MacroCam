import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
export const metadata: Metadata = { title: "เลือกซื้ออุปกรณ์ถ่ายภาพ" };
export default function Page() {
  return (
    <Suspense fallback={<div className="container page-loading">กำลังจัดชั้นสินค้า…</div>}>
      <Catalog />
    </Suspense>
  );
}
