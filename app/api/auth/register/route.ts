import { authClient } from "@/lib/server/supabase";
import { apiError, sameOrigin } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/config";
import { requestOrigin } from "@/lib/server/request-origin";
import {
  emailError,
  passwordError,
  usernameError,
} from "@/lib/account-validation";

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    if (isDemo())
      return Response.json(
        {
          error:
            "Account creation is unavailable in the local demo. Use Open demo classroom instead.",
        },
        { status: 400 },
      );
    const body = await req.json();
    if (!body || typeof body !== "object")
      return Response.json(
        { error: "Check the form fields and try again." },
        { status: 400 },
      );
    const invalid =
      usernameError(body.username) ||
      emailError(body.email) ||
      passwordError(body.password);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });

    const { data, error } = await (
      await authClient()
    ).auth.signUp({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      options: {
        data: { name: body.username.trim() },
        emailRedirectTo: new URL(
          "/auth/confirm?flow=signup",
          requestOrigin(req),
        ).toString(),
      },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message))
        return Response.json({ success: true, requiresConfirmation: true });
      if (/signups? (are |is )?disabled/i.test(error.message))
        return Response.json(
          { error: "Account creation is not enabled for this classroom yet." },
          { status: 503 },
        );
      return Response.json(
        { error: "Could not create the account. Please try again." },
        { status: error.status === 429 ? 429 : 503 },
      );
    }
    return Response.json({
      success: true,
      requiresConfirmation: !data.session,
    });
  } catch (error) {
    return apiError(error);
  }
}
