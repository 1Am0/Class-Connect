"use client";
import { Suspense, lazy, type ComponentType, type ReactNode } from "react";
import { useT } from "./i18n";

// Views and dialogs that most visits never open load in their own chunks, so
// Home and attendance stay quick on classroom laptops.
// Placeholder cards in the page's color hold the layout while a view loads.
function ViewLoading() {
  const t = useT("common");
  return (
    <div className="view-loading" role="status">
      <span className="sr-only">{t("loading")}</span>
      {[0, 1].map((card) => (
        <div key={card} className="skeleton-card" aria-hidden="true">
          <span className="skeleton-line wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line short" />
        </div>
      ))}
    </div>
  );
}

// Each lazy component gets its own Suspense boundary. Without one, loading
// suspends the whole classroom shell, which hides the page and re-runs its
// effects (closing any dialog that was just opened).
function deferred<P extends object>(
  load: () => Promise<ComponentType<P>>,
  fallback: ReactNode = null,
) {
  const Lazy = lazy(async () => ({ default: await load() }));
  function Deferred(props: P) {
    return (
      <Suspense fallback={fallback}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  return Deferred;
}

const view = <ViewLoading />;
export const SettingsView = deferred(
  () => import("./settings").then((m) => m.SettingsView),
  view,
);
export const ScannerView = deferred(
  () => import("./scanner").then((m) => m.ScannerView),
  view,
);
export const ConversationView = deferred(
  () => import("./activity-games").then((m) => m.ConversationView),
  view,
);
export const ScrambleView = deferred(
  () => import("./activity-games").then((m) => m.ScrambleView),
  view,
);
export const MatchingView = deferred(
  () => import("./activity-games").then((m) => m.MatchingView),
  view,
);
export const ActivitySetsSidebar = deferred(() =>
  import("./activity-sets").then((m) => m.ActivitySetsSidebar),
);
// Dialogs render nothing while loading; they appear as soon as they arrive.
export const HelpCenter = deferred(() =>
  import("./help-center").then((m) => m.HelpCenter),
);
export const ClassEditor = deferred(() =>
  import("./class-editor").then((m) => m.ClassEditor),
);
export const RosterImportDialog = deferred(() =>
  import("./roster-import").then((m) => m.RosterImportDialog),
);
export const ClassQrDialog = deferred(() =>
  import("./class-qr-dialog").then((m) => m.ClassQrDialog),
);
export const ActivitySetEditor = deferred(() =>
  import("./activity-set-editor").then((m) => m.ActivitySetEditor),
);

export const preloadHelpCenter = () => void import("./help-center");
