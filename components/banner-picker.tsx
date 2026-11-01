"use client";
import { useRef, useState } from "react";
import { Check, ImageUp, Trash2 } from "lucide-react";
import type { Period } from "@/types";
import { classColors, classThemes, themeImage } from "@/lib/class-themes";
import { useClassBanners } from "./class-banners";
import { useClassroom } from "./context";
import { Modal } from "./ui";
import { useLocalize, useT } from "./i18n";

// "math" → "themeMath", "Blue" → "colorBlue".
const cap = (text: string) => text[0].toUpperCase() + text.slice(1);

/** Choose a class's banner: a built-in theme or an uploaded photo. */
export function BannerPicker({
  period,
  close,
}: {
  period: Period;
  close: () => void;
}) {
  const { notify } = useClassroom();
  const t = useT("banners");
  const localize = useLocalize();
  type Key = Parameters<typeof t>[0];
  const themeName = (id: string) => t(`theme${cap(id)}` as Key);
  const colorName = (name: string) => t(`color${name}` as Key);
  const banners = useClassBanners();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const current = banners.banner(period);
  const custom = current.custom;
  const failed = (cause: unknown) =>
    setError(
      cause instanceof Error ? localize(cause.message) : t("saveFailed"),
    );
  return (
    <Modal title={t("title")} className="banner-modal" close={close}>
      <div className="banner-picker">
        <p className="hint">
          {t("intro", { name: period.name })}
          {t(banners.synced ? "synced" : "local")}
        </p>
        <div
          className="banner-preview"
          style={current.style}
          role="img"
          aria-label={t("current", {
            name: custom ? t("yourPhoto") : themeName(current.theme.id),
          })}
        >
          <strong>{period.name}</strong>
        </div>
        <fieldset className="banner-themes">
          <legend className="label">{t("themes")}</legend>
          {classThemes.map((theme) => {
            const selected = !custom && current.theme.id === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                className="banner-theme"
                aria-pressed={selected}
                style={{
                  backgroundColor: selected ? current.color : theme.color,
                  backgroundImage: `url("${themeImage(theme.id)}")`,
                }}
                onClick={() => {
                  setError("");
                  banners.chooseTheme(period.id, theme.id).catch(failed);
                }}
              >
                <span>{themeName(theme.id)}</span>
                {selected && <Check size={18} aria-hidden="true" />}
              </button>
            );
          })}
        </fieldset>
        <fieldset className="banner-colors">
          <legend className="label">{t("color")}</legend>
          {classColors.map((color) => {
            const selected = current.color === color.value;
            return (
              <button
                key={color.value}
                type="button"
                className="banner-color"
                aria-pressed={selected}
                aria-label={colorName(color.name)}
                title={colorName(color.name)}
                style={{ background: color.value }}
                onClick={() => {
                  setError("");
                  banners.chooseColor(period.id, color.value).catch(failed);
                }}
              >
                {selected && <Check size={18} aria-hidden="true" />}
              </button>
            );
          })}
        </fieldset>
        <div className="banner-upload">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            tabIndex={-1}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError("");
              try {
                await banners.upload(period.id, file);
                notify(t("photoSaved"));
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? localize(cause.message)
                    : t("photoFailed"),
                );
              } finally {
                event.target.value = "";
                setBusy(false);
              }
            }}
          />
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => input.current?.click()}
          >
            <ImageUp size={17} aria-hidden="true" />
            {t(busy ? "saving" : custom ? "changePhoto" : "uploadPhoto")}
          </button>
          {custom && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await banners.removeUpload(period.id);
                } catch (cause) {
                  failed(cause);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 size={17} aria-hidden="true" /> {t("removePhoto")}
            </button>
          )}
          <small>{t("photoLimits")}</small>
        </div>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="primary" onClick={close}>
            {t("done")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
