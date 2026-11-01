import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  teacherStore,
  sameOrigin,
  apiError,
  HttpError,
} from "@/lib/server/auth";
import { admin } from "@/lib/server/supabase";
import { isDemo } from "@/lib/server/config";
import {
  applyBannerChange,
  bannerChangeError,
  readChoices,
  type BannerChange,
} from "@/lib/class-banners";

export const dynamic = "force-dynamic";
const bucket = "class-banners";
const maxPhotoBytes = 3 * 1024 * 1024;
const photoTypes = new Set(["image/webp", "image/jpeg", "image/png"]);
const classId = z.uuid();
const choiceInput = z.object({
  class: classId,
  change: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("theme"), theme: z.string().max(40) }),
    z.object({ kind: z.literal("color"), color: z.string().max(20) }),
  ]),
});

/** The signed-in teacher, once their class is confirmed to be their own. */
async function teacherClass(periodId: string) {
  if (isDemo())
    throw new HttpError(409, "Banners are saved in this browser in the demo.");
  const store = await teacherStore();
  const { data, error } = await admin()
    .from("periods")
    .select("id")
    .eq("id", periodId)
    .eq("teacher_id", store.teacherId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404, "Choose one of your own classes.");
  return store.teacherId;
}

async function saveChange(
  teacherId: string,
  periodId: string,
  change: BannerChange,
) {
  const db = admin();
  const { data, error } = await db
    .from("teachers")
    .select("class_banners")
    .eq("id", teacherId)
    .single();
  if (error) {
    if (error.code === "42703")
      throw new HttpError(
        409,
        "Synced banners need database migration 014. Ask the project owner to apply it.",
      );
    throw error;
  }
  const choices = readChoices(data.class_banners);
  choices[periodId] = applyBannerChange(choices[periodId] ?? {}, change);
  const saved = await db
    .from("teachers")
    .update({ class_banners: choices })
    .eq("id", teacherId);
  if (saved.error) throw saved.error;
  return choices[periodId];
}

const photoPath = (teacherId: string, periodId: string) =>
  `${teacherId}/${periodId}`;

export async function GET(request: Request) {
  try {
    const periodId = classId.parse(
      new URL(request.url).searchParams.get("class"),
    );
    const teacherId = await teacherClass(periodId);
    const { data, error } = await admin()
      .storage.from(bucket)
      .download(photoPath(teacherId, periodId));
    if (error || !data) throw new HttpError(404, "This class has no photo.");
    return new Response(data, {
      headers: {
        "Content-Type": data.type || "image/webp",
        // Each upload gets a new version in the URL, so this never goes stale.
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const body = choiceInput.parse(await request.json());
    const problem = bannerChangeError(body.change);
    if (problem) throw new HttpError(400, problem);
    const teacherId = await teacherClass(body.class);
    if (body.change.kind === "theme")
      await admin()
        .storage.from(bucket)
        .remove([photoPath(teacherId, body.class)]);
    return Response.json({
      choice: await saveChange(teacherId, body.class, body.change),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const form = await request.formData();
    const periodId = classId.parse(form.get("class"));
    const photo = form.get("photo");
    if (!(photo instanceof Blob) || !photoTypes.has(photo.type))
      throw new HttpError(400, "Choose a JPG, PNG, or WebP picture.");
    if (!photo.size || photo.size > maxPhotoBytes)
      throw new HttpError(400, "This picture is too large to sync.");
    const teacherId = await teacherClass(periodId);
    const { error } = await admin()
      .storage.from(bucket)
      .upload(photoPath(teacherId, periodId), photo, {
        upsert: true,
        contentType: photo.type,
      });
    if (error)
      throw new HttpError(
        503,
        "The photo could not be saved. Check that migration 014 created the class-banners bucket.",
      );
    return Response.json({
      choice: await saveChange(teacherId, periodId, {
        kind: "photo",
        photo: randomUUID(),
      }),
    });
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const periodId = classId.parse(
      new URL(request.url).searchParams.get("class"),
    );
    const teacherId = await teacherClass(periodId);
    await admin()
      .storage.from(bucket)
      .remove([photoPath(teacherId, periodId)]);
    return Response.json({
      choice: await saveChange(teacherId, periodId, { kind: "removePhoto" }),
    });
  } catch (e) {
    return apiError(e);
  }
}
