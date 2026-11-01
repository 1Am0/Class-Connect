import test from "node:test";
import assert from "node:assert/strict";
import { sortClassesByPeriod } from "../lib/home-class-order";

test("home classes follow assigned period numbers", () => {
  const classes = [
    { id: "later", period_number: 3, name: "Design" },
    { id: "first", period_number: 1, name: "Science" },
  ];
  assert.deepEqual(
    sortClassesByPeriod(classes).map((item) => item.id),
    ["first", "later"],
  );
});
