import { NextRequest } from "next/server";
import { guardOrigin, handle, json, readJson, databaseError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";
import { productInput, object, requiredText, UUID, ValidationError } from "@/lib/server/validation";
import { product } from "@/lib/server/mappers";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    guardOrigin(request);
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ValidationError("ไม่พบสินค้า", 404);
    const body = object(await readJson(request));
    const expectedVersion = requiredText(body.updatedAt, "เวอร์ชันสินค้า กรุณารีเฟรช", 60);
    if (!Number.isFinite(Date.parse(expectedVersion)))
      throw new ValidationError("กรุณารีเฟรชสินค้าก่อนบันทึก", 409);
    const input = productInput(body, true);
    // PostgreSQL rechecks this predicate after acquiring the row lock. A checkout
    // reservation changes updated_at, so a stale editor cannot restore sold stock.
    const { data, error } = await admin.db
      .from("products")
      .update(input)
      .eq("id", id)
      .eq("updated_at", expectedVersion)
      .select("*")
      .maybeSingle();
    if (error) databaseError(error);
    if (!data)
      throw new ValidationError(
        "ข้อมูลสินค้าเปลี่ยนแล้ว อาจมีการจองสินค้า กรุณารีเฟรชและเปิดแก้ไขใหม่ก่อนบันทึก",
        409,
      );
    return admin.apply(json({ product: product(data) }));
  });
}
