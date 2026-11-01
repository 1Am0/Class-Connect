import QRCode from "qrcode";
import { z } from "zod";
import { apiError, HttpError, teacherStore } from "@/lib/server/auth";
import { isDemo } from "@/lib/server/config";
import { requestOrigin } from "@/lib/server/request-origin";
import { schoolClock } from "@/lib/core";
import {
  classCheckInWindow,
  createQrToken,
  QR_ROTATE_SECONDS,
} from "@/lib/student-checkin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const periodId = z
      .uuid()
      .parse(new URL(request.url).searchParams.get("class"));
    if (isDemo())
      throw new HttpError(
        503,
        "QR check-in requires a hosted teacher account.",
      );
    const state = await (await teacherStore()).snapshot();
    const secret = process.env.QR_CHECKIN_SECRET ?? "";
    if (secret.length < 32)
      throw new HttpError(
        503,
        "QR check-in needs QR_CHECKIN_SECRET set on the server before it can be shown.",
      );
    const period = state.periods.find(
      (item) => item.id === periodId && item.active,
    );
    if (!period) throw new HttpError(404, "Class not found.");
    const date = schoolClock(state.teacher.timezone).date;
    const token = createQrToken(period.id, date, secret);
    const url = new URL(
      `/check-in?code=${encodeURIComponent(token)}`,
      requestOrigin(request),
    ).toString();
    const image = await QRCode.toDataURL(url, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    return Response.json(
      {
        image,
        url,
        date,
        className: `Period ${period.period_number} · ${period.name}`,
        periodNumber: period.period_number,
        name: period.name,
        open: classCheckInWindow(state.teacher, period).open,
        rotateSeconds: QR_ROTATE_SECONDS,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
