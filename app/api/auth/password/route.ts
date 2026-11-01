import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { passwordError } from "@/lib/account-validation";
import { HttpError, apiError, sameOrigin } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/config";
import { authClient } from "@/lib/server/supabase";
import { resolveSupabasePublicConfig } from "@/lib/supabase-env";
import { validRecoveryTicket } from "@/lib/server/recovery-ticket";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (isDemo())
      throw new HttpError(
        400,
        "Password changes are unavailable in the local demo.",
      );
    const body = await req.json();
    if (!body || typeof body !== "object")
      throw new HttpError(400, "Choose a valid password action.");
    const invalid = passwordError(body.password);
    if (invalid) throw new HttpError(400, invalid);
    const client = await authClient();
    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();
    if (userError || !user?.email)
      throw new HttpError(401, "Please sign in again.");

    if (body.mode === "change") {
      if (typeof body.currentPassword !== "string" || !body.currentPassword)
        throw new HttpError(400, "Enter your current password.");
      const config = resolveSupabasePublicConfig();
      if (!config) throw new Error("Supabase is not configured.");
      const verifier = createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await verifier.auth.signInWithPassword({
        email: user.email,
        password: body.currentPassword,
      });
      if (error || data.user?.id !== user.id)
        throw new HttpError(400, "Current password is incorrect.");
    } else if (body.mode === "reset") {
      const jar = await cookies();
      if (!validRecoveryTicket(jar.get("classroom_recovery")?.value, user.id))
        throw new HttpError(
          403,
          "This reset link has expired. Request a new one.",
        );
    } else {
      throw new HttpError(400, "Choose a valid password action.");
    }

    const { error } = await client.auth.updateUser({ password: body.password });
    if (error)
      throw new HttpError(
        400,
        "Could not update the password. Choose a different password and try again.",
      );
    if (body.mode === "reset") (await cookies()).delete("classroom_recovery");
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
