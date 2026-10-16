import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { json, databaseError } from "./http";
import { order, type Row } from "./mappers";
import { orderSecret, rateLimit, serviceClient } from "./supabase";
import { orderIdentity, signAccessToken, ValidationError } from "./validation";

export async function findGuestOrder(request: NextRequest, input: unknown, purpose = "track") {
  orderSecret();
  const identity = orderIdentity(input);
  await rateLimit(request, purpose, identity.orderNumber, 10, 900);
  const db = serviceClient();
  const { error: expiryError } = await db.rpc("expire_orders");
  if (expiryError) databaseError(expiryError);
  const { data, error } = await db
    .from("orders")
    .select("*")
    .eq("order_number", identity.orderNumber)
    .eq("phone", identity.phone)
    .maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new ValidationError("เลขคำสั่งซื้อหรือเบอร์โทรไม่ถูกต้อง", 404);
  return { db, row: data as Row };
}

export async function mappedOrder(db: SupabaseClient, row: Row, includeSlip = false) {
  const { data: items, error } = await db
    .from("order_items")
    .select("product_id,name,price,quantity,image")
    .eq("order_id", row.id)
    .order("id");
  if (error) databaseError(error);
  let slipUrl: string | undefined;
  if (includeSlip && typeof row.slip_path === "string") {
    const signed = await db.storage.from("slips").createSignedUrl(row.slip_path, 60);
    if (signed.error) databaseError(signed.error);
    slipUrl = signed.data.signedUrl;
  }
  return order(row, items || [], slipUrl);
}

export async function guestOrderResponse(db: SupabaseClient, row: Row, status = 200) {
  const accessToken = signAccessToken(String(row.id), String(row.order_number), orderSecret());
  const response = json({ order: await mappedOrder(db, row), accessToken }, status);
  response.cookies.set("mc_order_access", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
