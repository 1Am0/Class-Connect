"use client";

import { translator } from "@/lib/i18n";
import { isLocale, LOCALE_COOKIE, matchLocale } from "@/lib/i18n/locales";

// The visitor's language without the root layout: saved choice, else browser.
function pageLocale() {
  if (typeof document === "undefined") return "en";
  const saved = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return isLocale(saved) ? saved : matchLocale(navigator.language);
}

// Replaces the root layout, so it cannot rely on the app stylesheets.
export default function GlobalError({ retry }: { retry: () => void }) {
  const locale = pageLocale();
  const t = translator(locale, "errors");
  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 16,
          fontFamily: "system-ui, sans-serif",
          background: "#f5f5f4",
          color: "#191b1e",
        }}
      >
        <main role="alert" style={{ maxWidth: 440, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, lineHeight: 1.2 }}>{t("loadTitle")}</h1>
          <p style={{ color: "#555b63", lineHeight: 1.5 }}>{t("loadBody")}</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: 48,
              padding: "0 22px",
              border: 0,
              borderRadius: 11,
              background: "#1f5b43",
              color: "#fff",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("retry")}
          </button>
        </main>
      </body>
    </html>
  );
}
