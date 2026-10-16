import { NextRequest } from "next/server";
import { guardOrigin, handle, json } from "@/lib/server/http";
import { authClient } from "@/lib/server/supabase";

export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    const auth = authClient(request);
    await auth.client.auth.signOut({ scope: "local" });
    return auth.apply(json({ authenticated: false }));
  });
}
