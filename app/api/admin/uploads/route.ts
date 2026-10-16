import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { guardOrigin, handle, json, readMultipart, databaseError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";
import { validateImage, ValidationError } from "@/lib/server/validation";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    const admin = await requireAdmin(request);
    const form = await readMultipart(request);
    const file = form.get("file");
    const kind = form.get("kind") || "product";
    if (kind !== "product" && kind !== "qr") throw new ValidationError("ประเภทไฟล์ไม่ถูกต้อง");
    if (!(file instanceof File)) throw new ValidationError("กรุณาแนบรูปภาพ");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = validateImage(bytes, file.type);
    const path = `${kind}/${randomUUID()}.${extension}`;
    const { error } = await admin.db.storage
      .from("store-assets")
      .upload(path, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) databaseError(error);
    const { data } = admin.db.storage.from("store-assets").getPublicUrl(path);
    return admin.apply(json({ url: data.publicUrl }, 201));
  });
}
