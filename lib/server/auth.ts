import { getLocale } from "@/lib/i18n/server";
import { localizeMessage } from "@/lib/i18n";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { authClient, admin } from "./supabase";
import { isDemo } from "./config";
import { demoTransaction } from "./demo";
import { Store } from "./store";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function teacherStore() {
  if (isDemo()) {
    if ((await cookies()).get("classroom_demo")?.value !== "local-demo")
      throw new HttpError(401, "Please sign in.");
    return new Store(await demoTransaction((s) => s.teacher.id));
  }
  const {
    data: { user },
    error,
  } = await (await authClient()).auth.getUser();
  if (error || !user) throw new HttpError(401, "Please sign in.");
  return new Store(user.id);
}
export const hashKey = (key: string) =>
  createHash("sha256").update(key).digest("hex");
export async function authenticateDevice(deviceId: string, key: string) {
  if (isDemo()) {
    const secret = process.env.DEMO_DEVICE_KEY;
    if (!secret || secret.length < 32 || hashKey(secret) !== hashKey(key))
      throw new HttpError(401, "unauthorized_device");
    const s = await demoTransaction((s) => s);
    const d = s.devices.find(
      (x) => x.device_identifier === deviceId && x.active,
    );
    if (!d) throw new HttpError(401, "unauthorized_device");
    return { store: new Store(s.teacher.id), device: d };
  }
  const { data: d, error } = await admin()
    .from("devices")
    .select("*")
    .eq("device_identifier", deviceId)
    .eq("active", true)
    .maybeSingle();
  const supplied = Buffer.from(hashKey(key));
  const expected = Buffer.from(d?.hashed_api_key ?? "0".repeat(64));
  if (
    error ||
    !d ||
    expected.length !== supplied.length ||
    !timingSafeEqual(supplied, expected)
  )
    throw new HttpError(401, "unauthorized_device");
  return { store: new Store(d.teacher_id), device: d };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (
    origin &&
    new URL(origin).host !==
      (request.headers.get("host") ?? new URL(request.url).host)
  )
    throw new HttpError(403, "Request origin is not allowed.");
}
/** An error response, in the visitor's language. */
export async function apiError(error: unknown) {
  const response = englishApiError(error);
  const locale = await getLocale();
  if (locale === "en") return response;
  const body = await response.clone().json();
  if (typeof body?.error === "string")
    body.error = localizeMessage(locale, body.error);
  return Response.json(body, {
    status: response.status,
    headers: response.headers,
  });
}
function englishApiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { success: false, error: error.message, status: error.message },
      { status: error.status },
    );
  if (error instanceof Error && error.name === "ZodError")
    return Response.json(
      {
        success: false,
        status: "invalid_request",
        error: "Check the form fields and try again.",
      },
      { status: 400 },
    );
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  if (["23505", "23503", "23514", "P0001"].includes(code))
    return Response.json(
      {
        success: false,
        status: "conflict",
        error:
          "The change conflicts with an existing record, membership, or tag. Refresh and try again.",
      },
      { status: 409 },
    );
  if (error instanceof SyntaxError)
    return Response.json(
      {
        success: false,
        status: "invalid_request",
        error: "Send a valid JSON request.",
      },
      { status: 400 },
    );
  const message = error instanceof Error ? error.message : "";
  if (message.startsWith("Attendance changed elsewhere"))
    return Response.json({ success: false, error: message }, { status: 409 });
  const validation =
    /UID must|Student is|Tag is|already assigned|period|Period|End time|timezone|time zone|Configure real|Supabase is not configured/i.test(
      message,
    );
  if (validation)
    return Response.json(
      { success: false, status: "invalid_request", error: message },
      { status: 400 },
    );
  console.error(
    "Request failed:",
    message || code || "Database operation failed",
  );
  return Response.json(
    {
      success: false,
      status: "temporarily_unavailable",
      error: "The server could not save this request. Please retry.",
    },
    { status: 503 },
  );
}
