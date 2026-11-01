import { teacherStore, apiError } from "@/lib/server/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await (await teacherStore()).snapshot(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
