"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Truck,
  ZoomIn,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { useStore } from "./store-provider";
import { Breadcrumb } from "./shell";
import { ProductCard } from "./product-card";

const categoryLabels: Record<string, string> = {
  cameras: "กล้องถ่ายภาพ",
  lenses: "เลนส์",
  lighting: "ไฟและแฟลช",
  tripods: "ขาตั้งกล้อง",
  accessories: "อุปกรณ์เสริม",
};
export function ProductDetail({ product }: { product: Product }) {
  const { products, isDemo, saved, toggleSaved, addToCart, availableStock } = useStore();
  const [image, setImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [zoom, setZoom] = useState(false);
  const stock = availableStock(product);
  const similar = products
    .filter((p) => p.published && p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  return (
    <div className="container detail-page">
      <Breadcrumb
        items={[
          { label: "สินค้าทั้งหมด", href: "/products" },
          {
            label: categoryLabels[product.category],
            href: `/products?category=${product.category}`,
          },
          { label: product.name },
        ]}
      />
      <div className="detail-grid">
        <div className="detail-gallery">
          <button
            className={`detail-main-image ${stock === 0 ? "sold-out" : ""}`}
            onClick={() => setZoom(true)}
            aria-label="ขยายรูปสินค้า"
          >
            <img
              src={product.images[image]}
              alt={`${product.name} รูปที่ ${image + 1}`}
              width={800}
              height={650}
            />
            <ZoomIn className="zoom-icon" size={22} />
            {stock === 0 && <span className="sold-out-stamp">SOLD OUT</span>}
          </button>
          <div className="detail-thumbnails">
            {product.images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                className={i === image ? "selected" : ""}
                onClick={() => setImage(i)}
                aria-label={`ดูรูปที่ ${i + 1}`}
                aria-pressed={i === image}
              >
                <img src={src} alt="" width={100} height={90} />
              </button>
            ))}
          </div>
          <p className="gallery-note">
            {isDemo
              ? "ภาพประกอบตัวอย่าง ไม่ใช่ภาพสินค้าชิ้นที่ขายจริง"
              : "ดูรูปและรายละเอียดทุกด้านก่อนตัดสินใจ"}
          </p>
        </div>
        <div className="detail-summary">
          <span className="section-eyebrow">
            {product.brand.toUpperCase()} / {categoryLabels[product.category]}
          </span>
          <h1>{product.name}</h1>
          <p className="detail-tagline">{product.tagline}</p>
          <div className="detail-tags">
            <span className={`condition-tag ${product.condition === "used" ? "used" : ""}`}>
              {product.condition === "used" ? "มือสอง" : "มือหนึ่ง"}
            </span>
            {product.mount && <span className="mount-tag">{product.mount}</span>}
            <span className="stock-line">
              <span className={`stock-dot ${!stock ? "out" : ""}`} />
              {stock ? `พร้อมส่ง ${stock} ชิ้น` : "สินค้าหมดชั่วคราว"}
            </span>
          </div>
          <div className="detail-price">
            ฿{money(product.price)}
            {product.originalPrice && <del>฿{money(product.originalPrice)}</del>}
          </div>
          <p className="detail-shipping">
            <Truck size={17} /> ราคานี้รวมค่าจัดส่งแล้ว
          </p>
          <p className="detail-description">{product.description}</p>
          {isDemo && (
            <div className="inline-notice">
              ข้อมูลตัวอย่างสำหรับทดสอบระบบ ยังไม่เปิดรับชำระเงินจริง
            </div>
          )}
          <div className="detail-buy">
            <div className="quantity-control">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || !stock}
                aria-label="ลดจำนวน"
              >
                <Minus size={16} />
              </button>
              <span>{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                disabled={quantity >= stock || !stock}
                aria-label="เพิ่มจำนวน"
              >
                <Plus size={16} />
              </button>
            </div>
            <button
              className="button button-red"
              disabled={!stock}
              onClick={() => addToCart(product.id, quantity)}
            >
              <ShoppingBag size={19} />
              {stock ? "เพิ่มลงตะกร้า" : "สินค้าหมด"}
            </button>
            <button
              className={`detail-save icon-button ${saved.includes(product.id) ? "is-saved" : ""}`}
              onClick={() => toggleSaved(product.id)}
              disabled={!stock && !saved.includes(product.id)}
              aria-label="บันทึกสินค้า"
              aria-pressed={saved.includes(product.id)}
            >
              <Heart size={21} fill={saved.includes(product.id) ? "currentColor" : "none"} />
            </button>
          </div>
          <div className="detail-assurance">
            <span>
              <Check size={16} /> ไม่ต้องสมัครสมาชิก
            </span>
            <span>
              <ShieldCheck size={16} /> ร้านตรวจการชำระเงินด้วยตนเอง
            </span>
          </div>
          <Link href="/guide" className="small-link">
            วิธีสั่งซื้อและชำระเงิน <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <div className="detail-specs-grid">
        <section className="info-panel">
          <span className="section-eyebrow">KNOW YOUR GEAR</span>
          <h2>สภาพและรายละเอียดสินค้า</h2>
          <dl>
            <div>
              <dt>สภาพสินค้า</dt>
              <dd>{product.conditionNotes}</dd>
            </div>
            <div>
              <dt>ผลการทดสอบ</dt>
              <dd>{product.tested}</dd>
            </div>
            <div>
              <dt>ตำหนิ</dt>
              <dd>{product.defects}</dd>
            </div>
            <div>
              <dt>การรับประกัน</dt>
              <dd>{product.warranty}</dd>
            </div>
          </dl>
          <h3>อุปกรณ์ในชุด</h3>
          <ul>
            {product.included.map((item) => (
              <li key={item}>
                <Check size={15} /> {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="info-panel">
          <span className="section-eyebrow">THE DETAILS MATTER</span>
          <h2>ข้อมูลจำเพาะ</h2>
          <dl>
            <div>
              <dt>ยี่ห้อ</dt>
              <dd>{product.brand}</dd>
            </div>
            <div>
              <dt>รุ่น</dt>
              <dd>{product.model}</dd>
            </div>
            {product.mount && (
              <div>
                <dt>เมาท์ / ระบบ</dt>
                <dd>{product.mount}</dd>
              </div>
            )}
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="muted small">
            รายละเอียดที่ยังไม่ทราบจะแสดงว่า “รอร้านยืนยัน”
            กรุณาตรวจข้อมูลสินค้าชิ้นจริงก่อนสั่งซื้อ
          </p>
        </section>
      </div>
      {similar.length > 0 && (
        <section className="related-section">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">MORE TO EXPLORE</span>
              <h2>เผื่อจะเป็นชิ้นที่ใช่</h2>
            </div>
            <Link href={`/products?category=${product.category}`} className="section-link">
              ดูเพิ่ม <ArrowRight size={17} />
            </Link>
          </div>
          <div className="product-grid">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
      {zoom && (
        <div
          className="image-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="รูปสินค้าขนาดใหญ่"
          onClick={() => setZoom(false)}
        >
          <button className="button button-white" onClick={() => setZoom(false)} autoFocus>
            ปิดรูป ×
          </button>
          <img src={product.images[image]} alt={product.name} />
        </div>
      )}
    </div>
  );
}
