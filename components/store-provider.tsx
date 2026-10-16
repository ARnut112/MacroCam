"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { CartItem, Order, Product, StoreSettings } from "@/lib/types";

interface Customer {
  recipient: string;
  phone: string;
  address: string;
  note: string;
}
interface StoreContextValue {
  products: Product[];
  settings: StoreSettings;
  isDemo: boolean;
  checkoutEnabled: boolean;
  ready: boolean;
  cart: CartItem[];
  saved: string[];
  toast: string;
  cartCount: number;
  addToCart: (id: string, quantity?: number) => boolean;
  setQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  toggleSaved: (id: string) => void;
  notify: (message: string) => void;
  availableStock: (product: Product) => number;
  createOrder: (customer: Customer) => Promise<Order>;
  lookupOrder: (orderNumber: string, phone: string) => Promise<Order>;
  resumeOrder: (orderNumber: string) => Promise<Order | null>;
  uploadSlip: (order: Order, file: File) => Promise<Order>;
  completeOrder: (order: Order) => Promise<Order>;
  lastOrderNumber: string;
}
const Context = createContext<StoreContextValue | null>(null);
export const useStore = () => {
  const context = useContext(Context);
  if (!context) throw new Error("StoreProvider required");
  return context;
};

async function request<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง");
  return result;
}

export function StoreProvider({
  children,
  initialProducts,
  initialSettings,
  isDemo,
  checkoutEnabled,
}: {
  children: ReactNode;
  initialProducts: Product[];
  initialSettings: StoreSettings;
  isDemo: boolean;
  checkoutEnabled: boolean;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [demoOrders, setDemoOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  const [lastOrderNumber, setLastOrderNumber] = useState("");
  const submitting = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3600);
  }, []);

  useEffect(() => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("macrocam-cart") || "[]");
      if (Array.isArray(storedCart))
        setCart(
          storedCart.filter(
            (i) =>
              initialProducts.some((p) => p.id === i.productId) &&
              Number.isInteger(i.quantity) &&
              i.quantity > 0,
          ),
        );
      const storedSaved = JSON.parse(localStorage.getItem("macrocam-saved") || "[]");
      if (Array.isArray(storedSaved)) setSaved(storedSaved.filter((id) => typeof id === "string"));
      const orders = JSON.parse(localStorage.getItem("macrocam-demo-orders") || "[]");
      if (isDemo && Array.isArray(orders))
        setDemoOrders(orders.filter((o) => o.isDemo && o.orderNumber && Array.isArray(o.items)));
      setLastOrderNumber(localStorage.getItem("macrocam-last-order") || "");
    } catch {
      /* Browsing remains available when browser storage is blocked. */
    }
    setReady(true);
  }, [initialProducts, isDemo]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("macrocam-cart", JSON.stringify(cart));
      localStorage.setItem("macrocam-saved", JSON.stringify(saved));
      if (isDemo) localStorage.setItem("macrocam-demo-orders", JSON.stringify(demoOrders));
    } catch {
      /* Storage is optional for catalog browsing. */
    }
  }, [cart, saved, demoOrders, ready, isDemo]);

  useEffect(() => {
    if (!isDemo) return;
    const timer = setInterval(
      () =>
        setDemoOrders((orders) =>
          orders.map((o) =>
            o.status === "awaiting_payment" && Date.parse(o.expiresAt) <= Date.now()
              ? { ...o, status: "expired" }
              : o,
          ),
        ),
      15000,
    );
    return () => clearInterval(timer);
  }, [isDemo]);

  const availableStock = useCallback(
    (product: Product) => {
      if (!isDemo) return product.stock;
      const reserved = demoOrders
        .filter(
          (o) =>
            !["cancelled", "expired"].includes(o.status) &&
            !(o.status === "awaiting_payment" && Date.parse(o.expiresAt) <= Date.now()),
        )
        .flatMap((o) => o.items)
        .filter((i) => i.productId === product.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      return Math.max(0, product.stock - reserved);
    },
    [demoOrders, isDemo],
  );

  const addToCart = (id: string, quantity = 1) => {
    const product = initialProducts.find((p) => p.id === id);
    if (!product || !Number.isInteger(quantity) || quantity < 1) return false;
    const current = cart.find((i) => i.productId === id)?.quantity || 0;
    if (current + quantity > availableStock(product)) {
      notify("จำนวนสินค้าเกินสต็อกที่มีค่ะ");
      return false;
    }
    setCart((items) =>
      items.some((i) => i.productId === id)
        ? items.map((i) => (i.productId === id ? { ...i, quantity: i.quantity + quantity } : i))
        : [...items, { productId: id, quantity }],
    );
    notify("เพิ่มลงตะกร้าแล้วค่ะ");
    return true;
  };
  const setQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((items) => items.filter((i) => i.productId !== id));
      return;
    }
    const product = initialProducts.find((p) => p.id === id);
    if (!product || quantity > availableStock(product)) {
      notify("จำนวนสินค้าเกินสต็อกที่มีค่ะ");
      return;
    }
    setCart((items) => items.map((i) => (i.productId === id ? { ...i, quantity } : i)));
  };
  const toggleSaved = (id: string) => {
    const product = initialProducts.find((p) => p.id === id);
    if (!saved.includes(id) && (!product || availableStock(product) < 1)) {
      notify("สินค้าหมดยังบันทึกใหม่ไม่ได้ค่ะ");
      return;
    }
    setSaved((items) => (items.includes(id) ? items.filter((i) => i !== id) : [...items, id]));
  };
  const remember = (order: Order, phone: string) => {
    try {
      sessionStorage.setItem(`macrocam-order-${order.orderNumber}`, phone);
      localStorage.setItem("macrocam-last-order", order.orderNumber);
    } catch {
      /* Customer can still track with their order number and phone. */
    }
    setLastOrderNumber(order.orderNumber);
  };
  const phoneFor = (order: Order) => {
    try {
      return sessionStorage.getItem(`macrocam-order-${order.orderNumber}`) || order.phone;
    } catch {
      return order.phone;
    }
  };
  const lookupOrder = async (orderNumber: string, phone: string): Promise<Order> => {
    const number = orderNumber.trim().toUpperCase();
    const normalizedPhone = phone.replace(/\D/g, "");
    let order: Order;
    if (isDemo) {
      const found = demoOrders.find((o) => o.orderNumber === number && o.phone === normalizedPhone);
      if (!found) throw new Error("ไม่พบคำสั่งซื้อ กรุณาตรวจเลขคำสั่งซื้อและเบอร์โทรศัพท์ค่ะ");
      order =
        found.status === "awaiting_payment" && Date.parse(found.expiresAt) <= Date.now()
          ? { ...found, status: "expired" }
          : found;
    } else {
      ({ order } = await request<{ order: Order }>("/api/orders/track", {
        orderNumber: number,
        phone: normalizedPhone,
      }));
    }
    remember(order, normalizedPhone);
    return order;
  };
  const createOrder = async (customer: Customer): Promise<Order> => {
    if (submitting.current) throw new Error("กำลังบันทึกคำสั่งซื้อ กรุณารอสักครู่ค่ะ");
    if (!cart.length) throw new Error("ตะกร้ายังไม่มีสินค้าค่ะ");
    if (
      !customer.recipient.trim() ||
      !/^0\d{8,9}$/.test(customer.phone.replace(/\D/g, "")) ||
      customer.address.trim().length < 10
    )
      throw new Error("กรุณากรอกชื่อ เบอร์โทร และที่อยู่ให้ครบถ้วนค่ะ");
    for (const item of cart) {
      const product = initialProducts.find((p) => p.id === item.productId);
      if (!product || item.quantity > availableStock(product))
        throw new Error("สินค้าบางรายการมีสต็อกไม่พอ กรุณาตรวจตะกร้าอีกครั้งค่ะ");
    }
    submitting.current = true;
    try {
      let idempotencyKey = sessionStorage.getItem("macrocam-checkout-key");
      if (!idempotencyKey) {
        idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem("macrocam-checkout-key", idempotencyKey);
      }
      let order: Order;
      if (isDemo) {
        const existing = demoOrders.find((o) => o.id === idempotencyKey);
        const items = cart.map((i) => {
          const p = initialProducts.find((p) => p.id === i.productId)!;
          return {
            productId: p.id,
            name: p.name,
            price: p.price,
            quantity: i.quantity,
            image: p.images[0],
          };
        });
        order = existing || {
          id: idempotencyKey,
          orderNumber: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          status: "awaiting_payment",
          items,
          total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
          ...customer,
          phone: customer.phone.replace(/\D/g, ""),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          isDemo: true,
        };
        setDemoOrders((orders) => (existing ? orders : [...orders, order]));
      } else {
        ({ order } = await request<{ order: Order }>("/api/orders", {
          idempotencyKey,
          items: cart,
          ...customer,
          phone: customer.phone.replace(/\D/g, ""),
        }));
      }
      remember(order, customer.phone.replace(/\D/g, ""));
      setCart([]);
      sessionStorage.removeItem("macrocam-checkout-key");
      return order;
    } finally {
      submitting.current = false;
    }
  };
  const resumeOrder = async (orderNumber: string) => {
    let phone = "";
    try {
      phone = sessionStorage.getItem(`macrocam-order-${orderNumber}`) || "";
    } catch {
      return null;
    }
    if (!phone) return null;
    try {
      return await lookupOrder(orderNumber, phone);
    } catch {
      return null;
    }
  };
  const uploadSlip = async (order: Order, file: File) => {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 4 * 1024 * 1024 ||
      file.size === 0
    )
      throw new Error("ใช้รูป JPG, PNG หรือ WebP ขนาดไม่เกิน 4 MB ค่ะ");
    if (!["awaiting_payment", "slip_submitted"].includes(order.status))
      throw new Error("คำสั่งซื้อนี้ไม่สามารถแนบสลิปได้แล้วค่ะ");
    if (order.status === "awaiting_payment" && Date.parse(order.expiresAt) <= Date.now())
      throw new Error("คำสั่งซื้อหมดเวลาแล้ว กรุณาสั่งซื้อใหม่ค่ะ");
    let updated: Order;
    if (isDemo) {
      updated = { ...order, status: "slip_submitted" };
      setDemoOrders((orders) => orders.map((o) => (o.id === order.id ? updated : o)));
    } else {
      const form = new FormData();
      form.set("orderNumber", order.orderNumber);
      form.set("phone", phoneFor(order));
      form.set("file", file);
      const response = await fetch("/api/orders/slip", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "แนบสลิปไม่สำเร็จ");
      updated = data.order;
    }
    return updated;
  };
  const completeOrder = async (order: Order) => {
    if (order.status !== "shipped") throw new Error("ยืนยันรับสินค้าได้เมื่อร้านจัดส่งแล้วค่ะ");
    let updated: Order;
    if (isDemo) {
      updated = { ...order, status: "completed" };
      setDemoOrders((orders) => orders.map((o) => (o.id === order.id ? updated : o)));
    } else {
      ({ order: updated } = await request<{ order: Order }>("/api/orders/complete", {
        orderNumber: order.orderNumber,
        phone: phoneFor(order),
      }));
    }
    return updated;
  };
  return (
    <Context.Provider
      value={{
        products: initialProducts,
        settings: initialSettings,
        isDemo,
        checkoutEnabled,
        ready,
        cart,
        saved,
        toast,
        cartCount: cart.reduce((sum, i) => sum + i.quantity, 0),
        addToCart,
        setQuantity,
        removeFromCart: (id) => setCart((items) => items.filter((i) => i.productId !== id)),
        toggleSaved,
        notify,
        availableStock,
        createOrder,
        lookupOrder,
        resumeOrder,
        uploadSlip,
        completeOrder,
        lastOrderNumber,
      }}
    >
      {children}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        {toast}
      </div>
    </Context.Provider>
  );
}
