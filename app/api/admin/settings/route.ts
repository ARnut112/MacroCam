import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  guardOrigin,
  handle,
  json,
  readJson,
  readMultipart,
  databaseError,
} from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";
import {
  object,
  optionalText,
  safeImageUrl,
  validateImage,
  ValidationError,
  confirmedDatabaseRejection,
} from "@/lib/server/validation";
import { settings } from "@/lib/server/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin(request);
    const { data, error } = await admin.db
      .from("store_settings")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (error) databaseError(error);
    return admin.apply(json(settings(data)));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    const admin = await requireAdmin(request);
    let input: Record<string, unknown>;
    let file: File | undefined;
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      const form = await readMultipart(request);
      input = Object.fromEntries(form.entries());
      const candidate = form.get("file") || form.get("qr") || form.get("paymentQr");
      if (candidate instanceof File && candidate.size > 0) file = candidate;
    } else {
      input = object(await readJson(request));
    }
    const update: Record<string, unknown> = { singleton: true };
    for (const [key, column] of Object.entries({
      paymentAccount: "payment_account",
      shippingPolicy: "shipping_policy",
      returnPolicy: "return_policy",
      privacyPolicy: "privacy_policy",
      warrantyPolicy: "warranty_policy",
    })) {
      if (key in input)
        update[column] =
          optionalText(input[key], key, key === "paymentAccount" ? 1000 : 10000) || null;
    }
    if ("paymentQrUrl" in input)
      update.payment_qr_url = input.paymentQrUrl ? safeImageUrl(input.paymentQrUrl) : null;
    let uploadedPath: string | undefined;
    if (file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const extension = validateImage(bytes, file.type);
      uploadedPath = `qr/${randomUUID()}.${extension}`;
      const { error } = await admin.db.storage
        .from("store-assets")
        .upload(uploadedPath, bytes, {
          contentType: file.type,
          cacheControl: "31536000",
          upsert: false,
        });
      if (error) databaseError(error);
      update.payment_qr_url = admin.db.storage
        .from("store-assets")
        .getPublicUrl(uploadedPath).data.publicUrl;
    }
    if (Object.keys(update).length === 1) throw new ValidationError("ไม่มีข้อมูลที่แก้ไข");
    const { data, error } = await admin.db
      .from("store_settings")
      .upsert(update)
      .select("*")
      .single();
    if (error) {
      if (uploadedPath && confirmedDatabaseRejection(error))
        await admin.db.storage.from("store-assets").remove([uploadedPath]);
      databaseError(error);
    }
    return admin.apply(json(settings(data)));
  });
}
