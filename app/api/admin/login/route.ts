import { NextRequest } from "next/server";
import { guardOrigin, handle, readJson, json, databaseError } from "@/lib/server/http";
import { authClient, serviceClient, rateLimit } from "@/lib/server/supabase";
import { object, requiredText, ValidationError } from "@/lib/server/validation";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return handle(async () => {
    guardOrigin(request);
    const input = object(await readJson(request));
    const email = requiredText(input.email, "อีเมล", 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new ValidationError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    // Do not trim passwords; spaces can be intentional.
    if (
      typeof input.password !== "string" ||
      input.password.length < 1 ||
      input.password.length > 256
    )
      throw new ValidationError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    await rateLimit(request, "admin-login", email, 10, 900);
    const auth = authClient(request);
    const { data, error } = await auth.client.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (error || !data.user) throw new ValidationError("อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    const { data: permission, error: permissionError } = await serviceClient()
      .from("admin_users")
      .select("user_id")
      .eq("user_id", data.user.id)
      .maybeSingle();
    if (permissionError) {
      await auth.client.auth.signOut({ scope: "local" });
      databaseError(permissionError);
    }
    if (!permission) {
      await auth.client.auth.signOut({ scope: "local" });
      return auth.apply(json({ error: "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลร้าน" }, 403));
    }
    return auth.apply(
      json({ authenticated: true, user: { id: data.user.id, email: data.user.email } }),
    );
  });
}
