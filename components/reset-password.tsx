"use client";
import { useState } from "react";
import Link from "next/link";
import { PasswordField } from "./password-field";
import { passwordError } from "@/lib/account-validation";
import { useLocalize, useT } from "./i18n";

export function ResetPassword({ available }: { available: boolean }) {
  const t = useT("auth");
  const localize = useLocalize();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  return (
    <main className="account-page">
      <section className="card settings-card">
        <h1>{t("resetTitle")}</h1>
        {!available ? (
          <>
            <p>{t("resetInvalid")}</p>
            <Link className="secondary" href="/login?view=forgot">
              {t("requestAnother")}
            </Link>
          </>
        ) : done ? (
          <>
            <p>{t("passwordUpdated")}</p>
            <Link className="primary" href="/dashboard">
              {t("goToClassroom")}
            </Link>
          </>
        ) : (
          <form
            className="form-stack"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              const invalid = passwordError(password);
              if (invalid) return setError(invalid);
              setBusy(true);
              try {
                const response = await fetch("/api/auth/password", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "reset", password }),
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                setPassword("");
                setDone(true);
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : t("resetFailed"),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <PasswordField
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              label={t("newPassword")}
            />
            {error && (
              <p className="notice error" role="alert">
                {localize(error)}
              </p>
            )}
            <button className="primary" disabled={busy}>
              {t(busy ? "updating" : "setPassword")}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
