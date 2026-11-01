type Env = Partial<NodeJS.ProcessEnv>;
export function resolveSupabaseServerKey(env: Env = process.env) {
  return env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
}
