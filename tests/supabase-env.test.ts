import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveSupabasePublicConfig,
  resolveSupabasePublicKey,
  resolveSupabasePublicUrl,
} from "../lib/supabase-env";
import { resolveSupabaseServerKey } from "../lib/server/supabase-env";
test("Supabase public URL prefers NEXT_PUBLIC and falls back to integration name", () => {
  assert.equal(
    resolveSupabasePublicUrl({
      NEXT_PUBLIC_SUPABASE_URL: "https://legacy.example",
      SUPABASE_URL: "https://integration.example",
    }),
    "https://legacy.example",
  );
  assert.equal(
    resolveSupabasePublicUrl({ SUPABASE_URL: "https://integration.example" }),
    "https://integration.example",
  );
});
test("Supabase public key keeps legacy anon precedence with publishable fallbacks", () => {
  assert.equal(
    resolveSupabasePublicKey({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "np-publishable",
      SUPABASE_PUBLISHABLE_KEY: "publishable",
    }),
    "anon",
  );
  assert.equal(
    resolveSupabasePublicKey({
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "np-publishable",
      SUPABASE_PUBLISHABLE_KEY: "publishable",
    }),
    "np-publishable",
  );
  assert.equal(
    resolveSupabasePublicKey({ SUPABASE_PUBLISHABLE_KEY: "publishable" }),
    "publishable",
  );
});
test("Supabase public config returns null when URL or public key is missing", () => {
  assert.equal(resolveSupabasePublicConfig({}), null);
  assert.equal(
    resolveSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://u.example" }),
    null,
  );
  assert.equal(
    resolveSupabasePublicConfig({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon" }),
    null,
  );
});
test("Supabase server key prefers secret key then legacy service role key", () => {
  assert.equal(
    resolveSupabaseServerKey({
      SUPABASE_SECRET_KEY: "secret",
      SUPABASE_SERVICE_ROLE_KEY: "service",
    }),
    "secret",
  );
  assert.equal(
    resolveSupabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: "service" }),
    "service",
  );
  assert.equal(
    resolveSupabaseServerKey({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-only",
    }),
    undefined,
  );
});
