"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { useT } from "./i18n";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
  buttonLabel,
  renderOption,
  renderValue,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  buttonLabel?: string;
  renderOption?: (option: SelectOption) => ReactNode;
  renderValue?: (option: SelectOption | undefined) => ReactNode;
}) {
  const t = useT("common");
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 180,
    maxHeight: 280,
  });
  const typeahead = useRef({ query: "", time: 0 });
  const selected = options.find((option) => option.value === value);
  const host =
    open && typeof document !== "undefined"
      ? (trigger.current?.closest("[data-select-portal], dialog[open]") ??
        document.body)
      : null;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      const menu = popup.current;
      if (!rect || !menu) return;
      const viewport = window.visualViewport;
      const top = (viewport?.offsetTop ?? 0) + 8;
      const left = (viewport?.offsetLeft ?? 0) + 8;
      const right = left + (viewport?.width ?? window.innerWidth) - 16;
      const bottom = top + (viewport?.height ?? window.innerHeight) - 16;
      const width = Math.min(Math.max(rect.width, 180), right - left);
      // Measure the rendered rows, including wrapped labels and touch sizing.
      menu.style.width = `${width}px`;
      const naturalHeight =
        menu.scrollHeight + menu.offsetHeight - menu.clientHeight;
      const below = Math.max(0, bottom - rect.bottom - 6);
      const above = Math.max(0, rect.top - top - 6);
      const height = Math.min(naturalHeight, 280);
      const opensAbove = below < height && above > below;
      const maxHeight = Math.min(280, opensAbove ? above : below);
      const renderedHeight = Math.min(height, maxHeight);
      setPosition({
        top: Math.max(
          top,
          Math.min(
            bottom - renderedHeight,
            opensAbove ? rect.top - renderedHeight - 6 : rect.bottom + 6,
          ),
        ),
        left: Math.max(left, Math.min(rect.left, right - width)),
        width,
        maxHeight,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, options]);

  useEffect(() => {
    if (!open) return;
    const option = popup.current?.querySelector<HTMLButtonElement>(
      `[data-select-index="${active}"]`,
    );
    option?.focus({ preventScroll: true });
    option?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !trigger.current?.contains(target) &&
        !popup.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function openMenu(fromEnd = false) {
    if (disabled || !options.length) return;
    const selectedIndex = options.findIndex((option) => option.value === value);
    const edge = fromEnd
      ? options.findLastIndex((option) => !option.disabled)
      : options.findIndex((option) => !option.disabled);
    if (edge < 0) return;
    setActive(
      !fromEnd && selectedIndex >= 0 && !options[selectedIndex].disabled
        ? selectedIndex
        : edge,
    );
    typeahead.current = { query: "", time: 0 };
    setOpen(true);
  }

  function closeMenu(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeMenu();
  }

  function move(delta: number) {
    let next = active;
    for (let step = 0; step < options.length; step++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) {
        setActive(next);
        break;
      }
    }
  }

  function searchOptions(key: string) {
    const time = Date.now();
    const query =
      (time - typeahead.current.time < 700 ? typeahead.current.query : "") +
      key.toLowerCase();
    typeahead.current = { query, time };
    const repeated = [...query].every((character) => character === query[0]);
    const prefix = repeated ? query[0] : query;
    for (let step = 0; step < options.length; step++) {
      const index = (active + step + (repeated ? 1 : 0)) % options.length;
      if (
        !options[index].disabled &&
        options[index].label.toLowerCase().startsWith(prefix)
      ) {
        setActive(index);
        break;
      }
    }
  }

  function leaveMenu(backward: boolean) {
    const origin = trigger.current;
    if (!origin) return;
    const scope =
      origin.closest("[data-select-portal], dialog[open]") ?? document.body;
    const focusable = Array.from(
      scope.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, summary, [tabindex]",
      ),
    )
      .filter(
        (element) =>
          !popup.current?.contains(element) && element.getClientRects().length,
      )
      .filter(
        (element) =>
          element.tabIndex >= 0 &&
          !element.matches(":disabled") &&
          !element.closest("[inert]") &&
          getComputedStyle(element).visibility !== "hidden",
      );
    const next = focusable[focusable.indexOf(origin) + (backward ? -1 : 1)];
    setOpen(false);
    (next ?? origin).focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={`custom-select-trigger ${className}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            if (open) move(event.key === "ArrowDown" ? 1 : -1);
            else openMenu(event.key === "ArrowUp");
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            event.stopPropagation();
            closeMenu();
          }
        }}
      >
        <span>
          {renderValue
            ? renderValue(selected)
            : (buttonLabel ?? selected?.label ?? t("chooseOption"))}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open &&
        host &&
        createPortal(
          <div
            ref={popup}
            id={id}
            className="custom-select-popup"
            role="listbox"
            aria-label={ariaLabel}
            style={position}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                move(event.key === "ArrowDown" ? 1 : -1);
              } else if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                const index =
                  event.key === "Home"
                    ? options.findIndex((option) => !option.disabled)
                    : options.findLastIndex((option) => !option.disabled);
                if (index >= 0) setActive(index);
              } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                choose(active);
              } else if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                closeMenu();
              } else if (event.key === "Tab") {
                event.preventDefault();
                leaveMenu(event.shiftKey);
              } else if (
                event.key.length === 1 &&
                /\S/.test(event.key) &&
                !event.ctrlKey &&
                !event.metaKey &&
                !event.altKey
              ) {
                event.preventDefault();
                searchOptions(event.key);
              }
            }}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                role="option"
                data-select-index={index}
                data-option-value={option.value}
                className="custom-select-option"
                aria-selected={option.value === value}
                tabIndex={index === active ? 0 : -1}
                disabled={option.disabled}
                onClick={() => choose(index)}
              >
                <span>
                  {renderOption ? renderOption(option) : option.label}
                </span>
                {option.value === value && (
                  <Check size={15} aria-hidden="true" />
                )}
              </button>
            ))}
          </div>,
          host,
        )}
    </>
  );
}
