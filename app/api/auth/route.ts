import { cookies } from "next/headers";
import { isDemo } from "@/lib/server/config";
import { authClient } from "@/lib/server/supabase";
import { apiError, sameOrigin } from "@/lib/server/auth";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = await req.json();
    if (isDemo() && body.demo) {
      (await cookies()).set("classroom_demo", "local-demo", {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        maxAge: 28800,
      });
      return Response.json({ success: true });
    }
    const { error } = await (
      await authClient()
    ).auth.signInWithPassword({ email: body.email, password: body.password });
    if (error)
      return Response.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    return Response.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    if (isDemo()) (await cookies()).delete("classroom_demo");
    else await (await authClient()).auth.signOut();
    return Response.json({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
