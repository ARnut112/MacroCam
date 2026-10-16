import { NextRequest } from "next/server";
import { guardOrigin, handle, readJson } from "@/lib/server/http";
import { findGuestOrder, guestOrderResponse } from "@/lib/server/orders";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    const { db, row } = await findGuestOrder(request, await readJson(request));
    return guestOrderResponse(db, row);
  });
}
