"use client";
import { useState } from "react";
import { Plus, ScanLine } from "lucide-react";
import { scanMessage } from "@/lib/bluetooth/protocol";
import { ScannerDestination } from "./scanner-destination";
import { useClassroom } from "./context";
import { BluetoothPanel } from "./bluetooth-panel";
import { FastLink as Link } from "./fast-link";
import { CustomSelect } from "./custom-select";
import { useIntl, useLocalize, useT } from "./i18n";

export function ScannerView() {
  const { s, mutate, refresh, notify } = useClassroom();
  const t = useT("scanner");
  const localize = useLocalize();
  const intl = useIntl();
  const [adding, setAdding] = useState(false);
  const [secret, setSecret] = useState("");
  const [createdIdentifier, setCreatedIdentifier] = useState("");
  const [uid, setUid] = useState(s.rfid_tags.find((t) => t.active)?.uid ?? "");
  const [selectedDevice, setSelectedDevice] = useState("");
  const [result, setResult] = useState<{
    message: string;
    success: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const devices = s.devices.filter((d) => d.active);
  const deviceId =
    devices.find((d) => d.id === selectedDevice)?.id ?? devices[0]?.id ?? "";
  const tags = s.rfid_tags.filter(
    (t) =>
      t.active &&
      s.students.some(
        (student) => student.id === t.student_id && student.active,
      ),
  );
  const enrolling = devices.filter(
    (d) => d.enrollment_until && d.enrollment_until > new Date().toISOString(),
  );

  return (
    <>
      <BluetoothPanel />
      <ScannerDestination />
      {enrolling.map((device) => (
        <div className="notice info enrollment-reminder" key={device.id}>
          <p>
            {t.rich(
              "assigning",
              { b: (text) => <strong>{text}</strong> },
              {
                name: device.device_name,
              },
            )}
          </p>
          <button
            className="secondary"
            onClick={() =>
              mutate({
                action: "enrollment",
                device_id: device.id,
                enabled: false,
              }).catch(() => {})
            }
          >
            {t("resume")}
          </button>
        </div>
      ))}
      {s.simulator && (
        <details className="card settings-disclosure practice-scanner">
          <summary>{t("practice")}</summary>
          <div className="disclosure-body form-stack">
            <p className="muted">{t("practiceIntro")}</p>
            <div className="form-row">
              {devices.length > 1 && (
                <label>
                  {t("scanner")}
                  <CustomSelect
                    ariaLabel={t("practiceScanner")}
                    value={deviceId}
                    onChange={setSelectedDevice}
                    options={devices.map((device) => ({
                      value: device.id,
                      label: device.device_name,
                    }))}
                  />
                </label>
              )}
              <label>
                {t("student")}
                <CustomSelect
                  ariaLabel={t("practiceStudent")}
                  value={uid}
                  onChange={setUid}
                  options={[
                    { value: "", label: t("chooseStudent") },
                    ...tags.map((tag) => ({
                      value: tag.uid,
                      label:
                        s.students.find(
                          (student) => student.id === tag.student_id,
                        )?.display_name ?? tag.uid,
                    })),
                    { value: "FFFFFFFF", label: t("unassignedTag") },
                    ...(uid &&
                    uid !== "FFFFFFFF" &&
                    !tags.some((tag) => tag.uid === uid)
                      ? [{ value: uid, label: t("customTag") }]
                      : []),
                  ]}
                />
              </label>
            </div>
            <button
              className="primary"
              disabled={!deviceId || !uid || busy}
              onClick={async () => {
                setBusy(true);
                setResult(null);
                try {
                  const response = await fetch("/api/simulate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ deviceId, uid }),
                  });
                  const body = await response.json();
                  setResult({
                    message:
                      typeof body.status === "string"
                        ? localize(
                            scanMessage(
                              body.status,
                              typeof body.student === "string"
                                ? body.student
                                : undefined,
                            ),
                          )
                        : t("tapFailed"),
                    success: body.success === true,
                  });
                  await refresh();
                } catch {
                  setResult({
                    message: t("tapFailed"),
                    success: false,
                  });
                } finally {
                  setBusy(false);
                }
              }}
            >
              <ScanLine size={17} />
              {t(busy ? "checkingIn" : "tryTap")}
            </button>
            {/* Reserved slot so the result never moves the section below. */}
            <p
              className={
                result
                  ? `scan-feedback${result.success ? "" : " error"}`
                  : "scan-feedback-slot"
              }
              role="status"
            >
              {result?.message}
            </p>
            <details className="settings-disclosure">
              <summary>{t("testTag")}</summary>
              <div className="disclosure-body">
                <label>
                  {t("tagNumber")}
                  <input
                    value={uid}
                    onChange={(e) => setUid(e.target.value)}
                    placeholder={t("tagPlaceholder")}
                  />
                </label>
              </div>
            </details>
          </div>
        </details>
      )}
      <details
        className="card settings-disclosure scanner-settings"
        open={!devices.length || undefined}
      >
        <summary>{t("settings")}</summary>
        <div className="disclosure-body form-stack">
          <p className="muted">{t("settingsIntro")}</p>
          {s.devices.map((device) => (
            <div className="scanner-setting-row" key={device.id}>
              <div>
                <strong>{device.device_name}</strong>
                <p className="hint">
                  {device.last_seen_at
                    ? t("lastConnected", {
                        time: new Date(device.last_seen_at).toLocaleString(
                          intl,
                        ),
                      })
                    : t("notConnectedYet")}
                </p>
              </div>
              <label className="inline-check">
                <input
                  type="checkbox"
                  checked={device.active}
                  onChange={(e) =>
                    mutate({
                      action: "deviceActive",
                      device_id: device.id,
                      active: e.target.checked,
                    }).catch(() => {})
                  }
                />
                {t("enabled")}
              </label>
            </div>
          ))}
          {s.demo ? (
            <p className="hint">{t("demoScanner")}</p>
          ) : adding ? (
            <form
              className="form-stack inline-scanner-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = String(
                  new FormData(form).get("name") ?? "",
                ).trim();
                const identifier = `${
                  name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .slice(0, 50) || "scanner"
                }-${crypto.randomUUID().slice(0, 8)}`;
                setBusy(true);
                try {
                  const response = await mutate({
                    action: "device",
                    device_name: name,
                    device_identifier: identifier,
                  });
                  setSecret(String(response.secret));
                  setCreatedIdentifier(identifier);
                  setAdding(false);
                  notify(t("added"));
                } catch {
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                {t("scannerName")}
                <input
                  name="name"
                  placeholder={t("scannerNamePlaceholder")}
                  maxLength={100}
                  required
                  autoFocus
                />
              </label>
              <div className="bluetooth-controls">
                <button className="primary" disabled={busy}>
                  {t(busy ? "adding" : "add")}
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setAdding(false)}
                  disabled={busy}
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          ) : (
            <button className="secondary" onClick={() => setAdding(true)}>
              <Plus size={17} />
              {t("addAnother")}
            </button>
          )}
          {secret && (
            <details className="settings-disclosure">
              <summary>{t("wifiToken")}</summary>
              <div className="disclosure-body form-stack">
                <p>{t("wifiIntro")}</p>
                <label>
                  {t("deviceIdentifier")}
                  <input
                    readOnly
                    value={createdIdentifier}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <label>
                  {t("secretToken")}
                  <input
                    readOnly
                    value={secret}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <button className="secondary" onClick={() => setSecret("")}>
                  {t("dismissToken")}
                </button>
              </div>
            </details>
          )}
          {s.devices.length > 0 && (
            <details className="settings-disclosure">
              <summary>{t("technical")}</summary>
              <div className="disclosure-body form-stack">
                {s.devices.map((device) => (
                  <p key={device.id}>
                    {device.device_name}:{" "}
                    <code>{device.device_identifier}</code>
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      </details>
    </>
  );
}
