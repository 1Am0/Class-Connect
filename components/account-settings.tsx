"use client";
import { useState } from "react";
import { PasswordField } from "./password-field";
import { useClassroom } from "./context";
import { passwordError, usernameError } from "@/lib/account-validation";
import { useT } from "./i18n";

export function AccountSettings() {
  const { s, mutate, notify } = useClassroom();
  const t = useT("account");
  const [username, setUsername] = useState(s.teacher.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const setError = (text: string) => {
    if (text) notify(text, "error");
  };
  // Results appear in the shared message toast so the next card never shifts.
  const setMessage = (text: string) => {
    if (text) notify(text);
  };

  async function request(path: string, body: object) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t("retry"));
  }

  return (
    <section
      className="card settings-card account-settings"
      aria-labelledby="account-settings-title"
    >
      <div className="card-title">
        <div>
          <h2 id="account-settings-title">{t("title")}</h2>
        </div>
      </div>
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          const invalid = usernameError(username);
          if (invalid) return setError(invalid);
          setBusy(true);
          setError("");
          setMessage("");
          try {
            await mutate({ action: "settings", name: username.trim() });
            notify(t("usernameUpdated"));
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : t("usernameFailed"),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          {t("username")}
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            maxLength={100}
            autoComplete="nickname"
          />
        </label>
        <label>
          {t("email")}
          <input value={s.teacher.email} readOnly />
        </label>
        <button
          className="primary"
          disabled={busy || username.trim() === s.teacher.name}
        >
          {t(busy ? "saving" : "saveUsername")}
        </button>
      </form>
      <div className="account-divider" />
      {s.demo ? (
        <p className="hint">{t("demoPassword")}</p>
      ) : (
        <>
          <form
            className="form-stack"
            onSubmit={async (event) => {
              event.preventDefault();
              const invalid = passwordError(newPassword);
              if (invalid) return setError(invalid);
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await request("/api/auth/password", {
                  mode: "change",
                  currentPassword,
                  password: newPassword,
                });
                setCurrentPassword("");
                setNewPassword("");
                setMessage(t("passwordUpdated"));
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : t("passwordFailed"),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <h3>{t("changePassword")}</h3>
            <label>
              {t("currentPassword")}
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <PasswordField
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
              label={t("newPassword")}
            />
            <button className="primary" disabled={busy}>
              {t(busy ? "updating" : "changePassword")}
            </button>
          </form>
          <button
            type="button"
            className="account-reset-link"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await request("/api/auth/recovery", { email: s.teacher.email });
                setMessage(t("resetSent"));
              } catch (cause) {
                setError(
                  cause instanceof Error ? cause.message : t("resetFailed"),
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("emailReset")}
          </button>
        </>
      )}
    </section>
  );
}
