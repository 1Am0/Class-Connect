import type { Namespace } from "../translate";

// Error and not-found pages.
export default {
  unavailableTitle: "Your classroom is temporarily unavailable.",
  unavailableBody:
    "We couldn’t load your classroom. Please try again in a moment.",
  signInLink: "Go to sign in",
  setupTitle: "Let’s connect your classroom.",
  setupBody:
    "Configure Supabase using the README, or enable DEMO_MODE in local development.",
  crashTitle: "Something went wrong on this page.",
  crashBody:
    "Anything you already saved is safe. Try again, or go back to Home.",
  retry: "Try again",
  home: "Go to Home",
  notFoundTitle: "We couldn’t find that page.",
  notFoundBody: "The link may be mistyped or out of date.",
  loadTitle: "Class Connect couldn’t load.",
  loadBody: "Anything you already saved is safe. Try again in a moment.",
} satisfies Namespace;
