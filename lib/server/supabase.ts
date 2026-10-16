import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { ValidationError, hash } from "./validation";
import { databaseError } from "./http";

function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service)
    throw new ValidationError("ร้านยังไม่ได้เชื่อมต่อระบบจริง ขณะนี้ยังไม่รับคำสั่งซื้อ", 503);
  return { url, anon, service };
}

export function serviceClient() {
  const { url, service } = configuration();
  return createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

export function authClient(request: NextRequest) {
  const { url, anon } = configuration();
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const client = createServerClient(url, anon, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        for (const cookie of cookies)
          pending.push({ name: cookie.name, value: cookie.value, options: cookie.options });
      },
    },
  });
  return {
    client,
    apply(response: NextResponse) {
      for (const cookie of pending)
        response.cookies.set(cookie.name, cookie.value, {
          ...cookie.options,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          path: "/",
        });
      return response;
    },
  };
}

export async function requireAdmin(request: NextRequest) {
  const auth = authClient(request);
  const {
    data: { user },
    error,
  } = await auth.client.auth.getUser();
  if (error || !user) throw new ValidationError("กรุณาเข้าสู่ระบบผู้ดูแลร้าน", 401);
  const db = serviceClient();
  const { data, error: permissionError } = await db
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (permissionError) databaseError(permissionError);
  if (!data) throw new ValidationError("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลร้าน", 403);
  return { db, user, apply: auth.apply };
}

export async function rateLimit(
  request: NextRequest,
  purpose: string,
  identity = "",
  limit = 10,
  seconds = 900,
) {
  const db = serviceClient();
  // Vercel supplies x-vercel-forwarded-for. Set TRUST_PROXY_HEADERS=true only behind a trusted proxy.
  const ip =
    (process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
      : null) ||
    (process.env.TRUST_PROXY_HEADERS === "true"
      ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      : null) ||
    "unknown";
  const keys = [`${purpose}:ip:${hash(ip)}`];
  if (identity) keys.push(`${purpose}:order:${hash(identity)}`);
  for (const key of keys) {
    const { data, error } = await db.rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: seconds,
    });
    if (error) databaseError(error);
    if (data !== true)
      throw new ValidationError("ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่", 429);
  }
}

export function orderSecret(): string {
  const secret = process.env.ORDER_ACCESS_SECRET;
  if (!secret || secret.length < 32)
    throw new ValidationError("ร้านยังไม่ได้ตั้งค่าความปลอดภัยสำหรับคำสั่งซื้อ", 503);
  return secret;
}
