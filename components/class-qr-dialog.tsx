"use client";
import { useEffect, useRef, useState } from "react";
import { DialogHead } from "./ui";
import { useT } from "./i18n";

type QrDetails = {
  image: string;
  url: string;
  date: string;
  className: string;
  open: boolean;
  periodNumber: number;
  name: string;
  rotateSeconds: number;
};

export function ClassQrDialog({
  periodId,
  close,
}: {
  periodId: string;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const t = useT("qr");
  const loadFailed = t("loadFailed");
  const [details, setDetails] = useState<QrDetails | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const element = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    element?.querySelector<HTMLButtonElement>(".modal-head > button")?.focus();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The code changes every few seconds, so a photo of it soon stops working.
    const load = () =>
      fetch(`/api/class-qr?class=${encodeURIComponent(periodId)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || loadFailed);
          setDetails(result as QrDetails);
          setError("");
          timer = setTimeout(load, (result.rotateSeconds || 20) * 1000);
        })
        .catch((cause) => {
          if (controller.signal.aborted) return;
          setError(cause instanceof Error ? cause.message : loadFailed);
          // Keep trying quietly after a dropped connection.
          timer = setTimeout(load, 10_000);
        });
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
      element?.close();
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      });
    };
  }, [periodId]);

  const className = details
    ? t("className", { number: details.periodNumber, name: details.name })
    : "";
  return (
    <dialog
      ref={dialog}
      className="class-qr-dialog"
      aria-labelledby="class-qr-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <DialogHead
        id="class-qr-title"
        title={t("title")}
        closeLabel={t("close")}
        close={close}
      >
        {details && (
          <p>
            {className} · {details.date}
          </p>
        )}
      </DialogHead>
      {!details && !error && <p role="status">{t("making")}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {details && (
        <>
          <div className="class-qr-image">
            <img
              src={details.image}
              alt={t("imageAlt", { name: className })}
              width="360"
              height="360"
            />
          </div>
          <p className="class-qr-status">
            {t(details.open ? "open" : "closed")}{" "}
            {t("rotates", { seconds: details.rotateSeconds })}
          </p>
        </>
      )}
    </dialog>
  );
}
