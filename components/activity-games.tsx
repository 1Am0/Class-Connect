"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { RotateCcw, Shuffle } from "lucide-react";
import type { ActivitySet, ActivitySetItem } from "@/types";
import {
  chooseMatchingEndpoint,
  matchingWireColor,
  matchingWirePath,
  type MatchingEndpoint,
  type WirePoint,
} from "@/lib/matching-wires";
import { useT } from "./i18n";

function shuffle<T>(values: T[]) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(Math.random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

function ChooseSet({ heading }: { heading: string }) {
  const t = useT("games");
  return (
    <section className="card activity-game-empty">
      <h2>{heading}</h2>
      <p>{t("chooseSetBody")}</p>
    </section>
  );
}

export function ConversationView({ set }: { set?: ActivitySet }) {
  const [order, setOrder] = useState(() => shuffle(set?.items ?? []));
  const [index, setIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const t = useT("games");
  if (!set) return <ChooseSet heading={t("chooseConversation")} />;
  const current = order[index];
  function restart() {
    setOrder(shuffle(set!.items));
    setIndex(0);
    setShowHint(false);
  }
  return (
    <section className="card activity-game" aria-label={t("conversation")}>
      <header>
        <div>
          <h2>{set.name}</h2>
          <p>
            {t("conversationProgress", {
              index: index + 1,
              total: order.length,
            })}
          </p>
        </div>
        <button type="button" className="secondary compact" onClick={restart}>
          <RotateCcw size={16} /> {t("restart")}
        </button>
      </header>
      <div className="activity-prompt">
        <p lang="es">{current.text}</p>
        {showHint &&
          (current.supporting_text ||
            current.sentence_starter ||
            current.follow_up_question) && (
            <div className="activity-prompt-notes">
              {current.supporting_text && (
                <small>{current.supporting_text}</small>
              )}
              {current.sentence_starter && (
                <small>
                  {t("starter", { text: current.sentence_starter })}
                </small>
              )}
              {current.follow_up_question && (
                <small>
                  {t("followUp", { text: current.follow_up_question })}
                </small>
              )}
            </div>
          )}
      </div>
      <div className="activity-game-actions">
        {(current.supporting_text ||
          current.sentence_starter ||
          current.follow_up_question) && (
          <button
            type="button"
            className="secondary"
            onClick={() => setShowHint((value) => !value)}
          >
            {t(showHint ? "hideNotes" : "showNotes")}
          </button>
        )}
        <button
          type="button"
          className="primary"
          onClick={() => {
            setIndex((value) => (value + 1) % order.length);
            setShowHint(false);
          }}
        >
          {t(index === order.length - 1 ? "startAgain" : "nextQuestion")}
        </button>
      </div>
    </section>
  );
}

type Tile = { id: string; text: string };
function tilesFor(item: ActivitySetItem): Tile[] {
  return shuffle(
    item.text
      .trim()
      .split(/\s+/)
      .map((text, index) => ({ id: `${item.id}-${index}`, text })),
  );
}
export function ScrambleView({ set }: { set?: ActivitySet }) {
  const [index, setIndex] = useState(0);
  const [tiles, setTiles] = useState<Tile[]>(() =>
    set ? tilesFor(set.items[0]) : [],
  );
  const [chosen, setChosen] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const t = useT("games");
  if (!set) return <ChooseSet heading={t("chooseScramble")} />;
  const item = set.items[index];
  const sequence = item.text.trim().split(/\s+/);
  const answer = chosen.map((id) => tiles.find((tile) => tile.id === id)!.text);
  const accepted = [item.text, ...(item.accepted_answers ?? [])];
  const correct =
    answer.length === sequence.length &&
    accepted.some((sentence) => sentence.trim() === answer.join(" "));
  function load(next: number) {
    setIndex(next);
    setTiles(tilesFor(set!.items[next]));
    setChosen([]);
    setChecked(false);
  }
  return (
    <section className="card activity-game" aria-label={t("scramble")}>
      <header>
        <div>
          <h2>{set.name}</h2>
          <p>
            {t("scrambleProgress", {
              index: index + 1,
              total: set.items.length,
            })}
          </p>
        </div>
        <button
          type="button"
          className="secondary compact"
          onClick={() => load(index)}
        >
          <Shuffle size={16} /> {t("reshuffle")}
        </button>
      </header>
      {item.supporting_text && (
        <p className="activity-game-hint">{item.supporting_text}</p>
      )}
      <p className="activity-game-instruction">{t("scrambleInstruction")}</p>
      <div className="scramble-tiles" aria-label={t("availableWords")}>
        {tiles
          .filter((tile) => !chosen.includes(tile.id))
          .map((tile) => (
            <button
              type="button"
              key={tile.id}
              className="secondary"
              onClick={() => {
                setChosen((old) => [...old, tile.id]);
                setChecked(false);
              }}
            >
              {tile.text}
            </button>
          ))}
      </div>
      <div className="scramble-answer" aria-label={t("yourSentence")}>
        {answer.length ? (
          chosen.map((id) => {
            const tile = tiles.find((entry) => entry.id === id)!;
            return (
              <button
                type="button"
                className="secondary"
                key={id}
                onClick={() => {
                  setChosen((old) => old.filter((entry) => entry !== id));
                  setChecked(false);
                }}
              >
                {tile.text}
              </button>
            );
          })
        ) : (
          <span>{t("sentenceHere")}</span>
        )}
      </div>
      {/* Always present so the result never pushes the page down. */}
      <p
        role="status"
        className={
          "activity-match-feedback " +
          (checked ? (correct ? "activity-correct" : "activity-incorrect") : "")
        }
      >
        {checked ? t(correct ? "correct" : "incorrect") : ""}
      </p>
      {checked && correct && item.grammar_explanation && (
        <p className="activity-game-hint">{item.grammar_explanation}</p>
      )}
      <div className="activity-game-actions">
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setChosen([]);
            setChecked(false);
          }}
        >
          {t("resetWords")}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!chosen.length}
          onClick={() => setChecked(true)}
        >
          {t("check")}
        </button>
        <button
          type="button"
          className="primary"
          disabled={!correct || !checked}
          onClick={() => load((index + 1) % set.items.length)}
        >
          {t(index === set.items.length - 1 ? "startAgain" : "nextSentence")}
        </button>
      </div>
    </section>
  );
}

export function MatchingView({ set }: { set?: ActivitySet }) {
  const [round, setRound] = useState(0);
  const [meanings, setMeanings] = useState(() =>
    shuffle(set?.items.slice(0, 12) ?? []),
  );
  const [selected, setSelected] = useState<MatchingEndpoint | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const t = useT("games");
  type Feedback = "" | "matched" | "noMatch" | "chooseMeaning" | "chooseWord";
  const [feedback, setFeedback] = useState<Feedback>("");
  const [pointer, setPointer] = useState<WirePoint | null>(null);
  const [wireLayout, setWireLayout] = useState<{
    width: number;
    height: number;
    points: Record<string, { word: WirePoint; meaning: WirePoint }>;
  } | null>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef(new Map<string, HTMLButtonElement>());
  const meaningRefs = useRef(new Map<string, HTMLButtonElement>());
  const roundItems = set?.items.slice(round * 12, round * 12 + 12) ?? [];

  useLayoutEffect(() => {
    const container = columnsRef.current;
    if (!container || !set) return;
    const measure = () => {
      const bounds = container.getBoundingClientRect();
      const points: Record<string, { word: WirePoint; meaning: WirePoint }> =
        {};
      for (const item of roundItems) {
        const word = wordRefs.current.get(item.id)?.getBoundingClientRect();
        const meaning = meaningRefs.current
          .get(item.id)
          ?.getBoundingClientRect();
        if (!word || !meaning) continue;
        points[item.id] = {
          word: {
            x: word.right - bounds.left,
            y: word.top + word.height / 2 - bounds.top,
          },
          meaning: {
            x: meaning.left - bounds.left,
            y: meaning.top + meaning.height / 2 - bounds.top,
          },
        };
      }
      setWireLayout({
        width: bounds.width,
        height: bounds.height,
        points,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [set, round, meanings]);

  if (!set) return <ChooseSet heading={t("chooseVocabulary")} />;
  const wireColor = (id: string) =>
    matchingWireColor(roundItems.findIndex((item) => item.id === id));
  function choose(side: MatchingEndpoint["side"], id: string) {
    const choice = chooseMatchingEndpoint(selected, { side, id });
    setSelected(choice.selected);
    setPointer(null);
    if (choice.matchedId) {
      setMatched((old) => [...old, choice.matchedId!]);
      setFeedback("matched");
    } else if (selected && selected.side !== side) {
      setFeedback("noMatch");
    } else {
      setFeedback(side === "word" ? "chooseMeaning" : "chooseWord");
    }
  }
  function nextRound(next: number) {
    setRound(next);
    setMeanings(shuffle(set!.items.slice(next * 12, next * 12 + 12)));
    setSelected(null);
    setMatched([]);
    setFeedback("");
    setPointer(null);
  }
  const pendingPoint =
    selected && wireLayout?.points[selected.id]?.[selected.side];
  const pendingEnd = pendingPoint
    ? (pointer ?? {
        x: pendingPoint.x + (selected?.side === "word" ? 28 : -28),
        y: pendingPoint.y,
      })
    : null;
  return (
    <section className="card activity-game" aria-label={t("matching")}>
      <header>
        <div>
          <h2>{set.name}</h2>
          <p>
            {t("matchingProgress", {
              matched: matched.length,
              total: roundItems.length,
            })}
          </p>
        </div>
        <button
          type="button"
          className="secondary compact"
          onClick={() => nextRound(round)}
        >
          <RotateCcw size={16} /> {t("reset")}
        </button>
      </header>
      <p className="activity-game-instruction">{t("matchingInstruction")}</p>
      <div
        className="matching-columns"
        ref={columnsRef}
        onPointerMove={(event) => {
          if (!selected || !columnsRef.current) return;
          const bounds = columnsRef.current.getBoundingClientRect();
          setPointer({
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
          });
        }}
        onPointerLeave={() => setPointer(null)}
      >
        <div className="matching-column matching-column--words">
          <h3>{t("words")}</h3>
          {roundItems.map((item) => (
            <button
              type="button"
              key={item.id}
              ref={(node) => {
                if (node) wordRefs.current.set(item.id, node);
                else wordRefs.current.delete(item.id);
              }}
              className={
                selected?.side === "word" && selected.id === item.id
                  ? "selected"
                  : ""
              }
              data-matched={matched.includes(item.id)}
              style={
                { "--wire-color": wireColor(item.id) } as React.CSSProperties
              }
              disabled={matched.includes(item.id)}
              onClick={() => choose("word", item.id)}
            >
              {item.text}
            </button>
          ))}
        </div>
        <div className="matching-column matching-column--meanings">
          <h3>{t("meanings")}</h3>
          {meanings.map((item) => (
            <button
              type="button"
              key={item.id}
              ref={(node) => {
                if (node) meaningRefs.current.set(item.id, node);
                else meaningRefs.current.delete(item.id);
              }}
              className={
                selected?.side === "meaning" && selected.id === item.id
                  ? "selected"
                  : ""
              }
              data-matched={matched.includes(item.id)}
              style={
                { "--wire-color": wireColor(item.id) } as React.CSSProperties
              }
              disabled={matched.includes(item.id)}
              onClick={() => choose("meaning", item.id)}
            >
              {item.supporting_text}
            </button>
          ))}
        </div>
        {wireLayout && (
          <svg
            className="matching-wires"
            viewBox={`0 0 ${wireLayout.width} ${wireLayout.height}`}
            aria-hidden="true"
          >
            {matched.map((id) => {
              const points = wireLayout.points[id];
              if (!points) return null;
              const path = matchingWirePath(points.word, points.meaning);
              return (
                <g key={id}>
                  <path className="matching-wire-shadow" d={path} />
                  <path
                    className="matching-wire"
                    d={path}
                    stroke={wireColor(id)}
                  />
                </g>
              );
            })}
            {selected && pendingPoint && pendingEnd && (
              <g>
                <path
                  className="matching-wire-shadow"
                  d={matchingWirePath(pendingPoint, pendingEnd)}
                />
                <path
                  className="matching-wire matching-wire-pending"
                  d={matchingWirePath(pendingPoint, pendingEnd)}
                  stroke={wireColor(selected.id)}
                />
              </g>
            )}
          </svg>
        )}
      </div>
      <p role="status" className="activity-match-feedback">
        {feedback && t(feedback)}
      </p>
      {matched.length === roundItems.length && (
        <button
          type="button"
          className="primary"
          onClick={() =>
            nextRound((round + 1) * 12 < set.items.length ? round + 1 : 0)
          }
        >
          {t((round + 1) * 12 < set.items.length ? "nextWords" : "playAgain")}
        </button>
      )}
    </section>
  );
}
