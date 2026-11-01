"use client";
import { Bluetooth, BluetoothConnected } from "lucide-react";
import { useClassroom } from "./context";
import { useBluetooth } from "./bluetooth-provider";
import { useScannerStatus } from "./context-bar";
import { FastLink as Link } from "./fast-link";
import { useLocalize, useT } from "./i18n";

/**
 * The scanner's one control, floating bottom right on every classroom page.
 * One tap connects while off; once on it shows where taps go and opens setup.
 */
export function ScannerFab() {
  const { s } = useClassroom();
  const { state, connect } = useBluetooth();
  const { connection, connectionLabel, destination, manual } = useScannerStatus(
    new Date(),
  );
  const t = useT("scannerFab");
  const localize = useLocalize();
  const device = s.devices.find((d) => d.active);
  const where = destination
    ? t(manual ? "scansGoManual" : "scansGo", {
        number: destination.period_number,
        name: destination.name,
      })
    : t("noClass");
  const minutes =
    state.lastScan === null
      ? 0
      : Math.floor((Date.now() - state.lastScan) / 60_000);
  const lastScan =
    state.lastScan === null
      ? t("noScans")
      : minutes < 1
        ? t("lastScanNow")
        : minutes < 60
          ? t("lastScanMinutes", { count: minutes })
          : t("lastScanHours", { count: Math.floor(minutes / 60) });
  const className =
    "scanner-fab " + connection + (state.reconnecting ? " reconnecting" : "");
  if (connection === "connected" || connection === "unsupported" || !device)
    return (
      <Link
        href="/scanner"
        className={className}
        aria-label={`${device ? connectionLabel : t("setUp")}. ${where}.${connection === "connected" ? ` ${lastScan}.` : ""} ${t("openSetup")}`}
        title={
          connection === "unsupported"
            ? t("useChrome")
            : connection === "connected"
              ? `${where} · ${lastScan}`
              : where
        }
      >
        {connection === "connected" ? (
          <BluetoothConnected size={22} aria-hidden="true" />
        ) : (
          <Bluetooth size={22} aria-hidden="true" />
        )}
        <span className="scanner-fab-label" aria-hidden="true">
          {connection === "connected"
            ? destination
              ? t("scannerOnPeriod", { number: destination.period_number })
              : t("scannerOn")
            : t(device ? "scanner" : "setUp")}
        </span>
      </Link>
    );
  return (
    <button
      type="button"
      className={className}
      disabled={connection === "connecting"}
      onClick={() => void connect(state.deviceId || device.id)}
      aria-label={`${t(connection === "connecting" ? "connectingTo" : state.reconnecting ? "reconnectingLabel" : "connect")}. ${where}.`}
      title={state.message && !state.success ? localize(state.message) : where}
    >
      <Bluetooth size={22} aria-hidden="true" />
      <span className="scanner-fab-label" aria-hidden="true">
        {t(
          connection === "connecting"
            ? "connecting"
            : state.reconnecting
              ? "reconnecting"
              : "connect",
        )}
      </span>
    </button>
  );
}
