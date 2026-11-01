interface GoogleOAuthStart {
  signInWithOAuth(options: {
    provider: "google";
    options: { redirectTo: string; skipBrowserRedirect: true };
  }): Promise<{
    data: { url: string | null };
    error: { message: string } | null;
  }>;
}

interface GoogleOAuthExchange {
  exchangeCodeForSession(code: string): Promise<{
    data: { user: { id: string } | null };
    error: { message: string } | null;
  }>;
}

export async function beginGoogleSignIn(
  auth: GoogleOAuthStart,
  origin: string,
) {
  const { data, error } = await auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/confirm?flow=google", origin).toString(),
      skipBrowserRedirect: true,
    },
  });
  let destination: URL | null = null;
  try {
    if (data.url) destination = new URL(data.url);
  } catch {
    // Treat malformed provider URLs the same as a provider setup failure.
  }
  if (error || destination?.protocol !== "https:")
    throw new Error(
      "Google sign-in is not available. Check the provider setup and try again.",
    );
  return destination.toString();
}

export async function completeGoogleSignIn(
  auth: GoogleOAuthExchange,
  code: string | null,
) {
  if (!code) return false;
  const { data, error } = await auth.exchangeCodeForSession(code);
  return !error && !!data.user;
}
