import { NextRequest } from "next/server";
import { guardOrigin, handle, json, readJson, databaseError } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";
import { productInput } from "@/lib/server/validation";
import { product } from "@/lib/server/mappers";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin(request);
    const { data, error } = await admin.db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) databaseError(error);
    return admin.apply(json({ products: (data || []).map(product) }));
  });
}

export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    const admin = await requireAdmin(request);
    const input = productInput(await readJson(request));
    const { data, error } = await admin.db.from("products").insert(input).select("*").single();
    if (error) databaseError(error);
    return admin.apply(json({ product: product(data) }, 201));
  });
}
