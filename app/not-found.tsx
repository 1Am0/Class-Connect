import { StatusPage } from "@/components/status-page";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT("errors");
  return (
    <StatusPage title={t("notFoundTitle")} body={t("notFoundBody")}>
      <a className="primary" href="/dashboard">
        {t("home")}
      </a>
    </StatusPage>
  );
}
