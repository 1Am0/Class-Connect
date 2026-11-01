"use client";
import { useEffect, useRef, useState } from "react";
import { Dices, RotateCcw, Copy, Printer, Shuffle, Users } from "lucide-react";
import type { Student } from "@/types";
import { rosterFor, recordsFor, presentStudents, makeGroups } from "@/lib/core";
import { useClassroom, copyText } from "./context";
import { DialogHead, Empty } from "./ui";
import { usePreferences } from "./preferences";
import { wheelStop } from "@/lib/wheel";
import { CustomSelect } from "./custom-select";
import { useT } from "./i18n";

const wheelCoreColors = ["#b91c1c", "#15803d", "#1d4ed8", "#1f2937", "#4b5563"];
const wheelExtraColors = [
  "#9a3412",
  "#854d0e",
  "#0f766e",
  "#0e7490",
  "#4338ca",
  "#7e22ce",
  "#a21caf",
];

function shuffledColors() {
  const shuffle = (palette: string[]) => {
    const colors = [...palette];
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [colors[i], colors[j]] = [colors[j], colors[i]];
    }
    return colors;
  };
  return [...shuffle(wheelCoreColors), ...shuffle(wheelExtraColors)];
}

function usePresent() {
  const { s, periodId, date } = useClassroom();
  return presentStudents(rosterFor(s, periodId), recordsFor(s, periodId, date));
}
export function RandomView() {
  const present = usePresent(),
    { notify } = useClassroom();
  const { preferences, motionReduced, play } = usePreferences();
  const t = useT("tools");
  const [used, setUsed] = useState<string[]>([]),
    [order, setOrder] = useState<string[]>([]),
    [winner, setWinner] = useState<Student | null>(null),
    [wheelStudents, setWheelStudents] = useState<Student[]>([]),
    [spinning, setSpinning] = useState(false),
    [rotation, setRotation] = useState(0),
    [duration, setDuration] = useState(3500),
    [colors, setColors] = useState([...wheelCoreColors, ...wheelExtraColors]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheel = useRef<HTMLDivElement>(null);
  const tickFrame = useRef<number | null>(null);
  const winnerDialog = useRef<HTMLDialogElement>(null);
  const pickButton = useRef<HTMLButtonElement>(null);
  const centerButton = useRef<HTMLButtonElement>(null);
  const spinSource = useRef<"center" | "button">("button");
  const resetButton = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const latest = useRef(present);
  latest.current = present;
  useEffect(() => setColors(shuffledColors()), []);
  useEffect(() => {
    if (winner && !winnerDialog.current?.open)
      winnerDialog.current?.showModal();
    else if (!winner && restoreFocus.current) {
      restoreFocus.current = false;
      const preferred =
        spinSource.current === "center"
          ? centerButton.current
          : pickButton.current;
      const target =
        preferred && !preferred.disabled ? preferred : resetButton.current;
      target?.focus();
    }
  }, [winner]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (tickFrame.current) cancelAnimationFrame(tickFrame.current);
    },
    [],
  );
  const candidates = present
    .filter((student) => !used.includes(student.id))
    .sort((a, b) => {
      const left = order.indexOf(a.id);
      const right = order.indexOf(b.id);
      return (
        (left < 0 ? Number.MAX_SAFE_INTEGER : left) -
        (right < 0 ? Number.MAX_SAFE_INTEGER : right)
      );
    });
  /** Click once for every segment edge that passes the pointer, following the
   *  wheel's real angle so the ticks slow down exactly as the wheel does. */
  function startTicks(segments: number) {
    if (tickFrame.current) cancelAnimationFrame(tickFrame.current);
    const size = 360 / segments;
    let last: number | null = null;
    let total = 0;
    let slot: number | null = null;
    let lastTick = 0;
    const frame = (now: number) => {
      const element = wheel.current;
      if (!element) return;
      const { a, b } = new DOMMatrixReadOnly(
        getComputedStyle(element).transform,
      );
      const angle = (Math.atan2(b, a) * 180) / Math.PI;
      if (last !== null) total += ((angle - last + 540) % 360) - 180;
      last = angle;
      // The pointer sits at the top, so it reads the wheel at -total degrees.
      const current = Math.floor(-total / size);
      // At top speed edges pass faster than a click can ring; cap the rate.
      if (slot !== null && current !== slot && now - lastTick > 28) {
        play("tick");
        lastTick = now;
      }
      slot = current;
      tickFrame.current = requestAnimationFrame(frame);
    };
    tickFrame.current = requestAnimationFrame(frame);
  }
  function stopTicks() {
    if (tickFrame.current) cancelAnimationFrame(tickFrame.current);
    tickFrame.current = null;
  }
  function reset() {
    stopTicks();
    const ids = present.map((student) => student.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setOrder(ids);
    setUsed([]);
    setWinner(null);
    setWheelStudents([]);
    setRotation(0);
    setDuration(0);
    setColors(shuffledColors());
    notify(t("resetDone"));
  }
  function spin(source: "center" | "button") {
    if (spinning || winner || !candidates.length) return;
    spinSource.current = source;
    setWinner(null);
    setWheelStudents(candidates);
    setColors(shuffledColors());
    const stop = wheelStop(candidates.length);
    const chosen = candidates[stop.index];
    const animate = !motionReduced;
    const spinTime = animate ? stop.duration : 0;
    setDuration(spinTime);
    setSpinning(animate);
    setRotation(
      (r) => r + (360 - (r % 360)) + 360 * stop.revolutions + stop.target,
    );
    if (animate && preferences.effects) startTicks(candidates.length);
    const finish = () => {
      stopTicks();
      setSpinning(false);
      if (!latest.current.some((st) => st.id === chosen.id)) {
        notify(t("notPresent"), "error");
        return;
      }
      setWinner(chosen);
      setUsed((old) => [...old, chosen.id]);
      play("selection");
    };
    if (animate) timer.current = setTimeout(finish, spinTime);
    else finish();
  }
  const drawing =
    (spinning || winner) && wheelStudents.length ? wheelStudents : candidates;
  return (
    <section
      className="card wheel-card activity-picker"
      aria-label={t("picker")}
    >
      <div className="card-title">
        <div className="picker-actions">
          {!!present.length && (
            <span className="tag">
              {t("left", { left: candidates.length, total: present.length })}
            </span>
          )}
          <button
            ref={resetButton}
            className="secondary compact"
            onClick={reset}
            disabled={spinning || !present.length}
          >
            <RotateCcw size={16} /> {t("reset")}
          </button>
        </div>
      </div>
      {!present.length && <p className="picker-message">{t("needPresent")}</p>}
      {!!present.length && !candidates.length && !winner && !spinning && (
        <p className="picker-message">{t("allPicked")}</p>
      )}
      {(!!candidates.length || !!winner || spinning) && (
        <>
          <div className="wheel-wrap">
            <div className="wheel-pointer" />
            <div
              ref={wheel}
              className="wheel"
              style={{
                transform: `rotate(${rotation}deg)`,
                transitionDuration: `${duration}ms`,
                background: drawing.length
                  ? `conic-gradient(${drawing.map((_, i) => `${colors[i % colors.length]} ${(i / drawing.length) * 100}% ${((i + 1) / drawing.length) * 100}%`).join(",")})`
                  : "#dedede",
              }}
            >
              {drawing.map((st, i) => (
                <span
                  className="wheel-label"
                  key={st.id}
                  style={{
                    transform: `rotate(${((i + 0.5) * 360) / drawing.length - 90}deg)`,
                  }}
                >
                  <b>{st.first_name}</b>
                </span>
              ))}
            </div>
            <button
              ref={centerButton}
              type="button"
              className="wheel-center"
              aria-label={t("spin")}
              title={t("spin")}
              disabled={spinning || !!winner || !candidates.length}
              onClick={() => spin("center")}
            >
              <Dices size={28} aria-hidden="true" />
            </button>
          </div>
          <button
            ref={pickButton}
            className="primary spin-button"
            disabled={spinning || !!winner || !candidates.length}
            onClick={() => spin("button")}
          >
            <Dices size={19} />
            {t(spinning ? "picking" : "pick")}
          </button>
        </>
      )}
      <dialog
        ref={winnerDialog}
        className="winner-dialog"
        aria-labelledby="winner-title"
        onClose={() => {
          restoreFocus.current = true;
          setWinner(null);
        }}
      >
        <DialogHead
          id="winner-title"
          title={t("selected")}
          close={() => winnerDialog.current?.close()}
        />
        <p className="winner-name">{winner?.display_name}</p>
        <div className="winner-actions">
          <button
            className="primary"
            onClick={() => winnerDialog.current?.close()}
          >
            {t("close")}
          </button>
        </div>
      </dialog>
    </section>
  );
}
export function GroupsView() {
  const present = usePresent(),
    { notify } = useClassroom();
  const { play } = usePreferences();
  const t = useT("tools");
  const [mode, setMode] = useState<"count" | "size">("count"),
    [value, setValue] = useState("6"),
    [groups, setGroups] = useState<Student[][]>([]),
    [signature, setSignature] = useState("");
  const ids = present
    .map((s) => s.id)
    .sort()
    .join(",");
  const stale = groups.length > 0 && signature !== ids;
  const valid =
    /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 100;
  function generate() {
    if (!valid || !present.length) return;
    setValue(String(Number(value)));
    setGroups(makeGroups(present, Number(value), mode));
    setSignature(ids);
    play("groups");
  }
  return (
    <>
      <section className="card group-controls" aria-label={t("groupSettings")}>
        <div className="group-inputs">
          <label>
            {t("groupBy")}
            <CustomSelect
              ariaLabel={t("groupMethod")}
              value={mode}
              onChange={(value) => setMode(value as "count" | "size")}
              options={[
                { value: "count", label: t("byCount") },
                { value: "size", label: t("bySize") },
              ]}
            />
          </label>
          <label>
            {t(mode === "count" ? "groups" : "bySize")}
            <input
              aria-label={t("quantity")}
              type="number"
              min="1"
              max="100"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => {
                if (valid) setValue(String(Number(value)));
              }}
            />
          </label>
          {!valid && (
            <span className="field-error" role="alert">
              {t("wholeNumber")}
            </span>
          )}
          <button
            className="primary"
            disabled={!present.length || !valid}
            onClick={generate}
          >
            <Shuffle size={17} />
            {t(groups.length ? "shuffleAgain" : "makeGroups")}
          </button>
        </div>
      </section>
      {stale && <p className="notice error">{t("stale")}</p>}
      {groups.length ? (
        <>
          <div className="groups-toolbar">
            <h2>{t("groupCount", { count: groups.length })}</h2>
            <div>
              <button
                className="secondary"
                disabled={stale}
                onClick={() =>
                  copyText(
                    groups
                      .map(
                        (g, i) =>
                          `${t("copyHeading", { number: i + 1 })}\n${g.map((s) => s.display_name).join("\n")}`,
                      )
                      .join("\n\n"),
                    notify,
                  )
                }
              >
                <Copy size={16} />
                {t("copy")}
              </button>
              <button
                className="secondary"
                disabled={stale}
                onClick={() => window.print()}
              >
                <Printer size={16} />
                {t("print")}
              </button>
            </div>
          </div>
          <div className="groups-grid">
            {groups.map((group, i) => (
              <section className="card group-card" key={i}>
                <header>
                  <h3>{t("group", { number: i + 1 })}</h3>
                  <small>{t("members", { count: group.length })}</small>
                </header>
                {group.map((st) => (
                  <div className="group-member" key={st.id}>
                    {st.display_name}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </>
      ) : !present.length ? (
        <section className="card">
          <Empty icon={Users} title={t("nobody")} body={t("nobodyBody")} />
        </section>
      ) : null}
    </>
  );
}
