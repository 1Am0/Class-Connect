import { Suspense, type ReactNode } from "react";
import { redirect, unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { teacherStore, HttpError } from "@/lib/server/auth";
import { Classroom } from "@/components/classroom";
import { FirstRun } from "@/components/first-run";
import { resolveSupabasePublicConfig } from "@/lib/supabase-env";
import { resolveSupabaseServerKey } from "@/lib/server/supabase-env";
import { isDemo } from "@/lib/server/config";
import { ClassBannersProvider } from "@/components/class-banners";
import { readChoices } from "@/lib/class-banners";
import { getT } from "@/lib/i18n/server";

// Loading is read-only, so one retry is safe. The first request after
// sign-in (or after the server sat idle) can hit a dropped connection, and
// Supabase can briefly reject a token as "issued at future" (PGRST303) while
// its clocks catch up, so wait a moment before trying again.
async function loadClassroom() {
  try {
    return await (await teacherStore()).snapshot();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof HttpError) throw error;
    console.warn("Retrying classroom load after:", error);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return (await teacherStore()).snapshot();
  }
}

export default async function ClassroomLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Never prerender an authentication or database failure as a cached page.
  await connection();
  try {
    const initial = await loadClassroom();
    if (!initial.demo && initial.teacher.onboarding_completed === false)
      return <FirstRun />;
    return (
      <>
        <Suspense fallback={null}>
          <ClassBannersProvider
            key={initial.teacher.id}
            teacherId={initial.teacher.id}
            initial={
              !initial.demo && initial.teacher.class_banners
                ? readChoices(initial.teacher.class_banners)
                : null
            }
          >
            <Classroom
              initial={initial}
              supabase={resolveSupabasePublicConfig()}
            />
          </ClassBannersProvider>
        </Suspense>
        {children}
      </>
    );
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    console.error("Classroom could not be loaded:", error);
    const t = await getT("errors");
    const configured =
      isDemo() ||
      (resolveSupabasePublicConfig() !== null && !!resolveSupabaseServerKey());
    // Only point to setup when Supabase is actually missing.
    if (
      configured ||
      process.env.NODE_ENV === "production" ||
      process.env.VERCEL
    )
      return (
        <main className="setup-card" role="alert">
          <h1>{t("unavailableTitle")}</h1>
          <p>{t("unavailableBody")}</p>
          <a href="/dashboard">{t("retry")}</a>
          <p>
            <a href="/login">{t("signInLink")}</a>
          </p>
        </main>
      );
    return (
      <main className="setup-card">
        <h1>{t("setupTitle")}</h1>
        <p>{t("setupBody")}</p>
        <a href="/login">{t("signInLink")}</a>
      </main>
    );
  }
}
