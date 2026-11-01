import assert from "node:assert/strict";
import test from "node:test";
import {
  helpArticles,
  helpCategories,
  helpForPage,
  popularHelpIds,
  searchHelp,
} from "../lib/help-articles";

test("help articles have valid unique IDs, categories, related links, and dashboard routes", () => {
  const ids = new Set(helpArticles.map((article) => article.id));
  const categories = new Set(helpCategories.map((category) => category.id));
  const routes = new Set([
    "/dashboard",
    "/classes",
    "/attendance",
    "/history",
    "/random",
    "/groups",
    "/conversation",
    "/scramble",
    "/matching",
    "/scanner",
    "/settings",
  ]);
  assert.equal(ids.size, helpArticles.length);
  for (const article of helpArticles) {
    assert.ok(categories.has(article.category), article.id);
    assert.ok(article.steps.length > 0, article.id);
    assert.ok(
      article.steps.every((step) => step.trim()),
      article.id,
    );
    if (article.route) assert.ok(routes.has(article.route), article.id);
    for (const related of article.related ?? [])
      assert.ok(ids.has(related), related);
  }
  for (const id of popularHelpIds) assert.ok(ids.has(id), id);
  for (const category of helpCategories)
    assert.ok(
      helpArticles.some((article) => article.category === category.id),
      category.id,
    );
});

test("common questions find the relevant articles", () => {
  assert.equal(
    searchHelp("How do I take attendance?")[0]?.id,
    "take-attendance",
  );
  assert.equal(searchHelp("How do I add a student?")[0]?.id, "add-student");
  assert.equal(searchHelp("How do I make groups of four?")[0]?.id, "groups");
  assert.ok(
    searchHelp("random students").some((article) => article.id === "wheel"),
  );
  assert.ok(
    searchHelp("random students").some((article) => article.id === "groups"),
  );
  assert.equal(
    searchHelp("HOW DO I CHANGE MY WEEKLY SCHEDULE?")[0]?.id,
    "weekly-schedule",
  );
  assert.ok(
    searchHelp("save my activities").some(
      (article) => article.id === "activity-sets",
    ),
  );
});

test("title matches outrank keyword matches, and empty or unrelated queries return nothing", () => {
  assert.equal(searchHelp("wheel")[0]?.id, "wheel");
  assert.deepEqual(searchHelp("how do I"), []);
  assert.deepEqual(searchHelp("quantum pineapple helicopter"), []);
});

test("page suggestions follow the current classroom view", () => {
  assert.ok(
    helpForPage("attendance").some(
      (article) => article.id === "take-attendance",
    ),
  );
  assert.ok(
    helpForPage("matching").some((article) => article.id === "matching"),
  );
  assert.deepEqual(helpForPage("unknown"), []);
  assert.ok(helpForPage("attendance").length > 3);
});

test("beginner guide follows setup, roster, activities, and settings", () => {
  const guide = helpArticles
    .filter((article) => article.category === "getting-started")
    .map((article) => article.id);
  assert.deepEqual(guide, [
    "start-dashboard",
    "start-class",
    "start-roster",
    "start-attendance",
    "start-activities",
    "start-settings",
  ]);
});

test("common troubleshooting searches find supported answers", () => {
  assert.ok(
    searchHelp("student missing from wheel").some(
      (article) => article.id === "missing-from-wheel",
    ),
  );
  assert.ok(
    searchHelp("attendance pending sync").some(
      (article) => article.id === "attendance-sync",
    ),
  );
  assert.ok(
    searchHelp("lost card").some((article) => article.id === "forgotten-card"),
  );
});
