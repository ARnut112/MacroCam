import "server-only";
import type { Product, Order, StoreSettings } from "../types";

export type Row = Record<string, unknown>;

export function product(row: Row): Product & { updatedAt: string } {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    brand: String(row.brand),
    model: String(row.model),
    category: row.category as Product["category"],
    condition: row.condition as Product["condition"],
    conditionLabel: String(
      row.condition_label || (row.condition === "used" ? "มือสอง" : "มือหนึ่ง"),
    ),
    price: Number(row.price),
    originalPrice: row.original_price == null ? undefined : Number(row.original_price),
    stock: Number(row.stock),
    images: Array.isArray(row.images) ? row.images.map(String) : [],
    mount: row.mount ? String(row.mount) : undefined,
    tagline: String(row.tagline || ""),
    description: String(row.description || ""),
    conditionNotes: String(row.condition_notes || ""),
    tested: String(row.tested_notes || ""),
    defects: String(row.defects || ""),
    included: Array.isArray(row.included_items) ? row.included_items.map(String) : [],
    warranty: String(row.warranty || ""),
    specs: (row.specs || {}) as Record<string, string>,
    published: row.published === true,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    badge: row.badge ? String(row.badge) : undefined,
  };
}

export function order(row: Row, items: Row[], slipUrl?: string): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.name,
      price: Number(item.price),
      quantity: Number(item.quantity),
      image: item.image || "",
    })),
    total: Number(row.total),
    recipient: row.recipient_name,
    phone: row.phone,
    address: row.address,
    note: row.note || "",
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    shippingCompany: row.shipping_company || undefined,
    trackingNumber: row.tracking_number || undefined,
    ...(slipUrl ? { slipUrl } : {}),
  } as Order;
}

export function settings(row: Row | null): StoreSettings {
  return {
    paymentQrUrl: typeof row?.payment_qr_url === "string" ? row.payment_qr_url : null,
    paymentAccount: typeof row?.payment_account === "string" ? row.payment_account : null,
    shippingPolicy: typeof row?.shipping_policy === "string" ? row.shipping_policy : null,
    returnPolicy: typeof row?.return_policy === "string" ? row.return_policy : null,
    privacyPolicy: typeof row?.privacy_policy === "string" ? row.privacy_policy : null,
    warrantyPolicy: typeof row?.warranty_policy === "string" ? row.warranty_policy : null,
  };
}
