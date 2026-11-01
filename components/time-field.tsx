"use client";

import { useId, useRef, useState } from "react";
import { Clock3 } from "lucide-react";
import { normalizeTimeInput } from "@/lib/time-input";
import { TimePicker } from "./time-picker";
import { useT } from "./i18n";

type TimeFieldProps = {
  label: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  customPicker?: boolean;
};

export function TimeField({
  label,
  ariaLabel = label,
  value,
  onChange,
  disabled = false,
  required = false,
  customPicker = false,
}: TimeFieldProps) {
  const id = useId();
  const t = useT("pickers");
  const pickerRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const normalized = normalizeTimeInput(value);

  function openPicker() {
    if (customPicker) {
      setPickerOpen(!pickerOpen);
      return;
    }
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      picker.focus();
      picker.click();
    }
  }

  return (
    <div className="time-field">
      <label htmlFor={`${id}-typed`}>{label}</label>
      <div
        className={`time-field-controls${value !== "" && !normalized ? " invalid" : ""}`}
      >
        <input
          id={`${id}-typed`}
          type="text"
          inputMode="text"
          autoComplete="off"
          placeholder="8:45 AM"
          value={value}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (normalized && normalized !== value) onChange(normalized);
          }}
          aria-invalid={value !== "" && !normalized}
          required={required}
          disabled={disabled}
        />
        {!customPicker && (
          <input
            ref={pickerRef}
            className="native-time-picker"
            type="time"
            value={normalized ?? ""}
            onChange={(event) => onChange(event.target.value)}
            aria-hidden="true"
            tabIndex={-1}
            disabled={disabled}
          />
        )}
        <button
          ref={triggerRef}
          type="button"
          className="time-picker-trigger"
          aria-label={t("pickTime", { label: ariaLabel.toLowerCase() })}
          title={t("openTimePicker")}
          aria-haspopup={customPicker ? "dialog" : undefined}
          aria-expanded={customPicker ? pickerOpen : undefined}
          aria-controls={
            customPicker && pickerOpen ? `${id}-picker` : undefined
          }
          onClick={openPicker}
          disabled={disabled}
        >
          <Clock3 size={17} aria-hidden="true" />
        </button>
      </div>
      {customPicker && pickerOpen && !disabled && triggerRef.current && (
        <TimePicker
          id={`${id}-picker`}
          anchor={triggerRef.current}
          label={ariaLabel}
          value={normalized ?? "08:00"}
          onApply={onChange}
          onClose={(restoreFocus = true) => {
            setPickerOpen(false);
            if (restoreFocus) triggerRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
