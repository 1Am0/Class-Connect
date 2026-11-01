import test from "node:test";
import assert from "node:assert/strict";
import { firstRunError, type FirstRunInput } from "../lib/first-run";

const valid: FirstRunInput = {
  timezone: "America/Los_Angeles",
  className: "Engineering Design",
  periodNumber: 1,
  startTime: "08:00",
  endTime: "09:00",
  weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
};
test("first-run requires a class and scheduled weekdays", () => {
  assert.equal(firstRunError(valid), null);
  assert.match(firstRunError({ ...valid, weekdays: [] }) ?? "", /weekday/i);
  assert.match(
    firstRunError({ ...valid, className: " " }) ?? "",
    /class name/i,
  );
  assert.match(firstRunError({ ...valid, endTime: "07:00" }) ?? "", /time/i);
  assert.match(
    firstRunError({ ...valid, timezone: "bad" }) ?? "",
    /time zone/i,
  );
});
