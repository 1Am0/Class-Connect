import { isDemo } from "@/lib/server/config";
import { apiError, HttpError, sameOrigin } from "@/lib/server/auth";
import { authClient } from "@/lib/server/supabase";
import { requestOrigin } from "@/lib/server/request-origin";
import { beginGoogleSignIn } from "@/lib/server/google-auth";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (isDemo())
      throw new HttpError(
        400,
        "Google sign-in is unavailable in the local demo. Open the demo classroom instead.",
      );
    const url = await beginGoogleSignIn(
      (await authClient()).auth,
      requestOrigin(request),
    );
    return Response.json({ url });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Google sign-in is not available")
    )
      return apiError(new HttpError(503, error.message));
    return apiError(error);
  }
}
