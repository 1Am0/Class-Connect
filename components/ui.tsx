"use client";
import { useEffect, useRef, useId, useState } from "react";
import { MoreHorizontal, X } from "lucide-react";
import type { Status, Student } from "@/types";
import { useT } from "./i18n";
export function Avatar({ student }: { student: Student }) {
  return (
    <span className={"avatar tone-" + (student.first_name.charCodeAt(0) % 5)}>
      {student.first_name[0]}
      {student.last_name[0]}
    </span>
  );
}
export function Badge({ status }: { status: Status }) {
  const t = useT("common");
  return (
    <span className={"badge " + status}>
      <span />
      {t(status)}
    </span>
  );
}
export type StatusCounts = Record<Status, number>;
// Decorative proportion bar; callers always show the counts as text too.
export function StatusBar({ counts }: { counts: StatusCounts }) {
  const total =
    counts.present + counts.late + counts.excused + counts.absent || 1;
  return (
    <span className="status-bar" aria-hidden="true">
      {(["present", "late", "excused", "absent"] as const).map((key) =>
        counts[key] ? (
          <span
            key={key}
            className={key}
            style={{ flexGrow: counts[key] / total }}
          />
        ) : null,
      )}
    </span>
  );
}
export function Modal({
  title,
  children,
  close,
  className,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressStartedOutside = useRef(false);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={className}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onPointerDown={(e) => {
        pressStartedOutside.current = outsideDialog(e);
      }}
      onClick={(e) => {
        // Only a press that starts and ends on the backdrop dismisses, so a
        // text selection dragged past the edge never discards a form.
        const outside = pressStartedOutside.current && outsideDialog(e);
        pressStartedOutside.current = false;
        if (outside) close();
      }}
    >
      <DialogHead id={titleId} title={title} close={close} />
      {children}
    </dialog>
  );
}
/** Every dialog's header: its title, and × to close it. */
export function DialogHead({
  id,
  title,
  close,
  closeLabel,
  disabled,
  children,
}: {
  id: string;
  title: React.ReactNode;
  close: () => void;
  closeLabel?: string;
  disabled?: boolean;
  /** A line under the title, such as the class and date. */
  children?: React.ReactNode;
}) {
  const t = useT("common");
  return (
    <div className="modal-head">
      <div className="modal-title">
        <h2 id={id}>{title}</h2>
        {children}
      </div>
      <button
        type="button"
        aria-label={closeLabel ?? t("closeDialog")}
        className="icon-button"
        disabled={disabled}
        onClick={close}
      >
        <X size={20} />
      </button>
    </div>
  );
}
function outsideDialog(event: React.MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}
/** A "⋯" button that opens a short list of less-used actions. */
export function ActionMenu({
  label,
  items,
  className,
}: {
  label: string;
  items: {
    label: string;
    icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
    onSelect: () => void;
  }[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ top: 0, right: 0 });
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    // Outside presses, scrolling and resizing all close it, like a native menu.
    const dismiss = (event: Event) => {
      const target = event.target as Node;
      if (menu.current?.contains(target) || trigger.current?.contains(target))
        return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);
  function toggle() {
    const box = trigger.current?.getBoundingClientRect();
    if (box)
      setPlace({
        top: box.bottom + 6,
        right: Math.max(8, window.innerWidth - box.right),
      });
    setOpen((value) => !value);
  }
  function onMenuKey(event: React.KeyboardEvent) {
    const all = [
      ...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []),
    ];
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      all[(at + step + all.length) % all.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      all[event.key === "Home" ? 0 : all.length - 1]?.focus();
    }
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={"secondary action-menu-trigger " + (className ?? "")}
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={toggle}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          ref={menu}
          id={menuId}
          role="menu"
          aria-label={label}
          className="action-menu"
          style={{ top: place.top, right: place.right }}
          onKeyDown={onMenuKey}
        >
          {items.map(({ label: itemLabel, icon: Icon, onSelect }) => (
            <button
              key={itemLabel}
              type="button"
              role="menuitem"
              className="action-menu-item"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
            >
              <Icon size={17} aria-hidden={true} />
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
/** A friendly empty state: an icon in the page color and the next step. */
export function Empty({
  title,
  body,
  icon: Icon,
  action,
}: {
  title: string;
  body: string;
  icon?: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      {Icon && (
        <span className="empty-art">
          <Icon size={30} aria-hidden={true} />
        </span>
      )}
      <h3>{title}</h3>
      <p>{body}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}
export function localTime(
  value: string | null,
  timezone: string,
  intl = "en-US",
) {
  return value
    ? new Date(value).toLocaleTimeString(intl, {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
}
// Google's standard "G" mark, unmodified, as its sign-in branding guidelines require.
export function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
