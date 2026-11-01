import type { ReactNode } from "react";
import { Check } from "lucide-react";

// Shared frame for full-page states: errors, missing pages, and loading.
export function StatusPage({
  title,
  body,
  children,
  role,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
  role?: "alert" | "status";
}) {
  return (
    <main className="status-page">
      <section className="status-page-card" role={role}>
        <span className="brand-icon status-page-mark" aria-hidden="true">
          <Check size={23} />
        </span>
        <h1>{title}</h1>
        {body && <p>{body}</p>}
        {children && <div className="status-page-actions">{children}</div>}
      </section>
    </main>
  );
}
