import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classColors,
  classThemes,
  defaultTheme,
  resolveColor,
  resolveTheme,
} from "../lib/class-themes";

test("there are ten built-in themes with unique ids", () => {
  assert.equal(classThemes.length, 10);
  assert.equal(new Set(classThemes.map((theme) => theme.id)).size, 10);
});

test("classes without a choice cycle through the themes by period", () => {
  assert.equal(defaultTheme(1).id, classThemes[0].id);
  assert.equal(defaultTheme(11).id, classThemes[0].id);
  assert.equal(defaultTheme(3).id, classThemes[2].id);
});

test("unknown saved themes fall back to the period default", () => {
  assert.equal(resolveTheme("math", 1).id, "math");
  assert.equal(resolveTheme("gone", 2).id, classThemes[1].id);
  assert.equal(resolveTheme(undefined, 2).id, classThemes[1].id);
});

test("a class can recolor its theme with a palette color only", () => {
  const theme = resolveTheme("languages", 1);
  assert.equal(resolveColor(classColors[2].value, theme), classColors[2].value);
  assert.equal(resolveColor("#123456", theme), theme.color);
  assert.equal(resolveColor(undefined, theme), theme.color);
});

test("every theme's own color is in the palette", () => {
  const palette = new Set(classColors.map((color) => color.value));
  for (const theme of classThemes) assert.ok(palette.has(theme.color));
});
