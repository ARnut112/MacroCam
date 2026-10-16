"use client";

import Link from "next/link";
import { Heart, Plus, ArrowUpRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { useStore } from "./store-provider";

export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { saved, toggleSaved, addToCart, availableStock } = useStore();
  const stock = availableStock(product);
  const isSaved = saved.includes(product.id);
  return (
    <article className={`product-card ${stock < 1 ? "sold-out" : ""}`}>
      <div className="product-image-wrap">
        <Link href={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
          <img
            src={product.images[0]}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            className="product-image"
            width={560}
            height={420}
          />
        </Link>
        <div className="product-tags">
          {stock > 0 && product.badge && (
            <span className={`product-badge ${product.badge.includes("ใหม่") ? "new-badge" : ""}`}>
              {product.badge}
            </span>
          )}
          <span className={`condition-tag ${product.condition === "used" ? "used" : ""}`}>
            {product.condition === "used" ? "มือสอง" : "มือหนึ่ง"}
          </span>
        </div>
        <button
          className={`save-button ${isSaved ? "is-saved" : ""}`}
          onClick={() => toggleSaved(product.id)}
          disabled={stock === 0 && !isSaved}
          aria-label={isSaved ? `เลิกบันทึก ${product.name}` : `บันทึก ${product.name}`}
          aria-pressed={isSaved}
        >
          <Heart size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
        {stock < 1 && <span className="sold-out-stamp">SOLD OUT</span>}
        <Link className="quick-view" href={`/products/${product.slug}`}>
          ดูรายละเอียด <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <h3>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h3>
        <p className="product-tagline">{product.tagline}</p>
        <div className="stock-line">
          <span className={`stock-dot ${stock < 1 ? "out" : ""}`} />
          {stock > 0
            ? product.condition === "used"
              ? `พร้อมส่ง · เหลือ ${stock} ชิ้น`
              : "มีสินค้า พร้อมส่ง"
            : "สินค้าหมดชั่วคราว"}
        </div>
        <div className="product-bottom">
          <div>
            <div className="product-price">
              ฿{money(product.price)}
              {product.originalPrice && <del>฿{money(product.originalPrice)}</del>}
            </div>
            <span className="shipping-note">รวมค่าจัดส่งแล้ว</span>
          </div>
          <button
            className="add-button"
            onClick={() => addToCart(product.id)}
            disabled={stock === 0}
            aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
          >
            <Plus size={19} />
          </button>
        </div>
      </div>
    </article>
  );
}
