import { handle, json } from "@/lib/server/http";
import { getStorefrontProducts } from "@/lib/server/storefront";

export const dynamic = "force-dynamic";
export async function GET() {
  return handle(async () => json({ products: await getStorefrontProducts() }));
}
