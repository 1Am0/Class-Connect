"use client";
import { useId, useState } from "react";
import { Check, Circle, Eye, EyeOff } from "lucide-react";
import { passwordRules } from "@/lib/account-validation";
import { useLocalize, useT } from "./i18n";

export function PasswordField({
  value,
  onChange,
  autoComplete,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: "new-password" | "current-password";
  label?: string;
}) {
  const [visible, setVisible] = useState(false);
  const t = useT("auth");
  const localize = useLocalize();
  const id = useId();
  return (
    <div className="password-field">
      <label htmlFor={id}>{label ?? t("password")}</label>
      <span className="password-input-wrap">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          required
          aria-describedby={`${id}-requirements`}
        />
        <button
          type="button"
          className="password-visibility"
          onClick={() => setVisible(!visible)}
          aria-label={t(visible ? "hidePassword" : "showPassword")}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      <ul
        id={`${id}-requirements`}
        className="password-requirements"
        aria-label={t("requirements")}
      >
        {passwordRules.map((rule) => {
          const met = rule.test(value);
          return (
            <li key={rule.label} className={met ? "met" : ""}>
              {met ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Circle size={15} aria-hidden="true" />
              )}
              <span className="sr-only">{t(met ? "met" : "notMet")}</span>{" "}
              {localize(rule.label)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
