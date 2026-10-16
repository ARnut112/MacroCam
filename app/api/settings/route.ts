import { handle, json } from "@/lib/server/http";
import { getStoreSettings } from "@/lib/server/storefront";

export const dynamic = "force-dynamic";
export async function GET() {
  return handle(async () => json(await getStoreSettings()));
}
