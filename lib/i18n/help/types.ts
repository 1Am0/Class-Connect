import type { HelpCategoryId } from "@/lib/help-articles";

/** A language's Help Center text, keyed by article id. Missing parts stay English. */
export type HelpTranslation = {
  categories: Partial<Record<HelpCategoryId, string>>;
  articles: Record<
    string,
    {
      title: string;
      description: string;
      keywords?: string[];
      steps: string[];
      routeLabel?: string;
      tip?: string;
    }
  >;
};
