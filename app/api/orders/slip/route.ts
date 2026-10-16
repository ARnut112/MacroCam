import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { guardOrigin, handle, readMultipart, databaseError } from "@/lib/server/http";
import { findGuestOrder, guestOrderResponse } from "@/lib/server/orders";
import {
  validateImage,
  ValidationError,
  confirmedDatabaseRejection,
} from "@/lib/server/validation";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    const form = await readMultipart(request);
    const { db, row } = await findGuestOrder(
      request,
      { orderNumber: form.get("orderNumber"), phone: form.get("phone") },
      "slip",
    );
    if (row.status === "slip_submitted") return guestOrderResponse(db, row);
    if (row.status !== "awaiting_payment")
      throw new ValidationError("คำสั่งซื้อนี้ไม่สามารถแนบสลิปได้แล้ว", 409);
    const file = form.get("file");
    if (!(file instanceof File)) throw new ValidationError("กรุณาแนบรูปสลิป");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = validateImage(bytes, file.type);
    const path = `${row.id}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from("slips")
      .upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "0" });
    if (uploadError) databaseError(uploadError);
    const { data, error } = await db.rpc("attach_slip", { p_order_id: row.id, p_slip_path: path });
    if (error) {
      if (confirmedDatabaseRejection(error)) await db.storage.from("slips").remove([path]);
      databaseError(error);
    }
    // Two simultaneous retries may upload files; keep only the path the locked RPC accepted.
    if (data.slip_path !== path) await db.storage.from("slips").remove([path]);
    return guestOrderResponse(db, data);
  });
}
