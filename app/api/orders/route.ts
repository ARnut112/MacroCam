import { NextRequest } from "next/server";
import { guardOrigin, handle, readJson, databaseError } from "@/lib/server/http";
import { serviceClient, orderSecret, rateLimit } from "@/lib/server/supabase";
import { orderInput, hash, ValidationError } from "@/lib/server/validation";
import { guestOrderResponse } from "@/lib/server/orders";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    if (process.env.STORE_CHECKOUT_ENABLED !== "true")
      throw new ValidationError("ร้านยังไม่ได้เปิดรับคำสั่งซื้อจริง", 503);
    const secret = orderSecret();
    const db = serviceClient();
    const input = orderInput(await readJson(request));
    await rateLimit(request, "checkout", "", 20, 900);
    const { data, error } = await db.rpc("create_order", {
      p_payload: input.payload,
      p_idempotency_key: input.idempotencyKey,
      p_customer_fingerprint: hash(`${secret}:${input.payload.phone}`),
    });
    if (error) databaseError(error);
    return guestOrderResponse(db, data, 201);
  });
}
