"use client";
import { Heart } from "lucide-react";
import { useStore } from "./store-provider";
import { Breadcrumb, EmptyState } from "./shell";
import { ProductCard } from "./product-card";
export function Saved() {
  const { saved, products, ready } = useStore();
  const items = products.filter((p) => p.published && saved.includes(p.id));
  return (
    <div className="container standard-page">
      <Breadcrumb items={[{ label: "สินค้าที่บันทึกไว้" }]} />
      <div className="page-title">
        <span className="section-eyebrow">SAVE IT FOR YOUR NEXT STORY</span>
        <h1>
          <Heart size={29} /> ชิ้นที่อยากได้
        </h1>
        <p>เก็บอุปกรณ์ที่ถูกใจไว้เลือกทีหลังได้ ไม่ต้องสมัครสมาชิก</p>
      </div>
      {!ready ? (
        <p className="page-loading">กำลังเปิดรายการของคุณ…</p>
      ) : items.length ? (
        <>
          <p className="result-count">บันทึกไว้ {items.length} รายการ</p>
          <div className="product-grid">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="เจอชิ้นที่ใช่แล้วกดหัวใจไว้เลย"
          detail="รายการที่บันทึกจะอยู่ในเบราว์เซอร์นี้ ให้กลับมาดูได้สะดวกค่ะ"
          icon="heart"
        />
      )}
    </div>
  );
}
