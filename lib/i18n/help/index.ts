import {
  helpArticles,
  helpCategories,
  type HelpArticle,
  type HelpCategoryId,
} from "@/lib/help-articles";
import type { Locale } from "../locales";
import { helpEs } from "./es";
import type { HelpTranslation } from "./types";

type HelpContent = {
  articles: HelpArticle[];
  categories: { id: HelpCategoryId; label: string }[];
};

// Each language's Help Center. A new language adds its file here; any
// article it hasn't translated yet shows in English.
const translations: Partial<Record<Locale, HelpTranslation>> = { es: helpEs };
const cache = new Map<Locale, HelpContent>();

/** Help articles and categories in a language. */
export function localizedHelp(locale: Locale): HelpContent {
  const translation = translations[locale];
  if (!translation)
    return { articles: helpArticles, categories: helpCategories };
  const cached = cache.get(locale);
  if (cached) return cached;
  const content = {
    articles: helpArticles.map((article) => {
      const text = translation.articles[article.id];
      return text
        ? {
            ...article,
            ...text,
            // English keywords still find the article ("bluetooth", "csv").
            keywords: [...(text.keywords ?? []), ...article.keywords],
            tip: text.tip ?? article.tip,
            routeLabel: text.routeLabel ?? article.routeLabel,
          }
        : article;
    }),
    categories: helpCategories.map((category) => ({
      ...category,
      label: translation.categories[category.id] ?? category.label,
    })),
  };
  cache.set(locale, content);
  return content;
}
