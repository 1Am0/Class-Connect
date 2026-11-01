"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, GraduationCap } from "lucide-react";
import { useT } from "./i18n";
import { LanguageSelect } from "./language-select";

type GoogleCredentialResponse = { credential?: string };
type GoogleApi = {
  accounts: {
    id: {
      initialize(options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
        auto_select: boolean;
      }): void;
      renderButton(
        element: HTMLElement,
        options: { theme: string; size: string; text: string; width: number },
      ): void;
    };
  };
};
declare global {
  interface Window {
    google?: GoogleApi;
  }
}

export function StudentCheckIn({
  pass,
  problem,
  clientId,
}: {
  pass: string;
  problem: string;
  clientId: string;
}) {
  const t = useT("checkIn");
  const button = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState<"present" | "already" | "other" | null>(
    null,
  );
  // Without a Google client, students check in by typing their school ID.
  const useGoogle = Boolean(clientId);

  async function checkIn(
    proof: { credential: string } | { studentId: string },
  ) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/student-check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass, ...proof }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("failed"));
      setName(result.name ?? "");
      setDone(
        result.status !== "present"
          ? "other"
          : result.alreadyCheckedIn
            ? "already"
            : "present",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  const checkInRef = useRef(checkIn);
  checkInRef.current = checkIn;
  useEffect(() => {
    if (!pass || !useGoogle) return;
    let active = true;
    let script: HTMLScriptElement | null = null;
    const setup = () => {
      if (!active || !window.google || !button.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: ({ credential }) => {
          if (!credential) {
            setError(t("noGoogleCredential"));
            return;
          }
          void checkInRef.current({ credential });
        },
      });
      button.current.replaceChildren();
      window.google.accounts.id.renderButton(button.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 300,
      });
    };
    if (window.google) setup();
    else {
      script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = setup;
      script.onerror = () => setError(t("googleLoadFailed"));
      document.head.appendChild(script);
    }
    return () => {
      active = false;
      script?.remove();
    };
  }, [pass, clientId, useGoogle]);

  return (
    <main className="student-checkin-page">
      <section className="student-checkin-panel">
        <LanguageSelect className="student-checkin-language" />
        <div className="student-checkin-brand">
          <GraduationCap size={27} aria-hidden="true" /> Class{" "}
          <span>Connect</span>
        </div>
        {done ? (
          <div className="student-checkin-result" role="status">
            <CheckCircle2 size={44} aria-hidden="true" />
            <h1>
              {done === "present"
                ? name
                  ? t("checkedInName", { name })
                  : t("checkedIn")
                : t(done === "already" ? "already" : "otherStatus")}
            </h1>
            <p>
              {t(
                done === "present"
                  ? "checkedInBody"
                  : done === "already"
                    ? "alreadyBody"
                    : "otherBody",
              )}
            </p>
          </div>
        ) : (
          <>
            <h1>{t("title")}</h1>
            <p>{t(useGoogle ? "googleIntro" : "idIntro")}</p>
            {!pass ? (
              <p className="field-error" role="alert">
                {problem}
              </p>
            ) : !useGoogle ? (
              <form
                className="form-stack student-checkin-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!/^\d{6}$/.test(studentId.trim())) {
                    setError(t("idError"));
                    return;
                  }
                  void checkIn({ studentId: studentId.trim() });
                }}
              >
                <label>
                  {t("studentId")}
                  <input
                    autoFocus
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    pattern="\d{6}"
                    placeholder="123456"
                    value={studentId}
                    disabled={busy}
                    onChange={(event) =>
                      setStudentId(event.target.value.replace(/\D/g, ""))
                    }
                  />
                </label>
                <button
                  type="submit"
                  className="primary wide"
                  disabled={busy || studentId.length !== 6}
                >
                  {t(busy ? "checkingIn" : "checkIn")}
                </button>
              </form>
            ) : (
              <div
                className="student-checkin-google"
                ref={button}
                aria-label={t("googleLabel")}
              />
            )}
            {busy && useGoogle && <p role="status">{t("checkingYouIn")}</p>}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
