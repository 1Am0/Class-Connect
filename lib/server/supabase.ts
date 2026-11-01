import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { resolveSupabasePublicConfig } from "@/lib/supabase-env";
import { resolveSupabaseServerKey } from "./supabase-env";
export function admin() {
  const config = resolveSupabasePublicConfig(),
    key = resolveSupabaseServerKey();
  if (!config || !key)
    throw new Error(
      "Supabase is not configured. Follow the README setup steps.",
    );
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function authClient() {
  const jar = await cookies();
  const config = resolveSupabasePublicConfig();
  if (!config) throw new Error("Supabase is not configured.");
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items)
            jar.set(name, value, options);
        } catch {
          /* Proxy refreshes cookies before Server Components render. */
        }
      },
    },
  });
}
