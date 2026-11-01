import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveSupabasePublicConfig } from "@/lib/supabase-env";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = resolveSupabasePublicConfig();
  if (!config) return response;
  const client = createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        items.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        items.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await client.auth.getUser();
  return response;
}
export const config = {
  matcher: [
    "/((?!api/scans|api/devices|api/student-check-in|check-in|_next/static|_next/image|favicon.svg|favicon.ico).*)",
  ],
};
