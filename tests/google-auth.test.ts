import test from "node:test";
import assert from "node:assert/strict";
import {
  beginGoogleSignIn,
  completeGoogleSignIn,
} from "../lib/server/google-auth";

test("Google sign-in starts PKCE at this site's callback without requesting extra scopes", async () => {
  let options: unknown;
  const url = await beginGoogleSignIn(
    {
      signInWithOAuth: async (value) => {
        options = value;
        return {
          data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
          error: null,
        };
      },
    },
    "https://classconnect.example",
  );
  assert.equal(url, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.deepEqual(options, {
    provider: "google",
    options: {
      redirectTo: "https://classconnect.example/auth/confirm?flow=google",
      skipBrowserRedirect: true,
    },
  });
});

test("Google sign-in reports provider setup failure without redirecting", async () => {
  await assert.rejects(
    beginGoogleSignIn(
      {
        signInWithOAuth: async () => ({
          data: { url: null },
          error: { message: "provider is not enabled" },
        }),
      },
      "https://classconnect.example",
    ),
    /Google sign-in is not available/,
  );
});

test("Google sign-in does not return an unsafe redirect", async () => {
  await assert.rejects(
    beginGoogleSignIn(
      {
        signInWithOAuth: async () => ({
          data: { url: "javascript:alert(1)" },
          error: null,
        }),
      },
      "https://classconnect.example",
    ),
    /Google sign-in is not available/,
  );
});

test("Google callback accepts only a completed code exchange with a user", async () => {
  const calls: string[] = [];
  const auth = {
    exchangeCodeForSession: async (code: string) => {
      calls.push(code);
      return {
        data: { user: code === "valid" ? { id: "teacher" } : null },
        error: null,
      };
    },
  };
  assert.equal(await completeGoogleSignIn(auth, "valid"), true);
  assert.equal(await completeGoogleSignIn(auth, "invalid"), false);
  assert.equal(await completeGoogleSignIn(auth, null), false);
  assert.deepEqual(calls, ["valid", "invalid"]);
});
