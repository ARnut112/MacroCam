import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export class ValidationError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ORDER_NUMBER = /^MC-[A-Z0-9-]{8,40}$/;
export const STATUSES = [
  "awaiting_payment",
  "slip_submitted",
  "paid",
  "shipped",
  "completed",
  "cancelled",
  "expired",
] as const;
export type OrderStatus = (typeof STATUSES)[number];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new ValidationError("ข้อมูลไม่ถูกต้อง");
  return value as Record<string, unknown>;
}

export function requiredText(value: unknown, label: string, max = 200): string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  ) {
    throw new ValidationError(`${label}ไม่ถูกต้อง`);
  }
  return value.trim();
}

export function optionalText(value: unknown, label: string, max = 1000): string {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim()))
    return "";
  return requiredText(value, label, max);
}

export function normalizePhone(value: unknown): string {
  const input = requiredText(value, "เบอร์โทร", 30).replace(/[\s()\-]/g, "");
  const phone = input.startsWith("+66") ? `0${input.slice(3)}` : input;
  if (!/^0\d{8,9}$/.test(phone))
    throw new ValidationError("กรุณากรอกเบอร์โทรไทย 9–10 หลัก เริ่มด้วย 0");
  return phone;
}

export function orderIdentity(value: unknown) {
  const data = object(value);
  const orderNumber = requiredText(data.orderNumber, "เลขคำสั่งซื้อ", 50).toUpperCase();
  if (!ORDER_NUMBER.test(orderNumber))
    throw new ValidationError("เลขคำสั่งซื้อหรือเบอร์โทรไม่ถูกต้อง", 404);
  return { orderNumber, phone: normalizePhone(data.phone) };
}

export function orderInput(value: unknown) {
  const data = object(value);
  if (typeof data.idempotencyKey !== "string" || !UUID.test(data.idempotencyKey))
    throw new ValidationError("กรุณารีเฟรชหน้าชำระเงินแล้วลองใหม่");
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 40)
    throw new ValidationError("ตะกร้าสินค้าไม่ถูกต้อง");
  const seen = new Set<string>();
  const items = data.items
    .map((entry) => {
      const item = object(entry);
      if (
        typeof item.productId !== "string" ||
        !UUID.test(item.productId) ||
        seen.has(item.productId.toLowerCase())
      )
        throw new ValidationError("รายการสินค้าไม่ถูกต้อง");
      if (
        typeof item.quantity !== "number" ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99
      )
        throw new ValidationError("จำนวนสินค้าต้องเป็น 1–99 ชิ้น");
      seen.add(item.productId.toLowerCase());
      return { product_id: item.productId.toLowerCase(), quantity: item.quantity };
    })
    .sort((a, b) => a.product_id.localeCompare(b.product_id));
  return {
    idempotencyKey: data.idempotencyKey,
    payload: {
      recipient_name: requiredText(data.recipient, "ชื่อผู้รับ", 120),
      phone: normalizePhone(data.phone),
      address: requiredText(data.address, "ที่อยู่", 1200),
      note: optionalText(data.note, "หมายเหตุ", 1000),
      items,
    },
  };
}

export function validateImage(bytes: Uint8Array, mime: string) {
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES)
    throw new ValidationError("รูปต้องมีขนาดไม่เกิน 4 MB");
  const signatures: Record<string, { extension: string; matches: boolean }> = {
    "image/jpeg": {
      extension: "jpg",
      matches: bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    },
    "image/png": {
      extension: "png",
      matches:
        bytes.length >= 8 &&
        [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value),
    },
    "image/webp": {
      extension: "webp",
      matches:
        bytes.length >= 12 &&
        String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
        String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
    },
  };
  const format = signatures[mime.toLowerCase()];
  if (!format?.matches) throw new ValidationError("รองรับเฉพาะไฟล์ JPG, PNG และ WEBP ที่ถูกต้อง");
  return format.extension;
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: "admin" | "customer" | "expiry",
): boolean {
  if (from === to)
    return actor === "customer"
      ? to === "completed"
      : actor === "expiry"
        ? to === "expired"
        : ["paid", "shipped", "completed", "cancelled"].includes(to);
  if (actor === "customer") return from === "shipped" && to === "completed";
  if (actor === "expiry") return from === "awaiting_payment" && to === "expired";
  return (
    (from === "slip_submitted" && to === "paid") ||
    (from === "paid" && to === "shipped") ||
    (from === "shipped" && to === "completed") ||
    (["awaiting_payment", "slip_submitted", "paid"].includes(from) && to === "cancelled")
  );
}

export function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function signAccessToken(
  orderId: string,
  orderNumber: string,
  secret: string,
  now = Date.now(),
): string {
  const payload = Buffer.from(
    JSON.stringify({
      id: orderId,
      number: orderNumber,
      exp: Math.floor(now / 1000) + 60 * 60 * 24 * 7,
    }),
  ).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function verifyAccessToken(
  token: string,
  secret: string,
  now = Date.now(),
): { id: string; number: string } | null {
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra || token.length > 1024) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const supplied = Buffer.from(signature, "base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !UUID.test(parsed.id) ||
      !ORDER_NUMBER.test(parsed.number) ||
      !Number.isInteger(parsed.exp) ||
      parsed.exp <= Math.floor(now / 1000)
    )
      return null;
    return { id: parsed.id, number: parsed.number };
  } catch {
    return null;
  }
}

export function safeImageUrl(value: unknown): string {
  const text = requiredText(value, "URL รูปภาพ", 2048);
  try {
    const parsed = new URL(text);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.href.length > 2048
    )
      throw new Error();
    return parsed.href;
  } catch {
    throw new ValidationError("URL รูปภาพต้องเริ่มด้วย https://");
  }
}

export function confirmedDatabaseRejection(error: { code?: string }): boolean {
  // Clean up only definitive rollback errors. Network/class-08 errors and
  // statement_completion_unknown (40003) can hide a successful commit.
  const code = error.code || "";
  return (
    code === "P0001" || code === "40001" || code === "40P01" || /^(22|23|42)[0-9A-Z]{3}$/.test(code)
  );
}

export function productInput(value: unknown, partial = false): Record<string, unknown> {
  const data = object(value);
  const result: Record<string, unknown> = {};
  const textFields: Record<string, [string, number]> = {
    slug: ["slug", 160],
    name: ["name", 200],
    brand: ["brand", 100],
    model: ["model", 150],
    conditionLabel: ["condition_label", 100],
    mount: ["mount", 100],
    tagline: ["tagline", 300],
    description: ["description", 8000],
    conditionNotes: ["condition_notes", 3000],
    tested: ["tested_notes", 3000],
    defects: ["defects", 3000],
    warranty: ["warranty", 3000],
    badge: ["badge", 80],
  };
  for (const [key, [column, max]] of Object.entries(textFields)) {
    if (key in data)
      result[column] = ["slug", "name", "brand", "model"].includes(key)
        ? requiredText(data[key], key, max)
        : optionalText(data[key], key, max);
  }
  if ("slug" in result && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(result.slug)))
    throw new ValidationError("slug ใช้ตัวอักษรอังกฤษพิมพ์เล็ก ตัวเลข และขีดกลาง");
  for (const [key, choices] of Object.entries({
    category: ["cameras", "lenses", "lighting", "tripods", "accessories"],
    condition: ["new", "used"],
  })) {
    if (key in data) {
      if (typeof data[key] !== "string" || !choices.includes(data[key] as string))
        throw new ValidationError(`${key}ไม่ถูกต้อง`);
      result[key] = data[key];
    }
  }
  for (const key of ["price", "stock", "originalPrice"]) {
    if (!(key in data)) continue;
    if (key === "originalPrice" && (data[key] === null || data[key] === "")) {
      result.original_price = null;
      continue;
    }
    const number = data[key];
    if (
      typeof number !== "number" ||
      !Number.isFinite(number) ||
      number < 0 ||
      (key !== "stock" && number === 0) ||
      number > (key === "stock" ? 100000 : 999999999) ||
      (key === "stock" && !Number.isInteger(number)) ||
      (key !== "stock" && Math.abs(Math.round(number * 100) - number * 100) > 0.000001)
    )
      throw new ValidationError(`${key}ไม่ถูกต้อง`);
    result[key === "originalPrice" ? "original_price" : key] = number;
  }
  if ("published" in data) {
    if (typeof data.published !== "boolean") throw new ValidationError("สถานะเผยแพร่ไม่ถูกต้อง");
    result.published = data.published;
  }
  for (const [key, column] of [
    ["included", "included_items"],
    ["images", "images"],
  ]) {
    if (key in data) {
      if (!Array.isArray(data[key]) || (data[key] as unknown[]).length > 20)
        throw new ValidationError(`${key}ไม่ถูกต้อง`);
      result[column] = (data[key] as unknown[]).map((entry) =>
        key === "images" ? safeImageUrl(entry) : requiredText(entry, "อุปกรณ์ในชุด", 200),
      );
    }
  }
  if ("specs" in data) {
    const specs = object(data.specs);
    if (Object.keys(specs).length > 40) throw new ValidationError("ข้อมูลจำเพาะมากเกินไป");
    result.specs = Object.fromEntries(
      Object.entries(specs).map(([key, entry]) => [
        requiredText(key, "หัวข้อข้อมูลจำเพาะ", 100),
        requiredText(entry, "ข้อมูลจำเพาะ", 500),
      ]),
    );
  }
  if (!partial) {
    for (const key of ["slug", "name", "brand", "model", "category", "condition", "price", "stock"])
      if (!(key in result)) throw new ValidationError(`กรุณาระบุ ${key}`);
    result.published ??= false;
  }
  if (Object.keys(result).length === 0) throw new ValidationError("ไม่มีข้อมูลที่แก้ไข");
  return result;
}
