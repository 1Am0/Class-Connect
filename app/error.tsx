"use client";

import { useEffect } from "react";
import { StatusPage } from "@/components/status-page";
import { useT } from "@/components/i18n";

export default function ClassroomError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useT("errors");
  useEffect(() => {
    console.error("Classroom view crashed:", error);
  }, [error]);
  return (
    <StatusPage role="alert" title={t("crashTitle")} body={t("crashBody")}>
      <button type="button" className="primary" onClick={() => retry()}>
        {t("retry")}
      </button>
      <a className="secondary" href="/dashboard">
        {t("home")}
      </a>
    </StatusPage>
  );
}
