import { authClient } from "@/lib/server/supabase";
import { apiError, sameOrigin } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/config";
import { emailError } from "@/lib/account-validation";
import { requestOrigin } from "@/lib/server/request-origin";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (isDemo())
      return Response.json(
        { error: "Password reset is unavailable in the local demo." },
        { status: 400 },
      );
    const body = await req.json();
    if (!body || typeof body !== "object")
      return Response.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    const invalid = emailError(body.email);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    const { error } = await (
      await authClient()
    ).auth.resetPasswordForEmail(body.email.trim().toLowerCase(), {
      redirectTo: new URL(
        "/auth/confirm?flow=recovery",
        requestOrigin(req),
      ).toString(),
    });
    if (error && error.status === 429)
      return Response.json(
        { error: "Please wait before requesting another reset email." },
        { status: 429 },
      );
    if (error)
      return Response.json(
        { error: "Could not send a reset email right now. Please try again." },
        { status: 503 },
      );
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
