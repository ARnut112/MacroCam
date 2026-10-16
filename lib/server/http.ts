import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { MAX_IMAGE_BYTES, ValidationError } from "./validation";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff" },
  });
}

export function guardOrigin(request: NextRequest): void {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  // Next's listening hostname can be 0.0.0.0 locally; compare the browser Host.
  // Production still uses the explicitly configured canonical store URL.
  if (!process.env.NEXT_PUBLIC_SITE_URL && request.headers.get("host")) {
    requestUrl.host = request.headers.get("host")!;
  }
  const expected = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
    : requestUrl.origin;
  if (!origin || origin !== expected)
    throw new ValidationError("คำขอไม่ถูกต้อง กรุณาเปิดเว็บไซต์ร้านแล้วลองใหม่", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new ValidationError("คำขอไม่ถูกต้อง", 403);
}

export async function bodyBytes(request: NextRequest, maxBytes = 32768): Promise<Uint8Array> {
  const size = Number(request.headers.get("content-length"));
  if (Number.isFinite(size) && size > maxBytes)
    throw new ValidationError("ไฟล์หรือข้อมูลมีขนาดใหญ่เกินกำหนด", 413);
  if (!request.body) throw new ValidationError("ไม่มีข้อมูลคำขอ");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ValidationError("ไฟล์หรือข้อมูลมีขนาดใหญ่เกินกำหนด", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export async function readJson(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new ValidationError("รูปแบบข้อมูลไม่ถูกต้อง", 415);
  try {
    return JSON.parse(new TextDecoder().decode(await bodyBytes(request)));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError("ข้อมูล JSON ไม่ถูกต้อง");
  }
}

export async function readMultipart(request: NextRequest): Promise<FormData> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;"))
    throw new ValidationError("กรุณาแนบรูปภาพ", 415);
  // Leave room for the form's policy text while remaining below Vercel's 4.5 MB body limit.
  const bytes = await bodyBytes(request, MAX_IMAGE_BYTES + 256 * 1024);
  try {
    return await new Response(bytes as BodyInit, {
      headers: { "content-type": request.headers.get("content-type")! },
    }).formData();
  } catch {
    throw new ValidationError("ข้อมูลไฟล์ไม่ถูกต้อง");
  }
}

export function databaseError(error: { code?: string; message?: string } | null): never {
  const message = error?.message ?? "";
  const known: [string, string, number][] = [
    ["STOCK_UNAVAILABLE", "สินค้าบางรายการมีจำนวนไม่พอ กรุณาตรวจตะกร้าอีกครั้ง", 409],
    ["IDEMPOTENCY_CONFLICT", "เลขอ้างอิงนี้ถูกใช้กับคำสั่งซื้ออื่นแล้ว กรุณาเริ่มรายการใหม่", 409],
    ["ORDER_EXPIRED", "คำสั่งซื้อนี้หมดอายุแล้ว กรุณาสั่งซื้อใหม่", 409],
    ["INVALID_TRANSITION", "ไม่สามารถเปลี่ยนสถานะตามลำดับนี้ได้ กรุณารีเฟรช", 409],
    ["PAYMENT_NOT_CONFIGURED", "ร้านยังไม่ได้เปิดรับคำสั่งซื้อ กรุณาติดต่อร้าน", 503],
    ["INVALID_INPUT", "ข้อมูลไม่ถูกต้อง", 400],
    ["ORDER_NOT_FOUND", "ไม่พบคำสั่งซื้อ", 404],
    ["FORBIDDEN", "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลร้าน", 403],
  ];
  for (const [code, thai, status] of known)
    if (message.includes(code)) throw new ValidationError(thai, status);
  if (error?.code === "23505")
    throw new ValidationError("ข้อมูลนี้มีอยู่แล้ว กรุณาใช้ข้อมูลอื่น", 409);
  throw new ValidationError("ระบบขัดข้องชั่วคราว กรุณาลองใหม่", 503);
}

export async function handle(work: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ValidationError) return json({ error: error.message }, error.status);
    // Never send database errors, credentials, or customer data to the browser/log.
    return json({ error: "ระบบขัดข้องชั่วคราว กรุณาลองใหม่" }, 503);
  }
}
