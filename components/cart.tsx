"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";
import { useStore } from "./store-provider";
import { Breadcrumb, EmptyState } from "./shell";
import { money } from "@/lib/format";

export function Cart() {
  const { cart, products, ready, setQuantity, removeFromCart, availableStock, isDemo } = useStore();
  const items = cart.flatMap((item) => {
    const product = products.find((p) => p.id === item.productId);
    return product ? [{ ...item, product }] : [];
  });
  const total = items.reduce((sum, i) => sum + i.quantity * i.product.price, 0);
  const invalid = items.some((i) => i.quantity > availableStock(i.product));
  return (
    <div className="container standard-page">
      <Breadcrumb items={[{ label: "ตะกร้าสินค้า" }]} />
      <div className="page-title">
        <span className="section-eyebrow">ONE STEP CLOSER TO YOUR NEXT SHOT</span>
        <h1>
          <ShoppingBag size={30} /> ตะกร้าของคุณ
        </h1>
        <p>เช็กอุปกรณ์ให้พร้อม แล้วไปสร้างเรื่องราวใหม่กัน</p>
      </div>
      {!ready ? (
        <p className="page-loading">กำลังเปิดตะกร้า…</p>
      ) : !items.length ? (
        <EmptyState
          title="ตะกร้ายังว่าง รออุปกรณ์ชิ้นโปรดอยู่"
          detail="เลือกกล้อง เลนส์ หรืออุปกรณ์ที่ชอบ แล้วเพิ่มลงตะกร้าได้เลยค่ะ"
          icon="bag"
        />
      ) : (
        <div className="checkout-layout">
          <section className="cart-list">
            <div className="cart-list-heading">
              <h2>อุปกรณ์ที่เลือกไว้</h2>
              <span>{cart.reduce((sum, i) => sum + i.quantity, 0)} ชิ้น</span>
            </div>
            {items.map(({ product, quantity }) => (
              <article className="cart-item" key={product.id}>
                <Link className="cart-item-image" href={`/products/${product.slug}`}>
                  <img src={product.images[0]} alt={product.name} width={160} height={140} />
                </Link>
                <div className="cart-item-info">
                  <span className="product-brand">{product.brand}</span>
                  <h3>
                    <Link href={`/products/${product.slug}`}>{product.name}</Link>
                  </h3>
                  <span className="small muted">
                    {product.condition === "new" ? "มือหนึ่ง" : "มือสอง"} ·{" "}
                    {product.mount || "อุปกรณ์ถ่ายภาพ"}
                  </span>
                  <strong>฿{money(product.price)}</strong>
                  {quantity > availableStock(product) && (
                    <span className="field-error">
                      สต็อกคงเหลือ {availableStock(product)} ชิ้น กรุณาปรับจำนวน
                    </span>
                  )}
                </div>
                <div className="cart-item-controls">
                  <button
                    className="remove-button"
                    onClick={() => removeFromCart(product.id)}
                    aria-label={`นำ ${product.name} ออกจากตะกร้า`}
                  >
                    <Trash2 size={17} />
                  </button>
                  <div className="quantity-control">
                    <button
                      onClick={() => setQuantity(product.id, quantity - 1)}
                      aria-label={`ลดจำนวน ${product.name}`}
                    >
                      <Minus size={14} />
                    </button>
                    <span>{quantity}</span>
                    <button
                      disabled={quantity >= availableStock(product)}
                      onClick={() => setQuantity(product.id, quantity + 1)}
                      aria-label={`เพิ่มจำนวน ${product.name}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <strong className="cart-subtotal">฿{money(product.price * quantity)}</strong>
                </div>
              </article>
            ))}
            <Link href="/products" className="small-link">
              <ArrowLeft size={16} /> เลือกอุปกรณ์เพิ่ม
            </Link>
          </section>
          <aside className="order-summary">
            <h2>สรุปคำสั่งซื้อ</h2>
            <div className="summary-row">
              <span>ราคาสินค้า</span>
              <strong>฿{money(total)}</strong>
            </div>
            <div className="summary-row">
              <span>ค่าจัดส่ง</span>
              <span className="green-text">รวมในราคาสินค้าแล้ว</span>
            </div>
            <div className="summary-total">
              <span>ยอดรวมทั้งหมด</span>
              <strong>฿{money(total)}</strong>
            </div>
            {isDemo && <div className="inline-notice">โหมดตัวอย่าง — ไม่ต้องชำระเงินจริง</div>}
            {invalid ? (
              <p className="field-error">กรุณาปรับจำนวนสินค้าก่อนไปต่อค่ะ</p>
            ) : (
              <Link href="/checkout" className="button button-red full-width">
                ไปกรอกข้อมูลจัดส่ง <ArrowRight size={18} />
              </Link>
            )}
            <p className="summary-footnote">
              <Truck size={16} /> จัดส่งตามเงื่อนไขที่ร้านกำหนด
            </p>
            <p className="small muted centered">สั่งซื้อได้เลย ไม่ต้องสมัครสมาชิก</p>
          </aside>
        </div>
      )}
    </div>
  );
}
