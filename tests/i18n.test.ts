import test from "node:test";
import assert from "node:assert/strict";
import { en } from "../lib/i18n/en";
import { es } from "../lib/i18n/es";
import { format, splitTags, translateMessage } from "../lib/i18n/translate";
import { localizeMessage, translator } from "../lib/i18n";
import { matchLocale } from "../lib/i18n/locales";
import { serverMessages } from "../lib/i18n/es/server-messages";
import { helpEs } from "../lib/i18n/help/es";
import { localizedHelp } from "../lib/i18n/help";
import { helpArticles, searchHelp } from "../lib/help-articles";
import { formatSchoolTime, normalizeTimeInput } from "../lib/time-input";
import { passwordError } from "../lib/account-validation";

const placeholders = (text: unknown) =>
  JSON.stringify(text)
    .match(/\{\w+\}/g)
    ?.filter((name) => name !== "{count}")
    .sort() ?? [];

test("Spanish has every English key, with the same placeholders", () => {
  for (const [name, namespace] of Object.entries(en)) {
    const spanish = es[name as keyof typeof es] as Record<string, unknown>;
    assert.ok(spanish, `missing namespace ${name}`);
    for (const [key, english] of Object.entries(namespace)) {
      assert.ok(key in spanish, `${name}.${key} is missing in Spanish`);
      assert.deepEqual(
        [...new Set(placeholders(spanish[key]))],
        [...new Set(placeholders(english))],
        `${name}.${key} placeholders differ`,
      );
    }
    for (const key of Object.keys(spanish))
      assert.ok(key in namespace, `${name}.${key} is not an English key`);
  }
});

test("messages fill placeholders and pick plural forms", () => {
  const plural = { one: "1 student", other: "{count} students" };
  assert.equal(format(plural, { count: 1 }, "en-US"), "1 student");
  assert.equal(format(plural, { count: 3 }, "en-US"), "3 students");
  assert.equal(format("Hi {name}", { name: "Ada" }, "en-US"), "Hi Ada");
  assert.equal(format("{n} left", { n: 1200 }, "en-US"), "1,200 left");
  const t = translator("es", "attendance");
  assert.equal(t("studentCount", { count: 1 }), "1 estudiante");
  assert.equal(t("studentCount", { count: 29 }), "29 estudiantes");
  assert.deepEqual(splitTags("Last tap: <b>Ada</b>."), [
    { text: "Last tap: " },
    { tag: "b", text: "Ada" },
    { text: "." },
  ]);
});

test("a language that is missing text falls back to English", () => {
  // Every locale gets the English text for keys it has not translated.
  assert.equal(translator("en", "common")("present"), "Present");
  assert.equal(translator("es", "common")("present"), "Presente");
});

test("server messages translate exactly, by pattern, and in lists", () => {
  assert.equal(
    localizeMessage("es", "Class not found."),
    "No se encontró la clase.",
  );
  assert.equal(
    localizeMessage("es", "Row 4: Student Number is invalid."),
    "Fila 4: el número de estudiante no es válido.",
  );
  assert.equal(
    localizeMessage("es", "Ada Lovelace checked in."),
    "Ada Lovelace quedó registrado.",
  );
  assert.equal(
    localizeMessage("es", passwordError("abc")!),
    "A la contraseña le falta: 8 a 20 caracteres, al menos una letra mayúscula, al menos un número.",
  );
  // Unknown text and English stay as they are.
  assert.equal(localizeMessage("es", "Something new."), "Something new.");
  assert.equal(localizeMessage("en", "Class not found."), "Class not found.");
  assert.equal(translateMessage("x", undefined), "x");
});

test("every translated server pattern keeps its placeholders", () => {
  for (const [english, spanish] of Object.entries(serverMessages))
    assert.deepEqual(
      placeholders(spanish),
      placeholders(english),
      `"${english}" placeholders differ`,
    );
});

test("browser languages pick the closest supported language", () => {
  assert.equal(matchLocale("es-MX,es;q=0.9,en;q=0.8"), "es");
  assert.equal(matchLocale("fr-FR,en;q=0.5"), "en");
  assert.equal(matchLocale("fr-FR"), "en");
  assert.equal(matchLocale(null), "en");
});

test("Spanish help covers every article, step for step", () => {
  for (const article of helpArticles) {
    const spanish = helpEs.articles[article.id];
    assert.ok(spanish, `help article ${article.id} has no Spanish`);
    assert.equal(
      spanish.steps.length,
      article.steps.length,
      `help article ${article.id} has a different number of steps`,
    );
    assert.equal(Boolean(spanish.tip), Boolean(article.tip), article.id);
  }
  for (const id of Object.keys(helpEs.articles))
    assert.ok(
      helpArticles.some((article) => article.id === id),
      id,
    );
  const spanish = localizedHelp("es");
  assert.ok(
    searchHelp("como cambio el idioma", spanish.articles)[0]?.id === "language",
  );
  // English keywords still find Spanish articles.
  assert.ok(
    searchHelp("bluetooth", spanish.articles).some(
      (article) => article.id === "scanner",
    ),
  );
});

test("times show and parse in Spanish", () => {
  assert.match(formatSchoolTime("08:05", "es-US"), /^8:05\s?a\.\s?m\.$/);
  assert.equal(formatSchoolTime("13:30"), "1:30 PM");
  assert.equal(normalizeTimeInput("8:45 a. m."), "08:45");
  assert.equal(normalizeTimeInput("1:15 p. m."), "13:15");
  assert.equal(normalizeTimeInput("1:15 pm"), "13:15");
});
