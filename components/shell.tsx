"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Aperture,
  ArrowRight,
  Heart,
  Menu,
  Package,
  Search,
  ShoppingBag,
  Truck,
  X,
  ArrowUpRight,
  Camera,
} from "lucide-react";
import { useStore } from "./store-provider";

export function Header() {
  const { cartCount, saved, isDemo } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const links = [
    { label: "หน้าแรก", href: "/" },
    { label: "สินค้าทั้งหมด", href: "/products" },
    { label: "กล้อง", href: "/products?category=cameras" },
    { label: "เลนส์", href: "/products?category=lenses" },
    { label: "ไฟและแฟลช", href: "/products?category=lighting" },
    { label: "อุปกรณ์เสริม", href: "/products?category=accessories" },
  ];
  return (
    <>
      <div className="announcement">
        <span>
          <Truck size={14} /> ราคาที่เห็น รวมค่าจัดส่งแล้ว
        </span>
        <span className="announcement-right">
          {isDemo
            ? "ร้านตัวอย่าง · ยังไม่เปิดรับชำระเงินจริง"
            : "อุปกรณ์คู่ใจ สำหรับทุกมุมมองของคุณ"}
          <ArrowUpRight size={13} />
        </span>
      </div>
      <header className="header">
        <div className="header-main container">
          <Link href="/" className="logo" aria-label="MacroCam หน้าแรก">
            <Aperture className="logo-icon" size={36} strokeWidth={2.2} />
            <span>
              Macro<span className="logo-red">Cam</span>
              <small>YOUR NEXT PERSPECTIVE.</small>
            </span>
          </Link>
          <form
            className="header-search"
            onSubmit={(e) => {
              e.preventDefault();
              router.push(`/products?q=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={19} />
            <input
              aria-label="ค้นหาสินค้า"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหากล้อง เลนส์ หรืออุปกรณ์ที่ใช่…"
            />
            <kbd>ค้นหา</kbd>
          </form>
          <div className="header-actions">
            <Link href="/track" className="tracking-link">
              <Package size={21} />
              <span>ติดตามคำสั่งซื้อ</span>
            </Link>
            <span className="header-divider" />
            <Link
              href="/saved"
              className="icon-button"
              aria-label={`รายการที่บันทึกไว้ ${saved.length} รายการ`}
            >
              <Heart size={23} />
              {saved.length > 0 && <b className="count-badge">{saved.length}</b>}
            </Link>
            <Link
              href="/cart"
              className="icon-button"
              aria-label={`ตะกร้าสินค้า ${cartCount} ชิ้น`}
            >
              <ShoppingBag size={23} />
              {cartCount > 0 && <b className="count-badge">{cartCount}</b>}
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={23} /> : <Menu size={23} />}
            </button>
          </div>
        </div>
        <div className={`navigation ${menuOpen ? "open" : ""}`}>
          <div className="container nav-inner">
            <nav aria-label="เมนูหลัก">
              {links.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={pathname === link.href ? "active" : ""}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <Link href="/products?condition=used" className="used-link">
              <span className="green-dot" /> มุมกล้องมือสอง <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  const { isDemo } = useStore();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link href="/" className="logo">
            <Aperture size={33} />
            <span>
              Macro<span className="logo-red">Cam</span>
            </span>
          </Link>
          <p>
            อุปกรณ์ที่ใช่ สำหรับภาพในแบบคุณ
            <br />
            กล้อง เลนส์ และไอเดียใหม่ ๆ เริ่มได้ที่นี่
          </p>
          <span className="footer-caption">YOUR NEXT PERSPECTIVE.</span>
        </div>
        <div>
          <h3>เลือกอุปกรณ์</h3>
          <Link href="/products?category=cameras">กล้องถ่ายภาพ</Link>
          <Link href="/products?category=lenses">เลนส์</Link>
          <Link href="/products?category=lighting">ไฟและแฟลช</Link>
          <Link href="/products?category=tripods">ขาตั้งและอุปกรณ์เสริม</Link>
        </div>
        <div>
          <h3>ให้เราช่วยคุณ</h3>
          <Link href="/track">ติดตามคำสั่งซื้อ</Link>
          <Link href="/guide">วิธีสั่งซื้อและชำระเงิน</Link>
          <Link href="/policies?section=shipping">การจัดส่งและคืนสินค้า</Link>
          <Link href="/policies?section=privacy">นโยบายข้อมูลส่วนบุคคล</Link>
        </div>
        <div>
          <h3>ทุกภาพ มีจุดเริ่มต้น</h3>
          <p>
            เลือกอุปกรณ์ให้เข้ากับมุมมองของคุณ
            <br />
            ค่อย ๆ เก็บทุกช่วงเวลาที่สำคัญ
          </p>
          <Link href="/products" className="footer-explore">
            ค้นหาอุปกรณ์ของคุณ <ArrowUpRight size={17} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} MacroCam. All rights reserved.</span>
        <span>{isDemo && "เว็บไซต์ตัวอย่าง · สินค้าและราคาใช้เพื่อทดสอบ"}</span>
        <a href="/images/SOURCES.md" target="_blank" rel="noreferrer">
          เครดิตภาพ
        </a>
        <Link href="/admin">
          สำหรับผู้ดูแลร้าน <ArrowUpRight size={13} />
        </Link>
      </div>
    </footer>
  );
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="breadcrumb" aria-label="ตำแหน่งหน้าปัจจุบัน">
      <Link href="/">หน้าแรก</Link>
      {items.map((item, i) => (
        <span key={i}>
          <span className="crumb-separator">/</span>
          {item.href ? (
            <Link href={item.href}>{item.label}</Link>
          ) : (
            <span aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function EmptyState({
  title,
  detail,
  icon = "camera",
  action = "ดูสินค้าทั้งหมด",
  href = "/products",
}: {
  title: string;
  detail: string;
  icon?: "camera" | "bag" | "heart";
  action?: string;
  href?: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {icon === "bag" ? (
          <ShoppingBag size={35} />
        ) : icon === "heart" ? (
          <Heart size={35} />
        ) : (
          <Camera size={35} />
        )}
      </div>
      <h2>{title}</h2>
      <p>{detail}</p>
      <Link className="button button-dark" href={href}>
        {action}
        <ArrowRight size={17} />
      </Link>
    </div>
  );
}
