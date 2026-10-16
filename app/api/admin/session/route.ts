import { NextRequest } from "next/server";
import { handle, json } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/supabase";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return handle(async () => {
    const admin = await requireAdmin(request);
    return admin.apply(
      json({ authenticated: true, user: { id: admin.user.id, email: admin.user.email } }),
    );
  });
}
