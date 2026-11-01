type Env = Partial<NodeJS.ProcessEnv>;
export function resolveSupabasePublicUrl(env: Env = process.env) {
  return env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
}
export function resolveSupabasePublicKey(env: Env = process.env) {
  return (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY
  );
}
export function resolveSupabasePublicConfig(env: Env = process.env) {
  const url = resolveSupabasePublicUrl(env),
    key = resolveSupabasePublicKey(env);
  if (!url || !key) return null;
  return { url, key };
}
