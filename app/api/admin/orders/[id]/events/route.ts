import { NextRequest } from "next/server";
import { handle, json, databaseError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";
import { UUID, ValidationError } from "@/lib/server/validation";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const admin = await requireAdmin(request);
    const { id } = await context.params;
    if (!UUID.test(id)) throw new ValidationError("ไม่พบคำสั่งซื้อ", 404);
    const { data, error } = await admin.db
      .from("order_events")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true });
    if (error) databaseError(error);
    return admin.apply(json({ events: data || [] }));
  });
}
