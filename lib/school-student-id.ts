export const DEFAULT_STUDENT_EMAIL_DOMAIN = "students.example.edu";

// Student school emails are `<six-digit ID>@<domain>`. Browser components build
// them too, so the domain must be a NEXT_PUBLIC_ variable referenced literally
// below; Next.js inlines it at build time, so redeploy after changing it.
export function resolveStudentEmailDomain(value: string | undefined): string {
  const domain = (value ?? "").trim().toLowerCase().replace(/^@/, "");
  if (!domain) return DEFAULT_STUDENT_EMAIL_DOMAIN;
  if (
    !/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/.test(domain)
  )
    throw new Error(
      `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN must be a domain such as ${DEFAULT_STUDENT_EMAIL_DOMAIN}.`,
    );
  return domain;
}

export const STUDENT_EMAIL_DOMAIN = resolveStudentEmailDomain(
  process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN,
);

export function schoolStudentIdError(value: string): string | null {
  return /^\d{6}$/.test(value.trim())
    ? null
    : "Enter a six-digit School ID (for example, 123456).";
}

export function schoolEmailFromStudentId(value: string): string | null {
  const id = value.trim();
  return schoolStudentIdError(id) ? null : `${id}@${STUDENT_EMAIL_DOMAIN}`;
}
