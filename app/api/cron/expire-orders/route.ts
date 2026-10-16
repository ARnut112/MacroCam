import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { handle, json, databaseError } from "@/lib/server/http";
import { serviceClient } from "@/lib/server/supabase";
import { ValidationError } from "@/lib/server/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function expire(request: NextRequest) {
  return handle(async () => {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 32)
      throw new ValidationError("ยังไม่ได้เปิดใช้การหมดอายุอัตโนมัติ", 503);
    const supplied = Buffer.from(request.headers.get("authorization") || "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected))
      throw new ValidationError("ไม่มีสิทธิ์", 401);
    const { data, error } = await serviceClient().rpc("expire_orders");
    if (error) databaseError(error);
    return json({ expired: data });
  });
}
export const GET = expire;
export const POST = expire;
