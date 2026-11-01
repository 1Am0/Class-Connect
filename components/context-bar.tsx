"use client";
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { activePeriod } from "@/lib/core";
import { useClassroom } from "./context";
import { useBluetooth } from "./bluetooth-provider";
import { FastLink as Link } from "./fast-link";
import { useT } from "./i18n";

/** Scanner connection and where its check-ins go right now. */
export function useScannerStatus(now: Date) {
  const { s } = useClassroom();
  const { state } = useBluetooth();
  const t = useT("scannerStatus");
  const destination = activePeriod(s.teacher, s.periods, now);
  const manual = Boolean(s.teacher.override_period_id);
  const connection =
    state.supported === false
      ? "unsupported"
      : state.connection === "connected"
        ? "connected"
        : state.connection === "connecting"
          ? "connecting"
          : "offline";
  const connectionLabel = t(
    connection === "offline" && state.reconnecting
      ? "reconnecting"
      : connection,
  );
  return { connection, connectionLabel, destination, manual };
}

/** Phone-only top bar: menu and home mark. */
export function ContextBar({ menuButton }: { menuButton: ReactNode }) {
  const t = useT("shell");
  return (
    <header className="context-bar">
      <div className="context-bar-lead">
        {menuButton}
        <Link
          href="/dashboard"
          className="brand context-brand"
          aria-label={t("brandHome")}
        >
          <span className="brand-icon">
            <Check size={20} />
          </span>
        </Link>
      </div>
    </header>
  );
}
