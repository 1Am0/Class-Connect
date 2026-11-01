"use client";
import { useEffect, useState } from "react";
import { Check, ArrowRight, Monitor, Moon, Sun } from "lucide-react";
import { usePreferences } from "./preferences";
import { GoogleMark } from "./ui";
import { PasswordField } from "./password-field";
import {
  emailError,
  passwordError,
  usernameError,
} from "@/lib/account-validation";
import { useLocalize, useT } from "./i18n";
import { LanguageSelect } from "./language-select";
export function Login({ demo }: { demo: boolean }) {
  const { preferences, setPreference } = usePreferences();
  const t = useT("auth");
  const localize = useLocalize();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [view, setView] = useState<"signin" | "create" | "forgot">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "forgot") setView("forgot");
    if (params.get("auth") === "expired") setError(t("linkExpired"));
    if (params.get("auth") === "google_error") setError(t("googleError"));
  }, [t]);
  function switchView(next: "signin" | "create" | "forgot") {
    setView(next);
    setError("");
    setMessage("");
    setPassword("");
  }
  async function submit(path: string, body: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("retry"));
      return result;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("retry"));
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function login(body: object) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      window.location.href = "/dashboard";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function loginWithGoogle() {
    setBusy(true);
    setGoogleBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "same-origin",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || typeof result?.url !== "string")
        throw new Error(result?.error || t("googleStartFailed"));
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("googleStartRetry"));
      setBusy(false);
      setGoogleBusy(false);
    }
  }
  return (
    <main className="login-screen">
      <section className="login-story">
        <div className="brand">
          <span className="brand-icon">
            <Check />
          </span>
          Class <span className="brand-connect">Connect</span>
        </div>
        <div>
          <h1>
            {t("tagline1")}
            <br />
            {t("tagline2")}
          </h1>
        </div>
        <small>{t("footer")}</small>
      </section>
      <section className="login-form">
        <div>
          <div
            className="segmented login-theme-switch"
            role="group"
            aria-label={t("colorTheme")}
          >
            <button
              type="button"
              className="login-theme-option"
              aria-pressed={preferences.theme === "light"}
              onClick={() => setPreference("theme", "light")}
            >
              <Sun size={16} aria-hidden="true" /> {t("light")}
            </button>
            <button
              type="button"
              className="login-theme-option"
              aria-pressed={preferences.theme === "dark"}
              onClick={() => setPreference("theme", "dark")}
            >
              <Moon size={16} aria-hidden="true" /> {t("dark")}
            </button>
            <button
              type="button"
              className="login-theme-option"
              aria-pressed={preferences.theme === "system"}
              onClick={() => setPreference("theme", "system")}
            >
              <Monitor size={16} aria-hidden="true" /> {t("system")}
            </button>
          </div>
          <LanguageSelect />
          <h2>
            {t(
              view === "signin"
                ? "welcome"
                : view === "create"
                  ? "createTitle"
                  : "resetTitle",
            )}
          </h2>
          {view === "forgot" && <p className="muted">{t("resetIntro")}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (view === "signin") {
                void login({ email, password });
              } else if (view === "create") {
                const invalid =
                  usernameError(username) ||
                  emailError(email) ||
                  passwordError(password);
                if (invalid) return setError(invalid);
                void submit("/api/auth/register", {
                  username,
                  email,
                  password,
                }).then((result) => {
                  if (!result) return;
                  setPassword("");
                  if (result.requiresConfirmation)
                    setMessage(t("confirmEmail"));
                  else window.location.href = "/dashboard";
                });
              } else {
                const invalid = emailError(email);
                if (invalid) return setError(invalid);
                void submit("/api/auth/recovery", { email }).then((result) => {
                  if (result) setMessage(t("resetSent"));
                });
              }
            }}
          >
            {view === "create" && (
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
            )}
            <label>
              {t("email")}
              <input
                type="email"
                placeholder={t("emailPlaceholder")}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
              />
            </label>
            {view === "signin" && (
              <label>
                {t("password")}
                <input
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
            )}
            {view === "create" && (
              <PasswordField
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
            )}
            <button className="primary" disabled={busy}>
              {t(
                busy
                  ? "working"
                  : view === "signin"
                    ? "signIn"
                    : view === "create"
                      ? "createAccount"
                      : "sendReset",
              )}{" "}
              <ArrowRight size={17} />
            </button>
          </form>
          {!demo && view !== "forgot" && (
            <>
              <div className="divider">{t("or")}</div>
              <button
                type="button"
                className="secondary wide"
                disabled={busy}
                onClick={() => void loginWithGoogle()}
              >
                <GoogleMark />
                {t(googleBusy ? "openingGoogle" : "google")}
              </button>
            </>
          )}
          <div className="auth-links">
            {view === "signin" ? (
              <>
                <button type="button" onClick={() => switchView("create")}>
                  {t("createAccount")}
                </button>
                <button type="button" onClick={() => switchView("forgot")}>
                  {t("forgot")}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => switchView("signin")}>
                {t("backToSignIn")}
              </button>
            )}
          </div>
          {demo && view === "signin" && (
            <>
              <div className="divider">{t("explore")}</div>
              <button
                className="secondary wide"
                disabled={busy}
                onClick={() => login({ demo: true })}
              >
                {t("demo")} <ArrowRight size={17} />
              </button>
              <p className="hint">{t("demoHint")}</p>
            </>
          )}
          {error && (
            <p className="notice error" role="alert">
              {localize(error)}
            </p>
          )}
          {message && (
            <p className="field-success" role="status">
              {message}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
