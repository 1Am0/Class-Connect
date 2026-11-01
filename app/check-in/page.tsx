import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { StudentCheckIn } from "@/components/student-check-in";
import { studentGoogleConfig } from "@/lib/server/student-google";
import { createCheckInPass, verifyQrToken } from "@/lib/student-checkin";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT("checkIn"))("pageTitle") };
}

export default async function CheckInPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const t = await getT("checkIn");
  // The board's code changes every few seconds; a fresh scan is traded for a
  // short pass so the student has time to type their ID.
  const secret = process.env.QR_CHECKIN_SECRET ?? "";
  const qr = code && secret.length >= 32 ? verifyQrToken(code, secret) : null;
  const problem = !code
    ? t("scanFirst")
    : !qr
      ? t("invalid")
      : qr.expired
        ? t("changed")
        : "";
  return (
    <StudentCheckIn
      pass={
        qr && !qr.expired ? createCheckInPass(qr.periodId, qr.date, secret) : ""
      }
      problem={problem}
      clientId={studentGoogleConfig()?.clientId ?? ""}
    />
  );
}
