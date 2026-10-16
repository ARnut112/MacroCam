import { NextRequest } from "next/server";
import { handle, json, databaseError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";
import { STATUSES, ValidationError } from "@/lib/server/validation";
import { mappedOrder } from "@/lib/server/orders";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin(request);
    const { error: expiryError } = await admin.db.rpc("expire_orders");
    if (expiryError) databaseError(expiryError);
    const status = request.nextUrl.searchParams.get("status");
    const q = request.nextUrl.searchParams.get("q")?.trim();
    const page = Number(request.nextUrl.searchParams.get("page") || 0);
    if (!Number.isInteger(page) || page < 0 || page > 10000)
      throw new ValidationError("หน้ารายการไม่ถูกต้อง");
    let query = admin.db
      .from("orders")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });
    if (status && status !== "all") {
      if (!STATUSES.includes(status as (typeof STATUSES)[number]))
        throw new ValidationError("สถานะไม่ถูกต้อง");
      query = query.eq("status", status);
    }
    if (q) {
      if (!/^[A-Z0-9-]{1,50}$/i.test(q)) throw new ValidationError("ค้นหาด้วยเลขคำสั่งซื้อ");
      query = query.ilike("order_number", `%${q.toUpperCase()}%`);
    }
    const { data, count, error } = await query.range(page * 50, page * 50 + 49);
    if (error) databaseError(error);
    const orders = await Promise.all((data || []).map((row) => mappedOrder(admin.db, row, true)));
    return admin.apply(json({ orders, total: count, page }));
  });
}
