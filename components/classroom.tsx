"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import {
  Dices,
  GraduationCap,
  History,
  ScanLine,
  Settings,
  Check,
  LogOut,
  Menu,
  X,
  ChevronDown,
  House,
  CircleHelp,
  Pencil,
  QrCode,
  Palette,
} from "lucide-react";
import type { Attendance, Period, Snapshot, Teacher } from "@/types";
import { activePeriod, recordsFor, schoolClock } from "@/lib/core";
import { effectiveTimeFor } from "@/lib/weekly-schedule";
import { Context, type ClassroomContext, type ToastTone } from "./context";
import { AttendanceView } from "./attendance";
import { RandomView, GroupsView } from "./tools";
import { HomeClasses } from "./periods";
import { ContextBar } from "./context-bar";
import { ScannerFab } from "./scanner-fab";
import {
  ActivitySetsSidebar,
  ClassEditor,
  ClassQrDialog,
  ConversationView,
  HelpCenter,
  MatchingView,
  RosterImportDialog,
  ScannerView,
  ScrambleView,
  SettingsView,
  preloadHelpCenter,
} from "./lazy";
import { useBluetooth } from "./bluetooth-provider";
import { FastLink as Link } from "./fast-link";
import { CustomSelect } from "./custom-select";
import { useClassBanners } from "./class-banners";
import { BannerPicker } from "./banner-picker";
import { ActionMenu } from "./ui";
import { useAttendanceSync } from "./attendance-sync-provider";
import { useIntl, useLocalize, useT } from "./i18n";
import { overlayPendingAttendance } from "@/lib/attendance-overlay";
import { withSampleSets } from "@/lib/sample-activity-sets";
import {
  registerLocalScan,
  type LocalScanHandler,
} from "@/lib/bluetooth/local-scan";

const navigation = [
  ["dashboard", "navHome", House],
  ["random", "navActivities", Dices],
  ["history", "navHistory", History],
] as const;
const activityTabs = [
  ["random", "tabRandom"],
  ["groups", "tabGroups"],
  ["conversation", "tabConversation"],
  ["scramble", "tabScramble"],
  ["matching", "tabMatching"],
] as const;
const setupNavigation = [
  ["scanner", "navScanner", ScanLine],
  ["settings", "navSettings", Settings],
] as const;
type ShellKey = Parameters<ReturnType<typeof useT<"shell">>>[0];
const headings: Record<string, [ShellKey, ShellKey | ""]> = {
  dashboard: ["headingHome", "headingHomeBody"],
  classes: ["headingClasses", "headingClassesBody"],
  attendance: ["headingAttendance", ""],
  random: ["headingActivities", ""],
  groups: ["headingActivities", ""],
  conversation: ["headingActivities", ""],
  scramble: ["headingActivities", ""],
  matching: ["headingActivities", ""],
  history: ["headingHistory", ""],
  scanner: ["headingScanner", ""],
  settings: ["headingSettings", ""],
};
export function formatClassTime(value: string, intl = "en-US") {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  return new Date(2020, 0, 1, hour, minute).toLocaleTimeString(intl, {
    hour: "numeric",
    minute: "2-digit",
  });
}
function ClassHeading({
  period,
  teacher,
  date,
}: {
  period: Period;
  teacher: Teacher;
  date: string;
}) {
  const time = effectiveTimeFor(teacher, period, date);
  const t = useT("shell");
  const common = useT("common");
  const intl = useIntl();
  return (
    <div className="page-heading-title class-heading">
      <span className="eyebrow">
        {common("period", { number: period.period_number })} ·{" "}
        {time
          ? `${formatClassTime(time.start_time, intl)}–${formatClassTime(time.end_time, intl)}`
          : t("doesNotMeetToday")}
      </span>
      <h1 tabIndex={-1}>{period.name}</h1>
    </div>
  );
}
export function Classroom({
  initial,
  supabase,
}: {
  initial: Snapshot;
  supabase: { url: string; key: string } | null;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useT("shell");
  const common = useT("common");
  const localize = useLocalize();
  const view = pathname.split("/")[1] || "dashboard";
  const classId = searchParams.get("class") ?? undefined;
  const bluetooth = useBluetooth();
  const banners = useClassBanners();
  const [customizing, setCustomizing] = useState(false);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const [s, setS] = useState(initial),
    [toast, setToast] = useState<{ text: string; tone: ToastTone } | null>(
      null,
    ),
    [mobile, setMobile] = useState(false),
    [mobileViewport, setMobileViewport] = useState(false),
    [sidebarCollapsed, setSidebarCollapsed] = useState(false),
    [editingClassId, setEditingClassId] = useState<string | null>(null),
    [importClassId, setImportClassId] = useState<string | null>(null),
    [qrClassId, setQrClassId] = useState<string | null>(null),
    [helpOpen, setHelpOpen] = useState(false),
    [helpMounted, setHelpMounted] = useState(false),
    [classesOpen, setClassesOpen] = useState(
      view === "attendance" || view === "classes",
    ),
    [setupOpen, setSetupOpen] = useState(
      setupNavigation.some(([route]) => route === view),
    ),
    [syncError, setSyncError] = useState(false),
    [syncing, setSyncing] = useState(false),
    [clock, setClock] = useState(Date.now());
  // Called on every local change, so a cloud refresh already in flight
  // (which started before the change) is not shown over it.
  const supersedeRefresh = useRef(() => {});
  const attendanceSync = useAttendanceSync(
    initial.teacher.id,
    (operation, record) => {
      supersedeRefresh.current();
      setS((current) => {
        const sessions = [...current.attendance_sessions];
        if (
          !sessions.some(
            (session) => session.id === record.attendance_session_id,
          )
        )
          sessions.push({
            id: record.attendance_session_id,
            teacher_id: operation.teacher_id,
            period_id: operation.period_id,
            date: operation.date,
            started_at: operation.at,
            ended_at: null,
            status: "open",
          });
        const records = current.attendance_records.filter(
          (item) =>
            !(
              item.attendance_session_id === record.attendance_session_id &&
              item.student_id === record.student_id
            ),
        );
        records.push(record as Attendance);
        return {
          ...current,
          attendance_sessions: sessions,
          attendance_records: records,
        };
      });
    },
  );
  const receiveBanners = useRef(banners.receive);
  receiveBanners.current = banners.receive;
  // Another browser's banner changes arrive with the realtime refresh.
  useEffect(() => {
    if (s.teacher.class_banners)
      receiveBanners.current(s.teacher.class_banners);
  }, [s.teacher.class_banners]);
  const visibleSnapshot = useMemo(
    () => overlayPendingAttendance(s, attendanceSync.items),
    [s, attendanceSync.items],
  );
  // Changes normally sync within a moment; only ones still waiting show.
  const queuedAttendance = attendanceSync.items.filter(
    (item) => item.state === "pending",
  );
  const [, setQueueTick] = useState(0);
  const hasQueued = queuedAttendance.length > 0;
  useEffect(() => {
    if (!hasQueued) return;
    const timer = setInterval(() => setQueueTick((tick) => tick + 1), 2000);
    return () => clearInterval(timer);
  }, [hasQueued]);
  const waitingAttendance = queuedAttendance.filter(
    (item) => Date.now() - item.queued_order / 1000 > 4000,
  );
  const notify = useCallback(
    (text: string, tone: ToastTone = "info") =>
      setToast({ text: localize(text), tone }),
    [localize],
  );
  const localScan = useRef<LocalScanHandler>(async () => null);
  localScan.current = async (deviceId, uid) => {
    const now = new Date();
    const at = now.toISOString();
    const device = visibleSnapshot.devices.find(
      (item) => item.id === deviceId && item.active,
    );
    if (!device || (device.enrollment_until && device.enrollment_until > at))
      return null;
    const tag = visibleSnapshot.rfid_tags.find(
      (item) => item.uid === uid && item.active,
    );
    const student = visibleSnapshot.students.find(
      (item) => item.id === tag?.student_id && item.active,
    );
    const period = activePeriod(
      visibleSnapshot.teacher,
      visibleSnapshot.periods,
      now,
    );
    if (
      !tag ||
      !student ||
      !period ||
      !visibleSnapshot.period_students.some(
        (item) =>
          item.period_id === period.id && item.student_id === student.id,
      )
    )
      return null;
    const date = schoolClock(visibleSnapshot.teacher.timezone, now).date;
    const existing =
      recordsFor(visibleSnapshot, period.id, date).find(
        (item) => item.student_id === student.id,
      ) ?? null;
    const pending = attendanceSync.items.some(
      (item) =>
        item.student_id === student.id &&
        item.period_id === period.id &&
        item.date === date &&
        item.state === "pending" &&
        (item.status === "present" || item.status === "late"),
    );
    if (pending)
      return {
        success: true,
        status: "queued_locally",
        student: student.display_name,
      };
    if (
      existing &&
      (existing.status === "present" || existing.status === "late")
    )
      return {
        success: true,
        status: "already_checked_in",
        student: student.display_name,
      };
    await attendanceSync.enqueue({
      operation_id: crypto.randomUUID(),
      action: "scan",
      device_id: deviceId,
      tag_id: tag.id,
      student_id: student.id,
      period_id: period.id,
      date,
      at,
      status: "present",
      expected: existing,
    });
    return {
      success: true,
      status: "queued_locally",
      student: student.display_name,
    };
  };
  useEffect(
    () =>
      registerLocalScan((deviceId, uid) => localScan.current(deviceId, uid)),
    [],
  );
  const inFlight = useRef(false);
  const refreshPending = useRef(false);
  supersedeRefresh.current = () => {
    if (inFlight.current) refreshPending.current = true;
  };
  const sidebarRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLButtonElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const updateViewport = () => {
      if (media.matches && sidebarRef.current?.contains(document.activeElement))
        mobileMenuRef.current?.focus({ preventScroll: true });
      setMobileViewport(media.matches);
      setMobile(false);
    };
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);
  useEffect(() => {
    if (!mobile || !mobileViewport) return;
    const sidebar = sidebarRef.current;
    const opener = mobileMenuRef.current;
    if (!sidebar) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    mobileCloseRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setMobile(false);
      } else if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (!sidebar.contains(event.target as Node))
        mobileCloseRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocus);
      document.body.style.overflow = previousOverflow;
      if (
        window.matchMedia("(max-width: 720px)").matches &&
        opener?.isConnected
      )
        opener.focus({ preventScroll: true });
    };
  }, [mobile, mobileViewport]);
  const refresh = useCallback(async () => {
    if (inFlight.current) {
      refreshPending.current = true;
      return;
    }
    inFlight.current = true;
    setSyncing(true);
    try {
      do {
        refreshPending.current = false;
        try {
          const r = await fetch("/api/state", { cache: "no-store" });
          if (r.status === 401) {
            window.location.href = "/login";
            return;
          }
          if (!r.ok) throw new Error();
          const latest = await r.json();
          // A local change made while this was loading makes it out of date;
          // load again instead of showing the older cloud copy over it.
          if (!refreshPending.current) setS(latest);
          setSyncError(false);
        } catch {
          setSyncError(true);
        }
      } while (refreshPending.current);
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, []);
  useEffect(() => {
    const onScan = () => void refresh();
    let focusTimer: ReturnType<typeof setTimeout> | undefined;
    const onFocus = () => {
      clearTimeout(focusTimer);
      focusTimer = setTimeout(() => void refresh(), 150);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("classroom-attendance-updated", onScan);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    let cleanup = () => {};
    if (!initial.demo && supabase) {
      const db = createBrowserClient(supabase.url, supabase.key);
      const channel = db.channel(`classroom-updates-${initial.teacher.id}`);
      let refreshTimer: ReturnType<typeof setTimeout> | undefined;
      const onChange = () => {
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(() => void refresh(), 200);
      };
      for (const table of [
        "periods",
        "students",
        "period_students",
        "rfid_tags",
        "attendance_sessions",
        "attendance_records",
        "teachers",
      ]) {
        const filter = `${table === "teachers" ? "id" : "teacher_id"}=eq.${initial.teacher.id}`;
        for (const event of ["INSERT", "UPDATE"] as const)
          channel.on(
            "postgres_changes",
            { event, schema: "public", table, filter },
            onChange,
          );
        // Postgres Changes cannot filter DELETE payloads by teacher_id.
        channel.on(
          "postgres_changes",
          { event: "DELETE", schema: "public", table },
          onChange,
        );
      }
      let subscribed = false;
      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        if (subscribed) onChange(); // Catch changes missed while reconnecting.
        subscribed = true;
      });
      cleanup = () => {
        clearTimeout(refreshTimer);
        void db.removeChannel(channel);
      };
    }
    return () => {
      window.removeEventListener("classroom-attendance-updated", onScan);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(focusTimer);
      clearInterval(timer);
      cleanup();
    };
  }, [refresh, initial.demo, initial.teacher.id, supabase]);
  useEffect(() => {
    try {
      setSidebarCollapsed(
        window.localStorage.getItem("classroom-sidebar-collapsed") === "true",
      );
    } catch {
      // Keep the sidebar usable when storage is unavailable.
    }
  }, []);
  useEffect(() => {
    if (view === "attendance" || view === "classes") setClassesOpen(true);
    if (setupNavigation.some(([route]) => route === view)) setSetupOpen(true);
  }, [view]);
  useEffect(() => setEditingClassId(null), [classId, view]);
  useEffect(() => {
    if (!toast) return;
    // Problems stay up longer than confirmations and can be closed sooner.
    const t = setTimeout(
      () => setToast(null),
      toast.tone === "error" ? 9000 : 4500,
    );
    return () => clearTimeout(t);
  }, [toast]);
  const home = view === "dashboard" || view === "periods";
  const managing = view === "classes";
  const classView = view === "attendance";
  const activities = [
    "random",
    "groups",
    "conversation",
    "scramble",
    "matching",
  ].includes(view);
  const setupView = setupNavigation.some(([route]) => route === view);
  const date = schoolClock(s.teacher.timezone, new Date(clock)).date;
  const current = activePeriod(s.teacher, s.periods, new Date(clock));
  const classes = [...s.periods].sort(
    (a, b) => a.period_number - b.period_number || a.name.localeCompare(b.name),
  );
  const activityClasses = classes.filter((item) => item.active);
  const requestedClass = classId
    ? s.periods.find((p) => p.id === classId)
    : undefined;
  const period =
    home || managing
      ? undefined
      : classId
        ? view === "history" || requestedClass?.active
          ? requestedClass
          : undefined
        : classView
          ? (current ?? classes.find((p) => p.active))
          : (current ??
            (activities
              ? activityClasses[0]
              : view === "history"
                ? classes[0]
                : undefined));
  const periodId = period?.id ?? "";
  // One color threads through each page: the class banner's on class pages.
  const classBanner =
    period && (classView || activities || view === "history")
      ? banners.banner(period)
      : null;
  const pageColor = classBanner?.color ?? "var(--accent-banner)";
  const selectedSetId = searchParams.get("set");
  const activitySets = withSampleSets(s.activity_sets);
  const selectedSet = activitySets.find((set) => set.id === selectedSetId);
  const activityKind =
    view === "conversation"
      ? "conversation"
      : view === "scramble"
        ? "scramble"
        : view === "matching"
          ? "vocabulary"
          : null;
  const gameSet = activityKind
    ? selectedSet?.kind === activityKind
      ? selectedSet
      : activitySets.find((set) => set.kind === activityKind)
    : undefined;
  const classLabel = (item: Period) =>
    t(item.active ? "className" : "classNameArchived", {
      number: item.period_number,
      name: item.name,
    });
  const className = period ? classLabel(period) : t("noClassSelected");
  const activeNav = home ? "dashboard" : activities ? "random" : view;
  const menuCollapsed = sidebarCollapsed && !mobile;
  const classHref = (id: string) =>
    `/attendance?class=${encodeURIComponent(id)}`;
  const sectionHref = (route: string) =>
    route === "dashboard"
      ? "/dashboard"
      : periodId
        ? `/${route}?class=${encodeURIComponent(periodId)}`
        : `/${route}`;
  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      window.localStorage.setItem("classroom-sidebar-collapsed", String(next));
    } catch {
      // The layout can still be toggled for this visit.
    }
  }
  function toggleClasses() {
    if (menuCollapsed) {
      toggleSidebar();
      setClassesOpen(true);
    } else setClassesOpen((open) => !open);
  }
  function toggleSetup() {
    if (menuCollapsed) {
      toggleSidebar();
      setSetupOpen(true);
    } else setSetupOpen((open) => !open);
  }
  const mutate = useCallback(
    async (body: object) => {
      try {
        supersedeRefresh.current();
        const r = await fetch("/api/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || t("saveFailed"));
        supersedeRefresh.current();
        await refresh();
        return j;
      } catch (error) {
        const message =
          error instanceof Error &&
          !(error instanceof TypeError) &&
          !(error instanceof SyntaxError)
            ? error.message
            : t("connectionInterrupted");
        notify(message, "error");
        throw new Error(message);
      }
    },
    [notify, refresh, t],
  );
  const contextValue = useMemo<ClassroomContext>(
    () => ({
      s: visibleSnapshot,
      periodId,
      date,
      notify,
      mutate,
      refresh,
      syncError,
      syncing,
      pendingAttendance: attendanceSync.items,
      enqueueAttendance: attendanceSync.enqueue,
      attendanceStorageError: attendanceSync.storageError,
      discardAttendanceConflict: attendanceSync.discardStudent,
    }),
    [
      visibleSnapshot,
      periodId,
      date,
      notify,
      mutate,
      refresh,
      syncError,
      syncing,
      attendanceSync.items,
      attendanceSync.enqueue,
      attendanceSync.storageError,
      attendanceSync.discardStudent,
    ],
  );
  function navLink([route, labelKey, Icon]:
    (typeof navigation)[number] | (typeof setupNavigation)[number]) {
    const label = t(labelKey);
    return (
      <Link
        key={route}
        href={sectionHref(route)}
        onClick={() => setMobile(false)}
        title={label}
        aria-label={label}
        aria-current={activeNav === route ? "page" : undefined}
        className={"sidebar-nav-link" + (activeNav === route ? " active" : "")}
      >
        <Icon size={20} aria-hidden="true" />
        <span className="nav-label">{label}</span>
      </Link>
    );
  }
  // Unknown routes render the app's not-found page on its own, not a fallback view.
  if (!(view in headings) && view !== "periods") return null;
  const mobileMenuButton = (
    <button
      ref={mobileMenuRef}
      type="button"
      className="mobile-menu icon-button"
      aria-label={t("openNavigation")}
      aria-controls="classroom-navigation"
      aria-expanded={mobile}
      onClick={() => setMobile(!mobile)}
    >
      <Menu />
    </button>
  );
  return (
    <Context.Provider value={contextValue}>
      <div
        className={
          "app-shell simple-classroom" +
          (sidebarCollapsed ? " sidebar-collapsed" : "")
        }
      >
        {mobile && (
          <button
            className="nav-backdrop"
            aria-label={t("closeNavigation")}
            tabIndex={-1}
            onClick={() => setMobile(false)}
          />
        )}
        <aside
          ref={sidebarRef}
          id="classroom-navigation"
          className={"sidebar " + (mobile ? "mobile-open" : "")}
          inert={mobileViewport && !mobile}
          role={mobileViewport && mobile ? "dialog" : undefined}
          aria-modal={mobileViewport && mobile ? true : undefined}
          aria-label={t("navClassroom")}
        >
          <div className="sidebar-header">
            <div className="brand desktop-brand">
              <button
                type="button"
                className="sidebar-brand-toggle"
                aria-label={t(
                  sidebarCollapsed ? "expandSidebar" : "collapseSidebar",
                )}
                title={t(
                  sidebarCollapsed ? "expandSidebar" : "collapseSidebar",
                )}
                aria-controls="classroom-sidebar-content"
                aria-expanded={!sidebarCollapsed}
                onClick={toggleSidebar}
              >
                <span className="brand-icon">
                  <Check size={23} />
                </span>
              </button>
              <Link
                href="/dashboard"
                className="brand-name"
                aria-label={t("brandHome")}
              >
                Class <span className="brand-connect">Connect</span>
              </Link>
            </div>
            <Link
              href="/dashboard"
              className="brand mobile-brand"
              aria-label={t("brandHome")}
              onClick={() => setMobile(false)}
            >
              <span className="brand-icon">
                <Check size={23} />
              </span>
              <span className="brand-name">
                Class <span className="brand-connect">Connect</span>
              </span>
            </Link>
            <button
              ref={mobileCloseRef}
              type="button"
              className="mobile-nav-close icon-button"
              aria-label={t("closeNavigation")}
              onClick={() => setMobile(false)}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <div id="classroom-sidebar-content" className="sidebar-content">
            <div className="sidebar-navigation">
              <nav aria-label={t("navMain")}>
                {navLink(navigation[0])}
                <div
                  className={
                    "sidebar-menu classes-navigation" +
                    (classesOpen ? " open" : "")
                  }
                >
                  <button
                    type="button"
                    className={
                      "sidebar-menu-toggle" +
                      (classView || managing ? " active" : "")
                    }
                    aria-label={t("navClasses")}
                    title={t("navClasses")}
                    aria-controls="classroom-class-links"
                    aria-expanded={!menuCollapsed && classesOpen}
                    onClick={toggleClasses}
                  >
                    <GraduationCap size={20} aria-hidden="true" />
                    <span className="nav-label">{t("navClasses")}</span>
                    <ChevronDown
                      className="nav-chevron"
                      size={16}
                      aria-hidden="true"
                    />
                  </button>
                  <nav
                    id="classroom-class-links"
                    className="sidebar-subnav class-links"
                    aria-label={t("navClasses")}
                  >
                    {classes.some((p) => p.active) ? (
                      classes
                        .filter((p) => p.active)
                        .map((p) => (
                          <Link
                            key={p.id}
                            href={classHref(p.id)}
                            className={
                              "class-nav-link" +
                              (classView && periodId === p.id ? " active" : "")
                            }
                            aria-current={
                              classView && periodId === p.id
                                ? "page"
                                : undefined
                            }
                            onClick={() => setMobile(false)}
                            title={classLabel(p)}
                          >
                            <span className="class-nav-copy">
                              <strong>
                                {common("period", { number: p.period_number })}
                              </strong>
                              <small>{p.name}</small>
                            </span>
                          </Link>
                        ))
                    ) : (
                      <span className="class-nav-empty">
                        {t("noActiveClasses")}
                      </span>
                    )}
                    <div className="class-nav-actions">
                      <Link
                        href="/classes"
                        onClick={() => setMobile(false)}
                        aria-current={managing ? "page" : undefined}
                        className={managing ? "active" : ""}
                        title={t("manageClasses")}
                      >
                        {t("manageClasses")}
                      </Link>
                    </div>
                  </nav>
                </div>
                {navigation.slice(1).map(navLink)}
              </nav>
              <div
                className={
                  "sidebar-menu setup-navigation" + (setupOpen ? " open" : "")
                }
              >
                <button
                  type="button"
                  className={
                    "sidebar-menu-toggle" + (setupView ? " active" : "")
                  }
                  aria-label={t("navSetup")}
                  title={t("navSetup")}
                  aria-controls="classroom-setup-links"
                  aria-expanded={menuCollapsed || setupOpen}
                  onClick={toggleSetup}
                >
                  <Settings size={20} aria-hidden="true" />
                  <span className="nav-label">{t("navSetup")}</span>
                  <ChevronDown
                    className="nav-chevron"
                    size={16}
                    aria-hidden="true"
                  />
                </button>
                <nav
                  id="classroom-setup-links"
                  className="sidebar-subnav setup-links"
                  aria-label={t("navClassroomSetup")}
                >
                  {setupNavigation.map(navLink)}
                </nav>
              </div>
            </div>
            <div className="sidebar-bottom">
              <button
                ref={helpTrigger}
                type="button"
                className="sidebar-nav-link sidebar-help-trigger"
                aria-label={t("help")}
                aria-haspopup="dialog"
                aria-expanded={helpOpen}
                onPointerEnter={preloadHelpCenter}
                onFocus={preloadHelpCenter}
                onClick={() => {
                  setMobile(false);
                  setHelpMounted(true);
                  setHelpOpen(true);
                }}
              >
                <CircleHelp size={20} aria-hidden="true" />
                <span className="nav-label">{t("help")}</span>
              </button>
              <div className="profile">
                <span className="profile-avatar">
                  {s.teacher.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <div className="profile-copy">
                  <strong title={s.teacher.name}>{s.teacher.name}</strong>
                  <small>
                    {t(s.demo ? "practiceClassroom" : "teacherAccount")}
                  </small>
                </div>
                <button
                  className="profile-signout icon-button"
                  aria-label={t("signOutName", { name: s.teacher.name })}
                  title={t("signOut")}
                  onClick={async () => {
                    bluetooth.disconnect();
                    await fetch("/api/auth", { method: "DELETE" });
                    window.location.href = "/login";
                  }}
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          </div>
        </aside>
        <div className="main-shell" inert={mobileViewport && mobile}>
          <ContextBar menuButton={mobileMenuButton} />
          <main style={{ "--page-color": pageColor } as React.CSSProperties}>
            {!home && !managing && view !== "scanner" && (
              <div
                className={
                  "page-heading page-banner" +
                  (classView && period ? " class-page-heading" : "") +
                  (classBanner ? " themed" : "")
                }
                style={
                  classBanner?.style ??
                  ({ "--banner": pageColor } as React.CSSProperties)
                }
              >
                {classView && period ? (
                  <ClassHeading
                    period={period}
                    teacher={s.teacher}
                    date={date}
                  />
                ) : (
                  <div className="page-heading-title">
                    <h1 tabIndex={-1}>{t(headings[view][0])}</h1>
                    {headings[view]?.[1] && <p>{t(headings[view][1])}</p>}
                  </div>
                )}
                {(activities || view === "history") && (
                  <div className="activity-class-picker">
                    <CustomSelect
                      value={periodId}
                      options={(view === "history"
                        ? classes
                        : activityClasses
                      ).map((item) => ({
                        value: item.id,
                        label: classLabel(item),
                      }))}
                      onChange={(nextClass) => {
                        const params =
                          view === "history"
                            ? new URLSearchParams(window.location.search)
                            : new URLSearchParams();
                        params.set("class", nextClass);
                        window.history.pushState(
                          null,
                          "",
                          `/${view}?${params.toString()}`,
                        );
                      }}
                      ariaLabel={
                        view === "history"
                          ? t("historyClass")
                          : t("activitiesClass", { name: className })
                      }
                      buttonLabel={
                        period
                          ? className
                          : (view === "history" ? classes : activityClasses)
                                .length
                            ? t("chooseClass")
                            : t("noClassesAvailable")
                      }
                      disabled={
                        !(view === "history" ? classes : activityClasses).length
                      }
                    />
                  </div>
                )}
                {classView && period && (
                  <div className="class-heading-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setQrClassId(period.id)}
                      aria-label={t("qrCodeLabel", { name: period.name })}
                    >
                      <QrCode size={16} aria-hidden="true" /> {t("qrCode")}
                    </button>
                    <ActionMenu
                      label={t("moreClassOptions", { name: period.name })}
                      items={[
                        {
                          label: t("customize"),
                          icon: Palette,
                          onSelect: () => setCustomizing(true),
                        },
                        {
                          label: t("editClass"),
                          icon: Pencil,
                          onSelect: () => setEditingClassId(period.id),
                        },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}
            {classView && period && customizing && (
              <BannerPicker
                period={period}
                close={() => setCustomizing(false)}
              />
            )}
            {classView && period && editingClassId === periodId && (
              <ClassEditor
                key={period.id}
                period={period}
                onClose={() => setEditingClassId(null)}
                onImport={(id) => {
                  setEditingClassId(null);
                  setImportClassId(id);
                }}
              />
            )}
            {importClassId && (
              <RosterImportDialog
                periodId={importClassId}
                close={() => setImportClassId(null)}
              />
            )}
            {qrClassId && (
              <ClassQrDialog
                periodId={qrClassId}
                close={() => setQrClassId(null)}
              />
            )}
            {waitingAttendance.length > 0 && (
              <div className="notice info sync-waiting" role="status">
                <span>
                  {t("waitingToSync", { count: waitingAttendance.length })}{" "}
                  {waitingAttendance[0].error
                    ? localize(waitingAttendance[0].error)
                    : t("syncAutomatically")}
                </span>
                <button
                  className="secondary"
                  onClick={() => attendanceSync.retry()}
                >
                  {t("syncNow")}
                </button>
              </div>
            )}
            {syncError && (
              <div className="notice error" role="alert">
                <span>{t("loadInterrupted")}</span>
                <button
                  className="secondary"
                  disabled={syncing}
                  onClick={() => void refresh()}
                >
                  {t(syncing ? "refreshing" : "retryLoading")}
                </button>
              </div>
            )}
            {home ? (
              <HomeClasses />
            ) : managing ? (
              <HomeClasses management />
            ) : classView && !periodId ? (
              <>
                <section className="card start-class">
                  <GraduationCap size={32} />
                  <h2>
                    {requestedClass && !requestedClass.active
                      ? t("classArchived")
                      : classId
                        ? t("classNotFound")
                        : t("chooseClass")}
                  </h2>
                  <p>
                    {requestedClass && !requestedClass.active
                      ? t("classArchivedBody")
                      : t("chooseClassBody")}
                  </p>
                  <Link
                    className="primary"
                    href={requestedClass ? "/classes" : "/dashboard"}
                  >
                    {t(requestedClass ? "manageClasses" : "goHome")}
                  </Link>
                </section>
              </>
            ) : classView || view === "history" ? (
              <AttendanceView key={view + periodId} view={view} />
            ) : activities ? (
              <>
                <nav className="activity-tabs" aria-label={t("classActivity")}>
                  {activityTabs.map(([route, label]) => (
                    <Link
                      key={route}
                      href={sectionHref(route)}
                      className={view === route ? "active" : ""}
                      aria-current={view === route ? "page" : undefined}
                    >
                      {t(label)}
                    </Link>
                  ))}
                </nav>
                {view === "random" ? (
                  <RandomView key={periodId + date} />
                ) : view === "groups" ? (
                  <GroupsView key={periodId + date} />
                ) : (
                  <div className="activity-workspace">
                    {view === "conversation" ? (
                      <ConversationView
                        key={
                          gameSet
                            ? `${gameSet.id}:${gameSet.updated_at}`
                            : "empty"
                        }
                        set={gameSet}
                      />
                    ) : view === "scramble" ? (
                      <ScrambleView
                        key={
                          gameSet
                            ? `${gameSet.id}:${gameSet.updated_at}`
                            : "empty"
                        }
                        set={gameSet}
                      />
                    ) : (
                      <MatchingView
                        key={
                          gameSet
                            ? `${gameSet.id}:${gameSet.updated_at}`
                            : "empty"
                        }
                        set={gameSet}
                      />
                    )}
                    <ActivitySetsSidebar
                      key={activityKind}
                      kind={activityKind!}
                      selectedId={gameSet?.id ?? null}
                      onSelect={(set) => {
                        const route =
                          set.kind === "vocabulary" ? "matching" : set.kind;
                        const params = new URLSearchParams();
                        if (periodId) params.set("class", periodId);
                        params.set("set", set.id);
                        window.history.pushState(
                          null,
                          "",
                          `/${route}?${params.toString()}`,
                        );
                      }}
                    />
                  </div>
                )}
              </>
            ) : view === "scanner" ? (
              <ScannerView />
            ) : (
              <SettingsView />
            )}
          </main>
        </div>
        {/* The live region stays mounted so screen readers announce updates. */}
        <ScannerFab />
        <div className="toast-region" role="status" aria-live="polite">
          {toast && (
            <div className={"toast" + (toast.tone === "error" ? " error" : "")}>
              <span>{toast.text}</span>
              <button
                type="button"
                className="toast-dismiss"
                aria-label={t("dismissMessage")}
                onClick={() => setToast(null)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        {helpMounted && (
          <HelpCenter
            open={helpOpen}
            route={view}
            onClose={() => setHelpOpen(false)}
            onDismissed={() => {
              if (helpTrigger.current?.getClientRects().length) {
                helpTrigger.current.focus();
              } else {
                mobileMenuRef.current?.focus();
              }
            }}
          />
        )}
      </div>
    </Context.Provider>
  );
}
