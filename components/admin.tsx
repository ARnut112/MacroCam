"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  ImagePlus,
  Loader2,
  LockKeyhole,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import type { CategoryId, Order, OrderStatus, Product, StoreSettings } from "@/lib/types";
import { dateTime, money, statusLabels } from "@/lib/format";
import { useStore } from "./store-provider";
import { Breadcrumb } from "./shell";

const categories: { value: CategoryId; label: string }[] = [
  { value: "cameras", label: "กล้อง" },
  { value: "lenses", label: "เลนส์" },
  { value: "lighting", label: "ไฟ / แฟลช" },
  { value: "tripods", label: "ขาตั้ง" },
  { value: "accessories", label: "อุปกรณ์เสริม" },
];
const statuses: OrderStatus[] = [
  "awaiting_payment",
  "slip_submitted",
  "paid",
  "shipped",
  "completed",
  "cancelled",
  "expired",
];

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
async function api<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const response = await fetch(url, {
    method,
    cache: "no-store",
    credentials: "same-origin",
    ...(body === undefined
      ? {}
      : {
          headers: isForm ? undefined : { "Content-Type": "application/json" },
          body: isForm ? body : JSON.stringify(body),
        }),
  });
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(data.error || "ทำรายการไม่สำเร็จ กรุณาลองใหม่", response.status);
  return data;
}

export function Admin() {
  const { isDemo, products: exampleProducts, notify } = useStore();
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(!isDemo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"orders" | "products" | "settings">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<StoreSettings>({});
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [editor, setEditor] = useState<Product | "new" | null>(null);
  const [productSearch, setProductSearch] = useState("");

  const failed = useCallback((problem: unknown) => {
    setError(problem instanceof Error ? problem.message : "ทำรายการไม่สำเร็จค่ะ");
    if (problem instanceof ApiError && problem.status === 401) {
      setAuthenticated(false);
      setOrders([]);
      setProducts([]);
      setSettings({});
    }
  }, []);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    api<{ authenticated: boolean }>("/api/admin/session")
      .then((data) => {
        if (active) setAuthenticated(data.authenticated);
      })
      .catch((problem) => {
        if (active && !(problem instanceof ApiError && problem.status === 401)) failed(problem);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [isDemo, failed]);

  const loadOrders = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    const data = await api<{ orders: Order[]; total: number }>(`/api/admin/orders?${params}`);
    setOrders(data.orders);
    setTotal(data.total || 0);
  }, [page, search, status]);
  const loadProducts = useCallback(async () => {
    const data = await api<{ products: Product[] }>("/api/admin/products");
    setProducts(data.products);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    setBusy(true);
    setError("");
    loadOrders()
      .catch(failed)
      .finally(() => setBusy(false));
  }, [authenticated, loadOrders, failed]);
  useEffect(() => {
    if (!authenticated) return;
    Promise.all([
      loadProducts(),
      api<StoreSettings>("/api/admin/settings").then(setSettings),
    ]).catch(failed);
  }, [authenticated, loadProducts, failed]);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/admin/login", "POST", { email, password });
      setPassword("");
      setAuthenticated(true);
    } catch (problem) {
      failed(problem);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await api("/api/admin/logout", "POST");
      setAuthenticated(false);
      setOrders([]);
      setProducts([]);
      setSettings({});
      setEditor(null);
    } catch (problem) {
      failed(problem);
    } finally {
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await Promise.all([
        loadOrders(),
        loadProducts(),
        api<StoreSettings>("/api/admin/settings").then(setSettings),
      ]);
      notify("ข้อมูลหลังร้านเป็นปัจจุบันแล้วค่ะ");
    } catch (problem) {
      failed(problem);
    } finally {
      setBusy(false);
    }
  }
  async function transition(
    order: Order,
    nextStatus: OrderStatus,
    shippingCompany?: string,
    trackingNumber?: string,
  ) {
    const data = await api<{ order: Order }>(`/api/admin/orders/${order.id}`, "PATCH", {
      status: nextStatus,
      shippingCompany,
      trackingNumber,
    });
    setOrders((current) => current.map((item) => (item.id === order.id ? data.order : item)));
    await Promise.all([loadOrders(), loadProducts()]);
    notify("บันทึกสถานะคำสั่งซื้อแล้วค่ะ");
  }
  async function saveProduct(product: Product, published: boolean) {
    const existing = Boolean(product.id);
    const data = await api<{ product: Product }>(
      existing ? `/api/admin/products/${product.id}` : "/api/admin/products",
      existing ? "PATCH" : "POST",
      { ...product, originalPrice: product.originalPrice ?? null, published },
    );
    setProducts((current) =>
      existing
        ? current.map((item) => (item.id === product.id ? data.product : item))
        : [data.product, ...current],
    );
    setEditor(null);
    notify(published ? "เผยแพร่สินค้าแล้วค่ะ" : "บันทึกฉบับร่างแล้วค่ะ");
  }
  async function togglePublish(product: Product) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ product: Product }>(`/api/admin/products/${product.id}`, "PATCH", {
        published: !product.published,
        updatedAt: "updatedAt" in product ? product.updatedAt : undefined,
      });
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? data.product : item)),
      );
      notify(product.published ? "ซ่อนสินค้าแล้วค่ะ" : "เผยแพร่สินค้าแล้วค่ะ");
    } catch (problem) {
      failed(problem);
    } finally {
      setBusy(false);
    }
  }

  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.brand} ${product.model}`
      .toLowerCase()
      .includes(productSearch.toLowerCase()),
  );
  return (
    <div className="container standard-page admin-page">
      <Breadcrumb items={[{ label: "หลังร้าน" }]} />
      <div className="page-title">
        <span className="section-eyebrow">MACROCAM / STORE MANAGEMENT</span>
        <h1>หลังร้าน MacroCam</h1>
        <p>ดูแลสินค้า ตรวจสลิป และส่งอุปกรณ์สู่เรื่องราวถัดไป</p>
      </div>
      {isDemo ? (
        <>
          <div className="inline-notice admin-demo-notice">
            <LockKeyhole size={23} />
            <div>
              <strong>หลังร้านยังไม่ได้เปิดใช้บัญชีจริง</strong>
              <p>
                ส่วนนี้เป็นหน้าตัวอย่างแบบอ่านอย่างเดียว ไม่มีบัญชีหรือรหัสผ่านตัวอย่าง
                พี่เตรียมระบบเข้าสู่ระบบไว้แล้ว เมื่อเชื่อม Supabase และเพิ่มสิทธิ์เจ้าของร้าน
                จึงจะจัดการข้อมูลได้ค่ะ
              </p>
              <p className="small">
                ก่อนเปิดขาย: เพิ่มสินค้าจริง อัปโหลด QR และระบุนโยบายที่ร้านยืนยัน
                ตามคู่มือเปิดใช้งานในโฟลเดอร์โปรเจกต์
              </p>
            </div>
          </div>
          <div className="admin-section-heading">
            <h2>ตัวอย่างการจัดการสินค้า</h2>
            <span className="small muted">ตัวอย่างเท่านั้น · ยังแก้ไขไม่ได้</span>
          </div>
          <div className="admin-products-grid">
            {exampleProducts.slice(0, 3).map((product) => (
              <article className="admin-card admin-product-card" key={product.id}>
                <img src={product.images[0]} alt={product.name} width={100} height={90} />
                <div>
                  <span className="section-eyebrow">{product.brand}</span>
                  <h3>{product.name}</h3>
                  <p>
                    ฿{money(product.price)} · คงเหลือ {product.stock} ชิ้น
                  </p>
                  <span className="admin-badge">ตัวอย่างสินค้า</span>
                </div>
              </article>
            ))}
          </div>
          <Link href="/products" className="button button-outline">
            กลับไปดูหน้าร้าน
          </Link>
        </>
      ) : checking ? (
        <p className="page-loading">
          <Loader2 className="spin" size={20} /> กำลังตรวจสอบสิทธิ์…
        </p>
      ) : !authenticated ? (
        <form className="form-panel admin-login" onSubmit={login}>
          <LockKeyhole size={35} />
          <h2>เข้าสู่ระบบเจ้าของร้าน</h2>
          <p className="muted">ใช้บัญชีที่ร้านกำหนดสิทธิ์ผู้ดูแลไว้เท่านั้น</p>
          <label>
            อีเมล
            <input
              required
              type="email"
              autoComplete="username"
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            รหัสผ่าน
            <input
              required
              type="password"
              autoComplete="current-password"
              maxLength={256}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          <button disabled={busy} className="button button-dark full-width">
            {busy ? <Loader2 size={18} className="spin" /> : <ShieldCheck size={18} />} เข้าสู่ระบบ
          </button>
          <p className="small muted">ไม่มีการสมัครเป็นผู้ดูแลจากหน้าเว็บไซต์</p>
        </form>
      ) : (
        <>
          <div className="admin-toolbar">
            <div className="admin-tabs" aria-label="ส่วนจัดการร้าน">
              {(
                [
                  { value: "orders", label: "คำสั่งซื้อ", icon: ShoppingBag },
                  { value: "products", label: "สินค้า", icon: Package },
                  { value: "settings", label: "ตั้งค่าร้าน", icon: Settings },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  aria-pressed={tab === item.value}
                  className={tab === item.value ? "active" : ""}
                  onClick={() => setTab(item.value)}
                >
                  <item.icon size={17} />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="admin-actions">
              <button
                className="button button-outline button-small"
                disabled={busy}
                onClick={refresh}
              >
                <RefreshCw size={15} className={busy ? "spin" : ""} /> รีเฟรช
              </button>
              <button
                className="button button-outline button-small"
                disabled={busy}
                onClick={logout}
              >
                <LogOut size={15} /> ออกจากระบบ
              </button>
            </div>
          </div>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {tab === "orders" && (
            <section aria-label="จัดการคำสั่งซื้อ">
              <div className="admin-section-heading">
                <h2>
                  คำสั่งซื้อ <span className="muted">({total})</span>
                </h2>
                <span className="small muted">สลิปต้องตรวจและยืนยันโดยเจ้าของร้าน</span>
              </div>
              <form
                className="admin-order-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(query.trim());
                  setPage(0);
                }}
              >
                <label>
                  ค้นหาเลขคำสั่งซื้อ
                  <div className="admin-search-input">
                    <Search size={17} />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      maxLength={50}
                      placeholder="MC-…"
                    />
                  </div>
                </label>
                <label>
                  สถานะ
                  <select
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setPage(0);
                    }}
                  >
                    <option value="">ทุกสถานะ</option>
                    {statuses.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button button-dark" disabled={busy}>
                  ค้นหา
                </button>
              </form>
              <div className="admin-orders-grid">
                {orders.map((order) => (
                  <AdminOrderCard
                    key={order.id}
                    order={order}
                    onTransition={transition}
                    onError={failed}
                  />
                ))}
              </div>
              {!orders.length && !busy && (
                <div className="form-panel centered">
                  <Package size={34} />
                  <h3>ยังไม่มีคำสั่งซื้อที่ตรงกัน</h3>
                  <p className="muted">
                    รายการที่เสร็จแล้วจะเก็บไว้ในประวัติ และค้นหาได้จากตัวกรองนี้ค่ะ
                  </p>
                </div>
              )}
              {total > 50 && (
                <div className="admin-pagination">
                  <button
                    className="button button-outline button-small"
                    disabled={page === 0 || busy}
                    onClick={() => setPage(page - 1)}
                  >
                    ก่อนหน้า
                  </button>
                  <span>
                    หน้า {page + 1} / {Math.ceil(total / 50)}
                  </span>
                  <button
                    className="button button-outline button-small"
                    disabled={(page + 1) * 50 >= total || busy}
                    onClick={() => setPage(page + 1)}
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </section>
          )}
          {tab === "products" && (
            <section aria-label="จัดการสินค้า">
              <div className="admin-section-heading">
                <h2>สินค้าทั้งหมด ({products.length})</h2>
                <button className="button button-red button-small" onClick={() => setEditor("new")}>
                  <Plus size={17} /> เพิ่มสินค้า
                </button>
              </div>
              <label className="admin-product-search">
                ค้นหาสินค้า
                <input
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="ชื่อ ยี่ห้อ หรือรุ่น"
                />
              </label>
              {editor && (
                <ProductEditor
                  key={editor === "new" ? "new" : editor.id}
                  product={editor === "new" ? blankProduct() : editor}
                  onSave={saveProduct}
                  onClose={() => setEditor(null)}
                  onError={failed}
                />
              )}
              <div className="admin-products-grid">
                {visibleProducts.map((product) => (
                  <article className="admin-card admin-product-card" key={product.id}>
                    <img
                      src={product.images[0] || "/images/hero-camera.webp"}
                      alt={product.name}
                      width={100}
                      height={90}
                    />
                    <div>
                      <span className={`admin-badge ${product.published ? "published" : "draft"}`}>
                        {product.published ? "เผยแพร่แล้ว" : "ฉบับร่าง / ซ่อน"}
                      </span>
                      <h3>{product.name}</h3>
                      <p>
                        {product.brand} · ฿{money(product.price)} · คงเหลือ {product.stock} ชิ้น
                      </p>
                      <div className="admin-actions">
                        <button
                          className="button button-outline button-small"
                          onClick={() => {
                            setEditor(product);
                            window.scrollTo({ top: 180, behavior: "smooth" });
                          }}
                        >
                          <Pencil size={14} /> แก้ไข
                        </button>
                        <button
                          disabled={busy}
                          className="button button-outline button-small"
                          onClick={() => togglePublish(product)}
                        >
                          {product.published ? <EyeOff size={14} /> : <Eye size={14} />}
                          {product.published ? "ซ่อน" : "เผยแพร่"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!visibleProducts.length && (
                <div className="form-panel centered">ยังไม่มีสินค้าในรายการนี้</div>
              )}
            </section>
          )}
          {tab === "settings" && (
            <StoreSettingsEditor settings={settings} onSave={setSettings} onError={failed} />
          )}
        </>
      )}
    </div>
  );
}

function AdminOrderCard({
  order,
  onTransition,
  onError,
}: {
  order: Order;
  onTransition: (
    order: Order,
    status: OrderStatus,
    shippingCompany?: string,
    trackingNumber?: string,
  ) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [company, setCompany] = useState(order.shippingCompany || "");
  const [tracking, setTracking] = useState(order.trackingNumber || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<OrderStatus | null>(null);
  const [events, setEvents] = useState<
    | {
        id: number;
        from_status: string;
        to_status: OrderStatus;
        actor_kind: string;
        created_at: string;
      }[]
    | null
  >(null);
  useEffect(() => {
    setCompany(order.shippingCompany || "");
    setTracking(order.trackingNumber || "");
  }, [order.shippingCompany, order.trackingNumber]);
  async function save(status: OrderStatus) {
    setBusy(true);
    setError("");
    try {
      await onTransition(order, status, company, tracking);
      setConfirmation(null);
      setEvents(null);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "บันทึกไม่สำเร็จ");
      onError(problem);
    } finally {
      setBusy(false);
    }
  }
  async function history() {
    if (events) {
      setEvents(null);
      return;
    }
    try {
      setEvents(
        (await api<{ events: NonNullable<typeof events> }>(`/api/admin/orders/${order.id}/events`))
          .events,
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "เปิดประวัติไม่สำเร็จ");
      onError(problem);
    }
  }
  return (
    <article className="admin-card admin-order-card">
      <div className="admin-order-heading">
        <div>
          <h3>{order.orderNumber}</h3>
          <small className="muted">{dateTime(order.createdAt)}</small>
        </div>
        <span className={`admin-badge ${order.status}`}>{statusLabels[order.status]}</span>
      </div>
      <div className="admin-order-items">
        {order.items.map((item) => (
          <div key={item.productId}>
            <span>
              {item.name} <small>× {item.quantity}</small>
            </span>
            <strong>฿{money(item.price * item.quantity)}</strong>
          </div>
        ))}
      </div>
      <div className="summary-total">
        <span>รวมค่าจัดส่งแล้ว</span>
        <strong>฿{money(order.total)}</strong>
      </div>
      <details className="admin-delivery">
        <summary>
          ข้อมูลผู้รับและที่อยู่จัดส่ง <ChevronDown size={15} />
        </summary>
        <p>
          <strong>{order.recipient}</strong> · <a href={`tel:${order.phone}`}>{order.phone}</a>
        </p>
        <p className="preserve-lines">{order.address}</p>
        {order.note && <p>หมายเหตุ: {order.note}</p>}
      </details>
      {order.status === "awaiting_payment" && (
        <p className="small muted">
          รอสลิปถึง {dateTime(order.expiresAt)} จากนั้นหมดอายุและคืนสต็อก
        </p>
      )}
      {order.slipUrl && (
        <details className="admin-slip">
          <summary>
            <Eye size={16} /> ดูสลิปส่วนตัว
          </summary>
          <a href={order.slipUrl} target="_blank" rel="noopener noreferrer">
            <img src={order.slipUrl} alt={`สลิปคำสั่งซื้อ ${order.orderNumber}`} loading="lazy" />
          </a>
          <p className="small muted">
            ลิงก์ชั่วคราวมีอายุ 60 วินาที หากเปิดไม่ได้ให้กดรีเฟรชหลังร้าน
          </p>
        </details>
      )}
      {order.status === "slip_submitted" && (
        <>
          <p className="small">ตรวจชื่อผู้รับ ยอดเงิน และรายการโอนในบัญชีร้านก่อนยืนยัน</p>
          <button
            className="button button-dark full-width"
            disabled={busy}
            onClick={() => setConfirmation("paid")}
          >
            <ShieldCheck size={17} /> ตรวจแล้ว ยืนยันรับชำระเงิน
          </button>
        </>
      )}
      {order.status === "paid" && (
        <form
          className="admin-shipping-form"
          onSubmit={(event) => {
            event.preventDefault();
            setConfirmation("shipped");
          }}
        >
          <label>
            บริษัทขนส่ง
            <input
              required
              maxLength={100}
              placeholder="ระบุบริษัทที่จัดส่งจริง"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>
          <label>
            เลขติดตามพัสดุ
            <input
              required
              maxLength={100}
              placeholder="เลขพัสดุจริง"
              value={tracking}
              onChange={(event) => setTracking(event.target.value)}
            />
          </label>
          <button disabled={busy} className="button button-dark full-width">
            <Truck size={17} /> บันทึกและเปลี่ยนเป็นจัดส่งแล้ว
          </button>
        </form>
      )}
      {order.status === "shipped" && (
        <div className="admin-shipment">
          <Truck size={18} />
          <span>
            {order.shippingCompany} · <strong>{order.trackingNumber}</strong>
          </span>
          <button
            className="button button-outline button-small"
            disabled={busy}
            onClick={() => setConfirmation("completed")}
          >
            <CheckCircle2 size={15} /> ปิดคำสั่งซื้อ
          </button>
        </div>
      )}
      <div className="admin-actions admin-order-bottom">
        <button className="small-link" onClick={history}>
          {events ? "ซ่อนประวัติ" : "ประวัติสถานะ"}
        </button>
        {["awaiting_payment", "slip_submitted", "paid"].includes(order.status) && (
          <button
            disabled={busy}
            className="small-link danger-text"
            onClick={() => setConfirmation("cancelled")}
          >
            ยกเลิกและคืนสต็อก
          </button>
        )}
      </div>
      {events && (
        <ol className="admin-event-list">
          {events.map((event) => (
            <li key={event.id}>
              <strong>{statusLabels[event.to_status]}</strong>
              <span>
                {dateTime(event.created_at)} ·{" "}
                {event.actor_kind === "admin"
                  ? "ผู้ดูแล"
                  : event.actor_kind === "customer"
                    ? "ลูกค้า"
                    : "ระบบ"}
              </span>
            </li>
          ))}
        </ol>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {confirmation && (
        <div className="admin-confirm-box" role="alert">
          <strong>
            {confirmation === "paid"
              ? "ตรวจพบยอดโอนเข้าบัญชีร้านแล้วใช่ไหมคะ?"
              : confirmation === "shipped"
                ? "ตรวจบริษัทขนส่งและเลขพัสดุถูกต้องแล้วใช่ไหมคะ?"
                : confirmation === "completed"
                  ? "ลูกค้าได้รับสินค้าเรียบร้อยแล้วใช่ไหมคะ?"
                  : "ยกเลิกคำสั่งซื้อนี้และคืนสต็อกใช่ไหมคะ?"}
          </strong>
          {confirmation === "cancelled" && order.status === "paid" && (
            <p className="small">
              รายการนี้รับชำระแล้ว การคืนเงินต้องดำเนินการและตรวจสอบกับลูกค้าแยกจากการยกเลิกค่ะ
            </p>
          )}
          <div className="admin-actions">
            <button
              className="button button-outline button-small"
              disabled={busy}
              onClick={() => setConfirmation(null)}
            >
              ยังไม่ยืนยัน
            </button>
            <button
              className="button button-dark button-small"
              disabled={busy}
              onClick={() => save(confirmation)}
            >
              {busy ? <Loader2 size={15} className="spin" /> : <Check size={15} />} ยืนยัน
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function blankProduct(): Product {
  return {
    id: "",
    slug: "",
    name: "",
    brand: "",
    model: "",
    category: "cameras",
    condition: "new",
    conditionLabel: "มือหนึ่ง",
    price: 0,
    stock: 0,
    images: [],
    tagline: "",
    description: "",
    conditionNotes: "",
    tested: "",
    defects: "",
    included: [],
    warranty: "",
    specs: {},
    published: false,
    createdAt: "",
  };
}

function ProductEditor({
  product,
  onSave,
  onClose,
  onError,
}: {
  product: Product;
  onSave: (product: Product, published: boolean) => Promise<void>;
  onClose: () => void;
  onError: (error: unknown) => void;
}) {
  const [draft, setDraft] = useState(product);
  const [images, setImages] = useState(product.images.join("\n"));
  const [included, setIncluded] = useState(product.included.join("\n"));
  const [specs, setSpecs] = useState(
    Object.entries(product.specs)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n"),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const field = (key: keyof Product, value: unknown) =>
    setDraft((current) => ({ ...current, [key]: value }));
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      if (files.length + images.split("\n").filter(Boolean).length > 20)
        throw new Error("เพิ่มรูปได้ไม่เกิน 20 รูปต่อสินค้าค่ะ");
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 4194304)
          throw new Error("ใช้รูป JPG, PNG หรือ WEBP ขนาดไม่เกิน 4 MB ต่อรูปค่ะ");
        const form = new FormData();
        form.set("file", file);
        form.set("kind", "product");
        urls.push((await api<{ url: string }>("/api/admin/uploads", "POST", form)).url);
      }
      setImages((current) => [current, ...urls].filter(Boolean).join("\n"));
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "อัปโหลดรูปไม่สำเร็จ");
      onError(problem);
    } finally {
      setUploading(false);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const entries = specs
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const colon = line.indexOf(":");
          if (colon < 1 || !line.slice(colon + 1).trim())
            throw new Error("ข้อมูลจำเพาะใช้รูปแบบ หัวข้อ: ค่า บรรทัดละหนึ่งรายการค่ะ");
          return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
        });
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      await onSave(
        {
          ...draft,
          images: images
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          included: included
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
          specs: Object.fromEntries(entries),
        },
        submitter?.value === "publish",
      );
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "บันทึกสินค้าไม่สำเร็จ");
      onError(problem);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-panel admin-product-form" onSubmit={submit}>
      <div className="admin-section-heading">
        <h2>{product.id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label="ปิดแบบฟอร์มสินค้า"
        >
          <X size={20} />
        </button>
      </div>
      <div className="admin-form-grid">
        <label>
          ชื่อสินค้า
          <input
            required
            maxLength={200}
            value={draft.name}
            onChange={(event) => field("name", event.target.value)}
          />
        </label>
        <label>
          ชื่อในลิงก์ (slug)
          <input
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            maxLength={160}
            placeholder="camera-model-name"
            value={draft.slug}
            onChange={(event) => field("slug", event.target.value)}
          />
          <small>ภาษาอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง</small>
        </label>
        <label>
          ยี่ห้อ
          <input
            required
            maxLength={100}
            value={draft.brand}
            onChange={(event) => field("brand", event.target.value)}
          />
        </label>
        <label>
          รุ่น
          <input
            required
            maxLength={150}
            value={draft.model}
            onChange={(event) => field("model", event.target.value)}
          />
        </label>
        <label>
          หมวดหมู่
          <select
            value={draft.category}
            onChange={(event) => field("category", event.target.value)}
          >
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          มือหนึ่ง / มือสอง
          <select
            value={draft.condition}
            onChange={(event) => {
              field("condition", event.target.value);
              field("conditionLabel", event.target.value === "used" ? "มือสอง" : "มือหนึ่ง");
            }}
          >
            <option value="new">มือหนึ่ง</option>
            <option value="used">มือสอง</option>
          </select>
        </label>
        <label>
          ราคา (รวมค่าจัดส่งแล้ว)
          <input
            required
            type="number"
            min="0.01"
            max="999999999"
            step="0.01"
            value={draft.price || ""}
            onChange={(event) => field("price", Number(event.target.value))}
          />
        </label>
        <label>
          สต็อกที่พร้อมขาย
          <input
            required
            type="number"
            min="0"
            max="100000"
            step="1"
            value={draft.stock}
            onChange={(event) => field("stock", Number(event.target.value))}
          />
        </label>
        <label>
          ราคาเดิม (ถ้ามีจริง)
          <input
            type="number"
            min="0.01"
            max="999999999"
            step="0.01"
            value={draft.originalPrice ?? ""}
            onChange={(event) =>
              field("originalPrice", event.target.value ? Number(event.target.value) : undefined)
            }
          />
        </label>
        <label>
          เมาท์ / ระบบที่ยืนยันแล้ว
          <input
            maxLength={100}
            value={draft.mount || ""}
            onChange={(event) => field("mount", event.target.value)}
          />
        </label>
        <label>
          คำแสดงสภาพสินค้า
          <input
            maxLength={100}
            value={draft.conditionLabel}
            onChange={(event) => field("conditionLabel", event.target.value)}
          />
        </label>
        <label>
          ป้ายสินค้า (ถ้ามี)
          <input
            maxLength={80}
            value={draft.badge || ""}
            onChange={(event) => field("badge", event.target.value)}
          />
        </label>
        <label className="admin-field-wide">
          คำอธิบายสั้น
          <input
            maxLength={300}
            value={draft.tagline}
            onChange={(event) => field("tagline", event.target.value)}
          />
        </label>
        <label className="admin-field-wide">
          รายละเอียดสินค้า
          <textarea
            rows={4}
            maxLength={8000}
            value={draft.description}
            onChange={(event) => field("description", event.target.value)}
          />
        </label>
        <label>
          สภาพสินค้า
          <textarea
            rows={3}
            maxLength={3000}
            value={draft.conditionNotes}
            onChange={(event) => field("conditionNotes", event.target.value)}
          />
        </label>
        <label>
          ผลการทดสอบจริง
          <textarea
            rows={3}
            maxLength={3000}
            value={draft.tested}
            onChange={(event) => field("tested", event.target.value)}
          />
        </label>
        <label>
          ตำหนิ
          <textarea
            rows={3}
            maxLength={3000}
            value={draft.defects}
            onChange={(event) => field("defects", event.target.value)}
          />
        </label>
        <label>
          อุปกรณ์ในชุด (บรรทัดละชิ้น)
          <textarea
            rows={3}
            value={included}
            onChange={(event) => setIncluded(event.target.value)}
          />
        </label>
        <label>
          เงื่อนไขประกันของสินค้านี้
          <textarea
            rows={3}
            maxLength={3000}
            value={draft.warranty}
            onChange={(event) => field("warranty", event.target.value)}
          />
        </label>
        <label>
          ข้อมูลจำเพาะ (หัวข้อ: ค่า)
          <textarea
            rows={3}
            value={specs}
            placeholder={"หัวข้อที่ทราบจริง: ข้อมูล\nไม่ทราบให้เว้นไว้"}
            onChange={(event) => setSpecs(event.target.value)}
          />
        </label>
        <label className="admin-field-wide">
          รูปสินค้า (URL บรรทัดละรูป)
          <textarea rows={3} value={images} onChange={(event) => setImages(event.target.value)} />
          <small>เรียงภาพแรกเป็นหน้าปก เพิ่มรูปด้านหลัง ขั้วต่อ อุปกรณ์ และตำหนิจริงได้</small>
        </label>
      </div>
      <label className="button button-outline admin-upload-button">
        <ImagePlus size={17} />
        {uploading ? "กำลังอัปโหลด…" : "อัปโหลดหลายรูป"}
        <input
          type="file"
          multiple
          disabled={uploading || busy}
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      <div className="admin-image-previews">
        {images
          .split("\n")
          .map((value) => value.trim())
          .filter((value) => /^https:\/\//.test(value))
          .map((url, index) => (
            <img
              src={url}
              key={`${url}-${index}`}
              alt={`รูปสินค้าที่ ${index + 1}`}
              width={80}
              height={70}
            />
          ))}
      </div>
      <p className="small muted">
        กรอกเฉพาะข้อมูลที่ยืนยันแล้ว ฉบับร่างและสินค้าที่ซ่อนจะไม่ปรากฏในหน้าร้าน
      </p>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <div className="admin-actions">
        <button
          className="button button-outline"
          name="action"
          value="draft"
          disabled={busy || uploading}
        >
          <Save size={17} /> บันทึกฉบับร่าง / ซ่อน
        </button>
        <button
          className="button button-red"
          name="action"
          value="publish"
          disabled={busy || uploading}
        >
          {busy ? <Loader2 className="spin" size={17} /> : <Check size={17} />} บันทึกและเผยแพร่
        </button>
        <button type="button" className="button button-outline" disabled={busy} onClick={onClose}>
          ยกเลิก
        </button>
      </div>
    </form>
  );
}

function StoreSettingsEditor({
  settings,
  onSave,
  onError,
}: {
  settings: StoreSettings;
  onSave: (settings: StoreSettings) => void;
  onError: (error: unknown) => void;
}) {
  const { notify } = useStore();
  const [draft, setDraft] = useState(settings);
  const [qr, setQr] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft(settings);
  }, [settings]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      for (const key of [
        "paymentAccount",
        "paymentQrUrl",
        "shippingPolicy",
        "returnPolicy",
        "privacyPolicy",
        "warrantyPolicy",
      ] as const)
        form.set(key, draft[key] || "");
      if (qr) form.set("file", qr);
      const data = await api<StoreSettings>("/api/admin/settings", "POST", form);
      onSave(data);
      setQr(null);
      notify("บันทึกการตั้งค่าร้านแล้วค่ะ");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "บันทึกการตั้งค่าไม่สำเร็จ");
      onError(problem);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="form-panel admin-settings" onSubmit={save}>
      <h2>ตั้งค่ารับเงินและข้อมูลร้าน</h2>
      <p className="muted">
        ใช้ข้อมูลที่ร้านยืนยันเท่านั้น ระบบจะไม่รับคำสั่งซื้อจริงจนกว่าตั้งค่า QR บัญชี
        และนโยบายครบค่ะ
      </p>
      <details className="admin-qr-settings">
        <summary>
          <Settings size={18} /> QR และบัญชีรับเงิน <ChevronDown size={16} />
        </summary>
        <div>
          {draft.paymentQrUrl ? (
            <img
              className="admin-qr-preview"
              src={draft.paymentQrUrl}
              alt="QR รับเงินปัจจุบันของร้าน"
              width={180}
              height={180}
            />
          ) : (
            <p className="inline-notice">ยังไม่ได้ตั้งค่า QR รับเงินจริง</p>
          )}
          <label>
            อัปโหลด QR ของร้าน
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                if (
                  file &&
                  (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                    file.size > 4194304)
                ) {
                  setError("ใช้รูป JPG, PNG หรือ WEBP ขนาดไม่เกิน 4 MB ค่ะ");
                  setQr(null);
                  return;
                }
                setError("");
                setQr(file);
              }}
            />
            <small>QR แบบลูกค้ากรอกยอดเอง ตรวจชื่อบัญชีก่อนใช้งาน</small>
          </label>
          <label>
            ชื่อบัญชี / ธนาคาร / เลขบัญชี
            <textarea
              maxLength={1000}
              rows={3}
              value={draft.paymentAccount || ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, paymentAccount: event.target.value }))
              }
              placeholder="ระบุข้อมูลบัญชีจริงที่เจ้าของร้านยืนยัน"
            />
          </label>
          {draft.paymentQrUrl && (
            <button
              type="button"
              className="small-link danger-text"
              onClick={() => {
                setDraft((current) => ({ ...current, paymentQrUrl: null }));
                setQr(null);
              }}
            >
              นำ QR ออก (ต้องกดบันทึก)
            </button>
          )}
        </div>
      </details>
      <div className="admin-form-grid">
        {(
          [
            { key: "shippingPolicy", label: "นโยบายจัดส่ง" },
            { key: "returnPolicy", label: "นโยบายคืนสินค้า" },
            { key: "warrantyPolicy", label: "นโยบายประกัน" },
            { key: "privacyPolicy", label: "นโยบายข้อมูลส่วนบุคคล" },
          ] as const
        ).map((policy) => (
          <label key={policy.key}>
            {policy.label}
            <textarea
              rows={5}
              maxLength={10000}
              value={draft[policy.key] || ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [policy.key]: event.target.value }))
              }
              placeholder="รอข้อมูลที่เจ้าของร้านยืนยัน ไม่ใส่นโยบายตัวอย่างแทนร้าน"
            />
          </label>
        ))}
      </div>
      <p className="small muted">
        คำสั่งซื้อที่ยังไม่ส่งสลิปหมดอายุภายใน 1 ชั่วโมงตามที่นัทยืนยัน
        รายการส่งสลิปแล้วจะรอตรวจด้วยตนเองค่ะ
      </p>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <button className="button button-dark" disabled={busy}>
        {busy ? <Loader2 className="spin" size={17} /> : <Save size={17} />} บันทึกการตั้งค่าร้าน
      </button>
    </form>
  );
}
