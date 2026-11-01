import { createHmac, timingSafeEqual } from "node:crypto";
import { resolveSupabaseServerKey } from "./supabase-env";

const lifetimeMs = 10 * 60 * 1000;

function signature(payload: string) {
  const key = resolveSupabaseServerKey();
  if (!key) throw new Error("Supabase is not configured.");
  return createHmac("sha256", key)
    .update(`classroom-recovery:${payload}`)
    .digest("hex");
}

export function createRecoveryTicket(userId: string, now = Date.now()) {
  const payload = `${userId}.${now + lifetimeMs}`;
  return `${payload}.${signature(payload)}`;
}

export function validRecoveryTicket(
  ticket: string | undefined,
  userId: string,
  now = Date.now(),
) {
  if (!ticket) return false;
  const parts = ticket.split(".");
  if (parts.length !== 3 || parts[0] !== userId) return false;
  const expires = Number(parts[1]);
  if (
    !Number.isSafeInteger(expires) ||
    now >= expires ||
    expires - now > lifetimeMs
  )
    return false;
  const supplied = Buffer.from(parts[2], "hex");
  const expected = Buffer.from(signature(`${parts[0]}.${parts[1]}`), "hex");
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}
