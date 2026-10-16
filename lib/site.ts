import "server-only";
import { products as demoProducts } from "./catalog";
import { getStorefrontProducts, getStoreSettings } from "./server/storefront";
import type { StoreSettings } from "./types";

export const isDemoMode = () =>
  !(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
export async function getCatalog() {
  return isDemoMode() ? demoProducts : getStorefrontProducts();
}
export async function getSettings(): Promise<StoreSettings> {
  return isDemoMode() ? {} : getStoreSettings();
}
