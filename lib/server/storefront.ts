import "server-only";
import type { Product, StoreSettings } from "../types";
import { serviceClient } from "./supabase";
import { databaseError } from "./http";
import { product, settings } from "./mappers";

export async function getStorefrontProducts(): Promise<Product[]> {
  const { data, error } = await serviceClient()
    .from("products")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (error) databaseError(error);
  return (data || []).map(product) as Product[];
}

export async function getStoreSettings(): Promise<StoreSettings> {
  const { data, error } = await serviceClient()
    .from("store_settings")
    .select(
      "payment_qr_url,payment_account,shipping_policy,return_policy,privacy_policy,warranty_policy",
    )
    .eq("singleton", true)
    .maybeSingle();
  if (error) databaseError(error);
  return settings(data);
}
