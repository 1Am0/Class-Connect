"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bluetooth, BluetoothConnected, ArrowRight } from "lucide-react";
import { useBluetooth } from "./bluetooth-provider";
import { useClassroom } from "./context";
import { CustomSelect } from "./custom-select";
import { useLocalize, useT } from "./i18n";

export function BluetoothPanel({
  compact = false,
  home = false,
}: {
  compact?: boolean;
  home?: boolean;
}) {
  const { s, periodId, mutate, notify, syncError } = useClassroom();
  const { state, connect, disconnect } = useBluetooth();
  const t = useT("scanner");
  const localize = useLocalize();
  const message = localize(state.message);
  const [selected, setSelected] = useState(state.deviceId);
  const [clock, setClock] = useState(Date.now());
  const [routing, setRouting] = useState(false);
  async function useScanner() {
    setRouting(true);
    try {
      await mutate({ action: "settings", override_period_id: periodId });
      notify(t("readyForClass"));
    } catch {
      // mutate reports the error and offers recovery through the shared UI.
    } finally {
      setRouting(false);
    }
  }
  useEffect(() => {
    if (compact) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [compact]);

  const devices = s.devices.filter((d) => d.active);
  const choice = devices.find((d) => d.id === selected) ?? devices[0];
  const linked = state.connection === "connected";
  const connecting = state.connection === "connecting";
  const device =
    linked || connecting
      ? devices.find((d) => d.id === state.deviceId)
      : choice;
  const fresh =
    state.lastReceived !== null && clock - state.lastReceived < 45000;
  const enrolling =
    !!device?.enrollment_until &&
    new Date(device.enrollment_until).getTime() > clock;
  const title = t(
    linked
      ? !device
        ? "titlePaused"
        : enrolling
          ? "titleAssigning"
          : "titleConnected"
      : connecting
        ? "titleChoose"
        : "titleConnect",
  );

  if (compact)
    return (
      <div className="bluetooth-quick-connect" aria-label={t("connection")}>
        {devices.length > 1 && !linked && !connecting && (
          <CustomSelect
            ariaLabel={t("scannerToConnect")}
            value={choice?.id ?? ""}
            onChange={setSelected}
            options={devices.map((item) => ({
              value: item.id,
              label: item.device_name,
            }))}
          />
        )}
        {!devices.length ? (
          <Link className="secondary" href="/scanner">
            <Bluetooth size={17} /> {t("setUp")}
          </Link>
        ) : linked && home ? (
          <Link className="secondary scanner-connect-action" href="/scanner">
            <BluetoothConnected size={17} /> {t("connected")}
          </Link>
        ) : linked ? (
          <button
            type="button"
            className="secondary"
            disabled={routing || syncError || !periodId || !device}
            onClick={() => void useScanner()}
          >
            <BluetoothConnected size={17} />
            {t(routing ? "updating" : "useScanner")}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="secondary scanner-connect-action"
              disabled={!state.supported || connecting}
              onClick={() => choice && void connect(choice.id)}
            >
              <Bluetooth size={17} /> {t(connecting ? "connecting" : "connect")}
            </button>
          </>
        )}
        {state.supported === false && (
          <span className="bluetooth-quick-feedback" role="status">
            {t("useChrome")}
          </span>
        )}
        {state.message && !state.success && (
          <span className="bluetooth-quick-feedback" role="status">
            {message}
          </span>
        )}
      </div>
    );

  return (
    <section
      className={`card bluetooth-panel${compact ? " compact" : ""}`}
      aria-label={t("connection")}
    >
      <div className="card-title">
        <div>
          <h1 tabIndex={-1}>{title}</h1>
          <p>
            {t(
              linked
                ? !device
                  ? "bodyPaused"
                  : enrolling
                    ? "bodyAssigning"
                    : "bodyConnected"
                : connecting
                  ? "bodyChoose"
                  : "bodyConnect",
            )}
          </p>
        </div>
        <span className="tool-icon mint" aria-hidden="true">
          {linked ? <BluetoothConnected size={26} /> : <Bluetooth size={26} />}
        </span>
      </div>
      <div className="form-stack">
        {state.supported === false && (
          <p className="notice info">{t("openInChrome")}</p>
        )}
        <div className="bluetooth-controls">
          {devices.length > 1 && !linked && !connecting && (
            <label>
              {t("scanner")}
              <CustomSelect
                ariaLabel={t("scanner")}
                value={choice?.id ?? ""}
                onChange={setSelected}
                options={devices.map((device) => ({
                  value: device.id,
                  label: device.device_name,
                }))}
              />
            </label>
          )}
          {!linked && devices.length > 0 && (
            <button
              className="primary scanner-connect-action"
              disabled={!state.supported || !device || connecting}
              onClick={() => choice && void connect(choice.id)}
            >
              <Bluetooth size={18} />
              {t(connecting ? "connecting" : "connect")}
            </button>
          )}
          {!devices.length &&
            (compact ? (
              <Link className="text-button" href="/scanner">
                {t("setUpA")} <ArrowRight size={15} />
              </Link>
            ) : (
              <p className="muted">{t("addOrEnable")}</p>
            ))}
          {linked && enrolling && (
            <Link
              className="text-button"
              href={
                periodId
                  ? `/attendance?class=${encodeURIComponent(periodId)}`
                  : "/dashboard"
              }
            >
              {t("openAttendance")} <ArrowRight size={15} />
            </Link>
          )}
        </div>
        {state.message && (!state.success || state.lastUid) && (
          <p
            className={`scan-feedback${state.success ? "" : " error"}`}
            role="status"
          >
            {message}
          </p>
        )}
        {linked && device && !fresh && (
          <p className="hint" role="status">
            {state.lastReceived === null ? t("waitingSignal") : t("noSignal")}
          </p>
        )}
        <p className="hint">{t("keepOpen")}</p>
        {!compact && (
          <details className="settings-disclosure connection-details">
            <summary>{t(linked ? "connectionDetails" : "needHelp")}</summary>
            <div className="disclosure-body form-stack">
              {linked ? (
                <>
                  <p>
                    {state.name}
                    {device ? ` · ${device.device_name}` : ""}
                  </p>
                  {state.lastUid && (
                    <p className="hint">
                      {t.rich(
                        "lastTag",
                        { code: (text) => <code>{text}</code> },
                        { uid: state.lastUid },
                      )}
                    </p>
                  )}
                  <button className="secondary" onClick={disconnect}>
                    {t("disconnect")}
                  </button>
                </>
              ) : (
                <>
                  <p>
                    {t.rich("firmware", {
                      b: (text) => <strong>{text}</strong>,
                    })}
                  </p>
                  <p className="hint">
                    {state.supported === false
                      ? t("wifiNote")
                      : t("browserNote")}
                  </p>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
