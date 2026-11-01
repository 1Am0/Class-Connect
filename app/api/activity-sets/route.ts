import { z } from "zod";
import { safeExtend } from "zod/mini";
import { activitySetInput } from "@/lib/activity-sets";
import {
  apiError,
  HttpError,
  sameOrigin,
  teacherStore,
} from "@/lib/server/auth";

const requestSchema = z.discriminatedUnion("action", [
  safeExtend(activitySetInput, { action: z.literal("save") }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
]);

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const store = await teacherStore();
    const input = requestSchema.parse(await request.json());
    const snapshot = await store.snapshot();
    if (input.id && !snapshot.activity_sets.some((set) => set.id === input.id))
      throw new HttpError(404, "Activity set not found.");
    if (input.action === "delete") {
      await store.deleteActivitySet(input.id);
      return Response.json({ success: true });
    }
    const now = new Date().toISOString();
    const previous = input.id
      ? snapshot.activity_sets.find((set) => set.id === input.id)
      : null;
    const id = await store.save("activity_sets", {
      ...(input.id ? { id: input.id } : {}),
      name: input.name,
      kind: input.kind,
      items: input.items,
      created_at: previous?.created_at ?? now,
      updated_at: now,
    });
    return Response.json({ success: true, id });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      ["42P01", "PGRST205"].includes(String(error.code))
    )
      return apiError(
        new HttpError(
          503,
          "Activity sets need database migration 013 before they can be saved.",
        ),
      );
    return apiError(error);
  }
}
