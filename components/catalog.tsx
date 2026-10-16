"use client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Camera, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "./store-provider";
import { ProductCard } from "./product-card";
import { Breadcrumb, EmptyState } from "./shell";
import { filterProducts } from "@/lib/catalog-filter";

const categories = [
  { id: "cameras", label: "กล้องถ่ายภาพ" },
  { id: "lenses", label: "เลนส์" },
  { id: "lighting", label: "ไฟและแฟลช" },
  { id: "tripods", label: "ขาตั้งกล้อง" },
  { id: "accessories", label: "อุปกรณ์เสริม" },
];
export function Catalog() {
  const { products, isDemo } = useStore();
  const searchParams = useSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams.get("q")]);
  const selected = searchParams.get("category");
  const title = categories.find((c) => c.id === selected)?.label || "อุปกรณ์ถ่ายภาพทั้งหมด";
  const filtered = filterProducts(products, new URLSearchParams(searchParams.toString()));
  const brands = [...new Set(products.filter((p) => p.published).map((p) => p.brand))].sort();
  const mounts = [
    ...new Set(
      products
        .filter((p) => p.published)
        .map((p) => p.mount)
        .filter(Boolean),
    ),
  ] as string[];
  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) params.set(key, value);
    else params.delete(key);
    window.history.replaceState(null, "", `/products${params.size ? `?${params}` : ""}`);
  };
  const clear = () => {
    setSearch("");
    window.history.replaceState(null, "", "/products");
  };
  const activeFilters = [...searchParams.entries()].filter(([key]) => key !== "sort");
  return (
    <div className="container catalog-page">
      <Breadcrumb items={[{ label: "สินค้าทั้งหมด" }]} />
      <div className="catalog-title">
        <div>
          <span className="section-eyebrow">YOUR NEXT FAVORITE GEAR</span>
          <h1>{title}</h1>
          <p>อุปกรณ์ที่ใช่ พร้อมสำหรับเรื่องราวครั้งต่อไปของคุณ</p>
        </div>
        <div className="catalog-title-icon">
          <Camera size={44} strokeWidth={1} />
        </div>
      </div>
      <div className="catalog-layout">
        <aside className={`filters ${filterOpen ? "filters-open" : ""}`}>
          <div className="filter-header">
            <h2>
              <SlidersHorizontal size={18} /> ตัวกรองสินค้า
            </h2>
            <button className="text-reset" onClick={clear}>
              ล้างทั้งหมด
            </button>
            <button
              className="icon-button filter-close"
              onClick={() => setFilterOpen(false)}
              aria-label="ปิดตัวกรอง"
            >
              <X size={20} />
            </button>
          </div>
          <fieldset>
            <legend>หมวดหมู่</legend>
            <label className="filter-option">
              <input
                type="radio"
                name="category"
                checked={!selected}
                onChange={() => setParam("category", "")}
              />
              <span>สินค้าทั้งหมด</span>
              <small>{products.filter((p) => p.published).length}</small>
            </label>
            {categories.map((c) => (
              <label className="filter-option" key={c.id}>
                <input
                  type="radio"
                  name="category"
                  checked={selected === c.id}
                  onChange={() => setParam("category", c.id)}
                />
                <span>{c.label}</span>
                <small>{products.filter((p) => p.published && p.category === c.id).length}</small>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>แบรนด์</legend>
            {brands.map((brand) => (
              <label key={brand} className="filter-option">
                <input
                  type="checkbox"
                  checked={searchParams.get("brand") === brand}
                  onChange={() =>
                    setParam("brand", searchParams.get("brand") === brand ? "" : brand)
                  }
                />
                <span>{brand}</span>
                <small>{products.filter((p) => p.published && p.brand === brand).length}</small>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>สภาพสินค้า</legend>
            {[
              { id: "new", label: "มือหนึ่ง" },
              { id: "used", label: "มือสอง" },
            ].map((c) => (
              <label key={c.id} className="filter-option">
                <input
                  type="checkbox"
                  checked={searchParams.get("condition") === c.id}
                  onChange={() =>
                    setParam("condition", searchParams.get("condition") === c.id ? "" : c.id)
                  }
                />
                <span>{c.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>เมาท์ / ระบบที่รองรับ</legend>
            <select
              aria-label="เมาท์เลนส์"
              value={searchParams.get("mount") || ""}
              onChange={(e) => setParam("mount", e.target.value)}
            >
              <option value="">ทุกเมาท์</option>
              {mounts.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </fieldset>
          <fieldset>
            <legend>สถานะสินค้า</legend>
            <label className="filter-option">
              <input
                type="checkbox"
                checked={searchParams.get("stock") === "available"}
                onChange={(e) => setParam("stock", e.target.checked ? "available" : "")}
              />
              <span>แสดงเฉพาะสินค้าพร้อมส่ง</span>
            </label>
          </fieldset>
          <div className="filter-note">
            <TruckIcon />
            ราคาทุกชิ้นรวมค่าจัดส่งแล้ว
          </div>
          <button className="button button-dark filter-apply" onClick={() => setFilterOpen(false)}>
            ดูสินค้า {filtered.length} รายการ <ArrowRight size={16} />
          </button>
        </aside>
        <section className="catalog-results">
          <form
            className="catalog-search"
            onSubmit={(e) => {
              e.preventDefault();
              setParam("q", search);
            }}
          >
            <Search size={19} />
            <input
              aria-label="ค้นหาภายในรายการสินค้า"
              placeholder="ค้นหาชื่อสินค้า ยี่ห้อ หรือรุ่น…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit">
              ค้นหา <ArrowRight size={15} />
            </button>
          </form>
          <div className="catalog-toolbar">
            <span>
              <strong>{filtered.length}</strong> รายการ
              {searchParams.get("q") && <> สำหรับ “{searchParams.get("q")}”</>}
            </span>
            <div>
              <button className="filter-toggle" onClick={() => setFilterOpen(true)}>
                <SlidersHorizontal size={16} /> ตัวกรอง
              </button>
              <label className="sort-control">
                <span>เรียงตาม</span>
                <select
                  aria-label="เรียงสินค้า"
                  value={searchParams.get("sort") || "newest"}
                  onChange={(e) => setParam("sort", e.target.value)}
                >
                  <option value="newest">ใหม่ล่าสุด</option>
                  <option value="price-asc">ราคา: ต่ำไปสูง</option>
                  <option value="price-desc">ราคา: สูงไปต่ำ</option>
                  <option value="name">ชื่อสินค้า: ก–ฮ</option>
                </select>
                <ChevronDown size={14} />
              </label>
            </div>
          </div>
          {activeFilters.length > 0 && (
            <div className="filter-chips">
              {activeFilters.map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === "q") setSearch("");
                    setParam(key, "");
                  }}
                >
                  {categories.find((c) => c.id === value)?.label ||
                    (value === "new"
                      ? "มือหนึ่ง"
                      : value === "used"
                        ? "มือสอง"
                        : value === "available"
                          ? "พร้อมส่ง"
                          : value)}
                  <X size={13} />
                </button>
              ))}
            </div>
          )}
          {filtered.length ? (
            <div className="product-grid catalog-product-grid">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="ยังไม่พบอุปกรณ์ที่ค้นหา"
              detail="ลองเปลี่ยนคำค้น หรือเลือกหมวดหมู่และตัวกรองอื่นดูค่ะ"
              action="กลับไปดูสินค้าทั้งหมด"
            />
          )}
          {isDemo && (
            <p className="demo-caption">
              รายการนี้เป็นข้อมูลตัวอย่างสำหรับทดสอบระบบ ราคาและสภาพยังไม่ใช่ข้อมูลขายจริง
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
function TruckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M2 4h13v13H2zM15 9h4l3 4v4h-7" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </svg>
  );
}
