import { z } from "zod";
import {
  apiError,
  HttpError,
  sameOrigin,
  teacherStore,
} from "@/lib/server/auth";
import { validateImport } from "@/lib/roster-import";
import { schoolEmailFromStudentId } from "@/lib/school-student-id";

const id = z.string().uuid();
const row = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  school_student_id: z
    .string()
    .trim()
    .regex(/^\d{6}$/)
    .nullable(),
  school_email: z.email().max(254).nullable().optional(),
  existing_student_id: id.nullable(),
});
const schema = z.object({
  period_id: id,
  mode: z.enum(["add", "sync"]),
  rows: z.array(row).min(1).max(500),
  expected_student_ids: z.array(id).max(10000),
});

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const store = await teacherStore();
    const input = schema.parse(await request.json());
    const message = validateImport(input.rows, []);
    if (message) throw new HttpError(400, message);
    const result = await store.importRoster({
      ...input,
      rows: input.rows.map((item) => ({
        ...item,
        school_email: schoolEmailFromStudentId(item.school_student_id ?? ""),
      })),
    });
    return Response.json({ success: true, result });
  } catch (error) {
    if (
      error instanceof Error &&
      /Roster changed|migration 007/i.test(error.message)
    )
      return Response.json(
        { success: false, error: error.message },
        { status: 409 },
      );
    if (error instanceof Error && /Class is unavailable/i.test(error.message))
      return Response.json(
        {
          success: false,
          error: "Restore this class before importing its roster.",
        },
        { status: 409 },
      );
    if (
      error instanceof Error &&
      /Duplicate Student Number|Student Number already exists|Student Number belongs|Student Number differs|Duplicate student|School email/i.test(
        error.message,
      )
    )
      return Response.json(
        {
          success: false,
          error:
            "A student or Student Number already exists. Refresh and review the matches.",
        },
        { status: 409 },
      );
    return apiError(error);
  }
}
