import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { authClient } from "@/lib/server/supabase";
import { createRecoveryTicket } from "@/lib/server/recovery-ticket";
import { requestOrigin } from "@/lib/server/request-origin";
import { completeGoogleSignIn } from "@/lib/server/google-auth";

export async function GET(req: NextRequest) {
  const flow = req.nextUrl.searchParams.get("flow");
  const code = req.nextUrl.searchParams.get("code");
  const tokenHash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type");
  const destination = new URL(
    flow === "recovery" ? "/reset-password" : "/login",
    requestOrigin(req),
  );
  try {
    if (flow !== "signup" && flow !== "recovery" && flow !== "google")
      throw new Error("Invalid flow");
    const client = await authClient();
    if (flow === "google") {
      if (!(await completeGoogleSignIn(client.auth, code)))
        throw new Error("Google sign-in did not finish");
      destination.pathname = "/dashboard";
      return NextResponse.redirect(destination);
    }
    const result = code
      ? await client.auth.exchangeCodeForSession(code)
      : tokenHash && type === (flow === "recovery" ? "recovery" : "email")
        ? await client.auth.verifyOtp({ token_hash: tokenHash, type })
        : null;
    if (!result || result.error || !result.data.user)
      throw new Error("Invalid or expired link");
    if (flow === "recovery") {
      (await cookies()).set(
        "classroom_recovery",
        createRecoveryTicket(result.data.user.id),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 600,
        },
      );
    } else {
      destination.pathname = "/dashboard";
    }
  } catch {
    destination.pathname = flow === "recovery" ? "/reset-password" : "/login";
    destination.searchParams.set(
      "auth",
      flow === "google" ? "google_error" : "expired",
    );
  }
  return NextResponse.redirect(destination);
}
