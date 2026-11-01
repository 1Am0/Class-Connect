// Hosting proxies can leave request.url pointing at the internal Next.js server.
// Use the public host/protocol they forward for auth emails and redirects.
export function requestOrigin(
  request: Request,
  env: Partial<NodeJS.ProcessEnv> = process.env,
) {
  const requestUrl = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    requestUrl.host;
  const production = env.NODE_ENV === "production" || !!env.VERCEL;
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    (production ? "https" : requestUrl.protocol.slice(0, -1));
  if (!["http", "https"].includes(protocol) || /[\s,/@?#\\]/.test(host))
    throw new Error("Invalid public request origin.");
  const origin = new URL(`${protocol}://${host}`);
  const hostname = origin.hostname;
  if (
    production &&
    (protocol !== "https" ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname === "[::]" ||
      hostname.startsWith("127."))
  )
    throw new Error("A public HTTPS origin is required for authentication.");
  return origin.origin;
}
