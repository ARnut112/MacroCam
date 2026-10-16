import { NextRequest } from "next/server";
import { guardOrigin, handle, json, readJson, databaseError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";
import { UUID, STATUSES, object, optionalText, ValidationError } from "@/lib/server/validation";
import { mappedOrder } from "@/lib/server/orders";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    guardOrigin(request);
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ValidationError("ไม่พบคำสั่งซื้อ", 404);
    const input = object(await readJson(request));
    if (
      typeof input.status !== "string" ||
      !STATUSES.includes(input.status as (typeof STATUSES)[number])
    )
      throw new ValidationError("สถานะไม่ถูกต้อง");
    const company = optionalText(input.shippingCompany, "บริษัทขนส่ง", 100);
    const tracking = optionalText(input.trackingNumber, "เลขพัสดุ", 100);
    if (input.status === "shipped" && (!company || !tracking))
      throw new ValidationError("กรุณาระบุบริษัทขนส่งและเลขพัสดุ");
    const { data, error } = await admin.db.rpc("transition_order", {
      p_order_id: id,
      p_status: input.status,
      p_actor_id: admin.user.id,
      p_shipping_company: company || null,
      p_tracking_number: tracking || null,
    });
    if (error) databaseError(error);
    return admin.apply(json({ order: await mappedOrder(admin.db, data, true) }));
  });
}
