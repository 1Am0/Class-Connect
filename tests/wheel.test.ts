import { test } from "node:test";
import assert from "node:assert/strict";
import { wheelStop } from "../lib/wheel";

test("wheel winner matches its pointer segment with varied in-segment stops", () => {
  for (const count of [1, 2, 3, 25]) {
    for (let index = 0; index < count; index++) {
      for (const offset of [0, 0.33, 0.99]) {
        const draws = [index / count + 0.00001, offset, 0.4, 0.6];
        const stop = wheelStop(count, () => draws.shift()!);
        const pointerPosition = ((360 - stop.target) % 360) / (360 / count);
        assert.equal(stop.index, index);
        assert.equal(Math.floor(pointerPosition), index);
        assert.ok(
          pointerPosition - index > 0.17 && pointerPosition - index < 0.83,
        );
      }
    }
  }
  assert.notEqual(
    wheelStop(
      5,
      (() => {
        const d = [0.2, 0, 0, 0];
        return () => d.shift()!;
      })(),
    ).target,
    wheelStop(
      5,
      (() => {
        const d = [0.2, 0.9, 0, 0];
        return () => d.shift()!;
      })(),
    ).target,
  );
});
