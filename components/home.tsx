"use client";

import Link from "next/link";
import {
  Aperture,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Focus,
  LampDesk,
  Layers3,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { useStore } from "./store-provider";
import { ProductCard } from "./product-card";
import type { CategoryId } from "@/lib/types";

const categories = [
  { id: "cameras", label: "กล้องถ่ายภาพ", en: "CAMERAS", Icon: Camera },
  { id: "lenses", label: "เลนส์", en: "LENSES", Icon: Focus },
  { id: "lighting", label: "ไฟและแฟลช", en: "LIGHTING", Icon: LampDesk },
  { id: "tripods", label: "ขาตั้งกล้อง", en: "TRIPODS", Icon: ScanLine },
  { id: "accessories", label: "อุปกรณ์เสริม", en: "ACCESSORIES", Icon: Layers3 },
];

export function Home() {
  const { products, isDemo } = useStore();
  const [tab, setTab] = useState("all");
  const shown = products
    .filter((p) => p.published && (tab === "all" || p.category === tab))
    .slice(0, 4);
  const categoryImage = (id: string) => products.find((p) => p.category === id)?.images[0];
  return (
    <>
      <section className="hero container">
        <div className="hero-background" />
        <div className="hero-content">
          <div className="eyebrow">
            <span /> FOR THE LOVE OF PHOTOGRAPHY
          </div>
          <h1>
            ทุกมุมมอง <br />
            เริ่มต้นด้วย
            <span className="hero-red">
              อุปกรณ์ที่ใช่<span className="period">.</span>
            </span>
          </h1>
          <p>
            กล้อง เลนส์ และอุปกรณ์ถ่ายภาพที่คัดมาเพื่อคุณ
            <br />
            ไม่ว่าจะเป็นเฟรมแรก หรือผลงานชิ้นต่อไป
          </p>
          <div className="hero-buttons">
            <Link href="/products" className="button button-red">
              ค้นหาอุปกรณ์ของคุณ <ArrowUpRight size={19} />
            </Link>
            <Link href="/products?condition=used" className="text-button">
              เลือกชมมือสอง <ArrowRight size={16} />
            </Link>
          </div>
          <div className="hero-detail">
            <span className="hero-detail-line" />
            <Aperture size={17} />
            <span>FIND YOUR GEAR. CREATE YOUR STORY.</span>
          </div>
        </div>
        <div className="hero-number">
          01 <span>/ 01</span>
        </div>
        <div className="hero-image-caption">
          <span className="red-line" /> A NEW PERSPECTIVE
          <br />
          <small>มองต่าง แล้วเล่าเรื่องในแบบคุณ</small>
        </div>
      </section>
      <div className="container benefits">
        <div>
          <Truck size={24} />
          <span>
            <strong>ราคาเดียว จบครบ</strong>
            <small>ทุกราคารวมค่าจัดส่งแล้ว</small>
          </span>
        </div>
        <div>
          <ScanLine size={24} />
          <span>
            <strong>รู้สภาพก่อนตัดสินใจ</strong>
            <small>ดูรายละเอียดของสินค้าแต่ละชิ้น</small>
          </span>
        </div>
        <div>
          <ShieldCheck size={24} />
          <span>
            <strong>ซื้อได้ ไม่ต้องสมัครสมาชิก</strong>
            <small>สั่งซื้อสะดวก ไม่ยุ่งยาก</small>
          </span>
        </div>
        <div>
          <PackageCheck size={24} />
          <span>
            <strong>ติดตามได้ทุกขั้นตอน</strong>
            <small>เช็กสถานะด้วยเลขคำสั่งซื้อ</small>
          </span>
        </div>
      </div>
      <section className="container category-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">FIND YOUR FOCUS</span>
            <h2>อุปกรณ์สำหรับทุกไอเดีย</h2>
          </div>
          <Link href="/products" className="section-link">
            เลือกชมทุกหมวด <ArrowRight size={17} />
          </Link>
        </div>
        <div className="category-grid">
          {categories.map(({ id, label, en, Icon }) => (
            <Link key={id} href={`/products?category=${id}`} className="category-card">
              <div className="category-image">
                <img src={categoryImage(id)} alt="" loading="lazy" width={300} height={220} />
              </div>
              <div className="category-copy">
                <span>{en}</span>
                <h3>{label}</h3>
                <small>
                  {products.filter((p) => p.published && p.category === (id as CategoryId)).length}{" "}
                  รายการ
                </small>
              </div>
              <ArrowUpRight size={17} className="category-arrow" />
            </Link>
          ))}
        </div>
      </section>
      <section className="brand-strip container" aria-label="แบรนด์สินค้า">
        <span>
          THE BRANDS
          <br />
          <strong>YOU LOVE.</strong>
        </span>
        <Link href="/products?brand=Sony" className="brand-sony">
          SONY
        </Link>
        <Link href="/products?brand=Canon" className="brand-canon">
          Canon
        </Link>
        <Link href="/products?brand=Nikon" className="brand-nikon">
          Nikon
        </Link>
        <Link href="/products?brand=Fujifilm" className="brand-fuji">
          FUJIFILM
        </Link>
        <Link href="/products?brand=Sigma" className="brand-sigma">
          SIGMA
        </Link>
        <Link href="/products?brand=Godox" className="brand-godox">
          Godox
        </Link>
      </section>
      <section className="container featured-section">
        <div className="section-heading">
          <div>
            <span className="section-eyebrow">GOOD GEAR. GREAT STORIES.</span>
            <h2>
              ของใหม่เข้าร้าน <span className="heading-dot">●</span>
            </h2>
            <p>อุปกรณ์ชิ้นต่อไปของคุณ อาจอยู่ตรงนี้</p>
          </div>
          <Link href="/products" className="section-link">
            ดูสินค้าทั้งหมด <ArrowRight size={17} />
          </Link>
        </div>
        <div className="product-tabs" role="group" aria-label="หมวดสินค้าแนะนำ">
          {[{ id: "all", label: "ทั้งหมด" }, ...categories.slice(0, 3)].map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "selected" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="product-grid">
          {shown.map((product, i) => (
            <ProductCard key={product.id} product={product} priority={i < 4} />
          ))}
        </div>
        {shown.length === 0 && (
          <p className="no-featured">
            ยังไม่มีสินค้าในหมวดนี้ <Link href="/products">เลือกชมหมวดอื่น</Link>
          </p>
        )}
        {isDemo && (
          <p className="demo-caption">
            สินค้า ราคา รูป และสภาพในหน้านี้เป็นข้อมูลประกอบการทดสอบ ยังไม่ใช่รายการขายจริง
          </p>
        )}
      </section>
      <section className="container secondhand-banner">
        <div className="secondhand-art">
          <img
            src="/images/products/nikon-zf.webp"
            alt="กล้องตัวอย่างสำหรับมุมกล้องมือสอง"
            loading="lazy"
            width={600}
            height={400}
          />
          <span className="outlined-word">
            SECOND
            <br />
            STORY.
          </span>
        </div>
        <div className="secondhand-copy">
          <span className="section-eyebrow">GREAT GEAR. ANOTHER CHAPTER.</span>
          <h2>
            อุปกรณ์ดี ๆ <br />
            พร้อมเล่าเรื่องบทใหม่
          </h2>
          <p>
            ค้นพบกล้องและเลนส์มือสองในงบที่ใช่
            <br />
            ดูสภาพ ตำหนิ และอุปกรณ์ให้ครบ ก่อนตัดสินใจ
          </p>
          <Link href="/products?condition=used" className="button button-dark">
            สำรวจมุมกล้องมือสอง <ArrowUpRight size={18} />
          </Link>
        </div>
        <span className="secondhand-index">02 — PRE-LOVED GEAR</span>
      </section>
      <section className="container store-note">
        <div className="note-icon">
          <Aperture size={34} />
        </div>
        <div>
          <span className="section-eyebrow">FROM ONE CREATOR TO ANOTHER</span>
          <h2>เพราะภาพที่ดี เริ่มจากความอยากถ่าย</h2>
          <p>
            MacroCam ช่วยให้การเลือกอุปกรณ์เป็นเรื่องง่าย เพื่อให้คุณใช้เวลากับสิ่งที่รักได้มากขึ้น
          </p>
        </div>
        <Link href="/guide" className="round-arrow" aria-label="อ่านวิธีสั่งซื้อ">
          <ArrowUpRight size={24} />
        </Link>
      </section>
    </>
  );
}
