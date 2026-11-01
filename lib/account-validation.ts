export const passwordRules = [
  {
    label: "8–20 characters",
    test: (value: string) => value.length >= 8 && value.length <= 20,
  },
  {
    label: "At least one uppercase letter",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "At least one number",
    test: (value: string) => /[0-9]/.test(value),
  },
] as const;

export function passwordError(value: unknown): string | null {
  if (typeof value !== "string") return "Enter a password.";
  const unmet = passwordRules.filter((rule) => !rule.test(value));
  return unmet.length
    ? `Password needs ${unmet.map((rule) => rule.label.toLowerCase()).join(", ")}.`
    : null;
}

export function usernameError(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return "Enter a username.";
  if (value.trim().length > 100)
    return "Username must be 100 characters or fewer.";
  return null;
}

export function emailError(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  )
    return "Enter a valid email address.";
  return null;
}
