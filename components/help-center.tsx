"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  House,
  Search,
  Settings2,
  Wrench,
  X,
} from "lucide-react";
import { classColors } from "@/lib/class-themes";
import { useLocale, useT } from "./i18n";
import { localizedHelp } from "@/lib/i18n/help";
import {
  helpForPage,
  popularHelpIds,
  searchHelp,
  type HelpArticle,
  type HelpCategoryId,
} from "@/lib/help-articles";

const categoryIcons = {
  "getting-started": House,
  attendance: ClipboardCheck,
  students: GraduationCap,
  schedules: CalendarDays,
  activities: BookOpen,
  settings: Settings2,
  troubleshooting: Wrench,
};

const SLIDE_DURATION_MS = 260;
const FEEDBACK_KEY = "classconnect.help-feedback.v1";
const REPORT_KEY = "classconnect.help-report-draft.v1";
type ArticleFeedback = Record<string, { helpful: boolean; note?: string }>;

export function HelpCenter({
  open,
  route,
  onClose,
  onDismissed,
}: {
  open: boolean;
  route: string;
  onClose: () => void;
  onDismissed: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const articleHeading = useRef<HTMLHeadingElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const previousScroll = useRef(0);
  const closeTimer = useRef<number | null>(null);
  const enterFrame = useRef<number | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<HelpCategoryId | null>(null);
  const [articleId, setArticleId] = useState<string | null>(null);
  const [showAllPageHelp, setShowAllPageHelp] = useState(false);
  const [feedback, setFeedback] = useState<ArticleFeedback>({});
  const [feedbackNote, setFeedbackNote] = useState("");
  const [showFeedbackNote, setShowFeedbackNote] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDraft, setReportDraft] = useState("");
  const [reportSaved, setReportSaved] = useState(false);
  const [returnTo, setReturnTo] = useState<"home" | "category" | "search">(
    "home",
  );
  const t = useT("help");
  const { articles: helpArticles, categories: helpCategories } =
    localizedHelp(useLocale());
  const article = helpArticles.find((item) => item.id === articleId);
  const categoryInfo = helpCategories.find((item) => item.id === category);
  const results = searchHelp(query, helpArticles);
  const pageHelp = helpForPage(route, helpArticles);

  useEffect(() => {
    try {
      const savedFeedback: unknown = JSON.parse(
        localStorage.getItem(FEEDBACK_KEY) ?? "{}",
      );
      if (
        savedFeedback &&
        typeof savedFeedback === "object" &&
        !Array.isArray(savedFeedback)
      ) {
        setFeedback(savedFeedback as ArticleFeedback);
      }
      setReportDraft(localStorage.getItem(REPORT_KEY) ?? "");
    } catch {
      // Feedback still works for this visit if browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    setShowAllPageHelp(false);
  }, [route]);

  useEffect(() => {
    if (articleId) articleHeading.current?.focus();
  }, [articleId]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open) {
      if (!element.open) element.showModal();
      element.dataset.phase = "entering";
      // Establish the off-screen position before starting the transition.
      void element.offsetWidth;
      enterFrame.current = requestAnimationFrame(() => {
        element.dataset.phase = "entered";
        searchInput.current?.focus();
      });
    } else if (element.open) {
      element.dataset.phase = "leaving";
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches
        ? 0
        : SLIDE_DURATION_MS;
      closeTimer.current = window.setTimeout(() => {
        element.close();
        delete element.dataset.phase;
      }, duration);
    }
    return () => {
      if (enterFrame.current !== null) cancelAnimationFrame(enterFrame.current);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, [open]);

  function showArticle(id: string) {
    previousScroll.current = body.current?.scrollTop ?? 0;
    setReturnTo(query.trim() ? "search" : category ? "category" : "home");
    setArticleId(id);
    setFeedbackNote("");
    setShowFeedbackNote(false);
    requestAnimationFrame(() => body.current?.scrollTo(0, 0));
  }

  function goBack() {
    if (articleId) {
      setArticleId(null);
      if (returnTo !== "category") setCategory(null);
      requestAnimationFrame(() =>
        body.current?.scrollTo(0, previousScroll.current),
      );
      requestAnimationFrame(() => searchInput.current?.focus());
    } else if (category) {
      setCategory(null);
      requestAnimationFrame(() => body.current?.scrollTo(0, 0));
    }
  }

  function saveFeedback(id: string, helpful: boolean, note?: string) {
    if (feedback[id]) return;
    const updated = {
      ...feedback,
      [id]: { helpful, ...(note ? { note } : {}) },
    };
    setFeedback(updated);
    setShowFeedbackNote(false);
    try {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    } catch {
      // The acknowledgement remains visible for this visit.
    }
  }

  function saveReportDraft() {
    if (!reportDraft.trim()) return;
    try {
      localStorage.setItem(REPORT_KEY, reportDraft.trim());
      setReportSaved(true);
    } catch {
      setReportSaved(false);
    }
  }

  function clearReportDraft() {
    setReportDraft("");
    setReportSaved(false);
    try {
      localStorage.removeItem(REPORT_KEY);
    } catch {
      // The field is still cleared for this visit.
    }
  }

  function clearFeedback(id: string) {
    const updated = { ...feedback };
    delete updated[id];
    setFeedback(updated);
    try {
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(updated));
    } catch {
      // The selection is still cleared for this visit.
    }
  }

  function articleButton(item: HelpArticle, compact = false) {
    return (
      <button
        type="button"
        className={`help-article-link${compact ? " help-article-link--compact" : ""}`}
        key={item.id}
        onClick={() => showArticle(item.id)}
      >
        <span>
          <strong>{item.title}</strong>
          {!compact && <small>{item.description}</small>}
        </span>
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <dialog
      ref={dialog}
      className="help-center-dialog"
      aria-labelledby="help-center-title"
      aria-describedby="help-center-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        onClose();
        window.setTimeout(onDismissed, 0);
      }}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <div className="help-center-shell">
        <header className="help-center-header">
          <div className="help-center-heading">
            <span className="help-center-mark">
              <CircleHelp size={22} aria-hidden="true" />
            </span>
            <div>
              <h2 id="help-center-title">{t("title")}</h2>
              <p id="help-center-description">{t("intro")}</p>
            </div>
          </div>
          <button
            type="button"
            className="help-close icon-button"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="help-search-wrap">
          <Search size={19} aria-hidden="true" />
          <input
            ref={searchInput}
            type="search"
            value={query}
            aria-label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            onChange={(event) => {
              setQuery(event.target.value);
              setCategory(null);
              setArticleId(null);
            }}
          />
          {query && (
            <button
              type="button"
              className="help-clear"
              onClick={() => {
                setQuery("");
                setArticleId(null);
                searchInput.current?.focus();
              }}
            >
              {t("clear")}
            </button>
          )}
        </div>
        <div className="help-center-body" ref={body}>
          {article ? (
            <article className="help-article">
              <button type="button" className="help-back" onClick={goBack}>
                <ArrowLeft size={17} aria-hidden="true" /> {t("back")}
              </button>
              <p className="help-breadcrumb">
                {t("breadcrumb", {
                  category:
                    helpCategories.find((item) => item.id === article.category)
                      ?.label ?? "",
                })}
              </p>
              <h3 ref={articleHeading} tabIndex={-1}>
                {article.title}
              </h3>
              <p className="help-article-description">{article.description}</p>
              <h4>{t("steps")}</h4>
              <ol>
                {article.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {article.tip && (
                <p className="help-tip">
                  <strong>{t("tip")}</strong> {article.tip}
                </p>
              )}
              {article.image && (
                <figure className="help-article-image">
                  {/* Optional screenshots are curated local help assets with meaningful alt text. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.image.src}
                    alt={article.image.alt}
                    loading="lazy"
                  />
                  <figcaption>
                    {article.image.caption && (
                      <span>{article.image.caption}</span>
                    )}
                    <a
                      href={article.image.src}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("largerImage")}
                    </a>
                  </figcaption>
                </figure>
              )}
              {article.route && (
                <Link
                  className="primary help-destination"
                  href={article.route}
                  onClick={onClose}
                >
                  {article.routeLabel ?? t("openPage")}{" "}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              )}
              {!!article.related?.length && (
                <section
                  className="help-related"
                  aria-label={t("relatedLabel")}
                >
                  <h4>{t("related")}</h4>
                  {article.related.flatMap((id) => {
                    const related = helpArticles.find((item) => item.id === id);
                    return related ? [articleButton(related, true)] : [];
                  })}
                </section>
              )}
              <section
                className="help-feedback"
                aria-labelledby="help-feedback-title"
              >
                <h4 id="help-feedback-title">{t("helpful")}</h4>
                {feedback[article.id] ? (
                  <>
                    <p role="status">{t("thanks")}</p>
                    <button
                      type="button"
                      className="help-view-all"
                      onClick={() => clearFeedback(article.id)}
                    >
                      {t("clearFeedback")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="help-feedback-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => saveFeedback(article.id, true)}
                      >
                        {t("yes")}
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        aria-expanded={showFeedbackNote}
                        onClick={() => setShowFeedbackNote(true)}
                      >
                        {t("no")}
                      </button>
                    </div>
                    {showFeedbackNote && (
                      <div className="help-feedback-note">
                        <label htmlFor="help-feedback-note">
                          {t("unclear")}
                        </label>
                        <textarea
                          id="help-feedback-note"
                          maxLength={500}
                          rows={3}
                          value={feedbackNote}
                          onChange={(event) =>
                            setFeedbackNote(event.target.value)
                          }
                        />
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            saveFeedback(article.id, false, feedbackNote.trim())
                          }
                        >
                          {t("saveFeedback")}
                        </button>
                      </div>
                    )}
                    <small>{t("feedbackNote")}</small>
                  </>
                )}
              </section>
            </article>
          ) : query.trim() ? (
            <section className="help-list" aria-live="polite">
              <h3>
                {t("results")} <span>{results.length}</span>
              </h3>
              {results.length ? (
                results.map((item) => articleButton(item, true))
              ) : (
                <p className="help-empty">{t("noResults")}</p>
              )}
            </section>
          ) : category && categoryInfo ? (
            <section className="help-list">
              <button type="button" className="help-back" onClick={goBack}>
                <ArrowLeft size={17} aria-hidden="true" /> {t("backToHelp")}
              </button>
              <h3>{categoryInfo.label}</h3>
              {helpArticles
                .filter((item) => item.category === category)
                .map((item) => articleButton(item, true))}
            </section>
          ) : (
            <div className="help-home">
              {!!pageHelp.length && (
                <section className="help-list">
                  <h3>{t("forPage")}</h3>
                  {(showAllPageHelp ? pageHelp : pageHelp.slice(0, 3)).map(
                    (item) => articleButton(item, true),
                  )}
                  {pageHelp.length > 3 && (
                    <button
                      type="button"
                      className="help-view-all"
                      onClick={() => setShowAllPageHelp((value) => !value)}
                    >
                      {showAllPageHelp
                        ? t("showFewer")
                        : t("viewAll", { count: pageHelp.length })}
                    </button>
                  )}
                </section>
              )}
              <section className="help-categories">
                <h3>{t("topics")}</h3>
                <div>
                  {helpCategories
                    .filter((item) =>
                      helpArticles.some((entry) => entry.category === item.id),
                    )
                    .map((item, index) => {
                      const Icon = categoryIcons[item.id];
                      const count = helpArticles.filter(
                        (entry) => entry.category === item.id,
                      ).length;
                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => {
                            setCategory(item.id);
                            requestAnimationFrame(() =>
                              body.current?.scrollTo(0, 0),
                            );
                          }}
                        >
                          <span
                            className="help-topic-icon"
                            aria-hidden="true"
                            style={
                              {
                                "--topic":
                                  classColors[index % classColors.length].value,
                              } as React.CSSProperties
                            }
                          >
                            <Icon size={18} />
                          </span>
                          <span>
                            {item.label}
                            <small>{t("articles", { count })}</small>
                          </span>
                        </button>
                      );
                    })}
                </div>
              </section>
              <section className="help-list">
                <h3>{t("popular")}</h3>
                {popularHelpIds.flatMap((id) => {
                  if (pageHelp.some((item) => item.id === id)) return [];
                  const item = helpArticles.find((entry) => entry.id === id);
                  return item ? [articleButton(item, true)] : [];
                })}
              </section>
              <section className="help-support">
                <h3>{t("stillNeed")}</h3>
                <p>{t("stillNeedBody")}</p>
                <button
                  type="button"
                  className="secondary"
                  aria-expanded={reportOpen}
                  onClick={() => setReportOpen((value) => !value)}
                >
                  {t(reportOpen ? "closeReport" : "report")}
                </button>
                {reportOpen && (
                  <div className="help-support-form">
                    <label htmlFor="help-report-draft">{t("trouble")}</label>
                    <textarea
                      id="help-report-draft"
                      rows={4}
                      maxLength={2000}
                      value={reportDraft}
                      onChange={(event) => {
                        setReportDraft(event.target.value);
                        setReportSaved(false);
                      }}
                    />
                    <button
                      type="button"
                      className="secondary"
                      disabled={!reportDraft.trim()}
                      onClick={saveReportDraft}
                    >
                      {t("saveDraft")}
                    </button>
                    {reportDraft && (
                      <button
                        type="button"
                        className="help-view-all"
                        onClick={clearReportDraft}
                      >
                        {t("clearDraft")}
                      </button>
                    )}
                    {reportSaved && <p role="status">{t("draftSaved")}</p>}
                  </div>
                )}
                <small>{t("draftNote")}</small>
              </section>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}
