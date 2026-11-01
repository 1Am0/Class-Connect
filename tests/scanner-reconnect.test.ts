import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readRememberedScanner,
  reconnectDelay,
  rememberScanner,
  sinceLabel,
} from "../lib/bluetooth/reconnect";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

test("reconnects right away, then backs off to every 30 seconds", () => {
  assert.equal(reconnectDelay(0), 0);
  assert.ok(reconnectDelay(1) < reconnectDelay(3));
  assert.equal(reconnectDelay(6), 30_000);
  assert.equal(reconnectDelay(500), 30_000);
  assert.equal(reconnectDelay(-1), 0);
});

test("remembers the last scanner until it is forgotten", () => {
  const storage = memoryStorage();
  assert.equal(readRememberedScanner(storage), null);
  rememberScanner(storage, { bluetoothId: "ble-1", deviceId: "dev-1" });
  assert.deepEqual(readRememberedScanner(storage), {
    bluetoothId: "ble-1",
    deviceId: "dev-1",
  });
  rememberScanner(storage, null);
  assert.equal(readRememberedScanner(storage), null);
});

test("ignores a damaged saved scanner", () => {
  for (const value of [
    "{",
    "null",
    '{"bluetoothId":"x"}',
    '{"bluetoothId":"","deviceId":"d"}',
  ])
    assert.equal(readRememberedScanner({ getItem: () => value }), null);
  assert.equal(
    readRememberedScanner({
      getItem: () => {
        throw new Error("blocked");
      },
    }),
    null,
  );
});

test("storage that refuses writes doesn't throw", () => {
  const broken = {
    setItem: () => {
      throw new Error("full");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  assert.doesNotThrow(() =>
    rememberScanner(broken, { bluetoothId: "a", deviceId: "b" }),
  );
  assert.doesNotThrow(() => rememberScanner(broken, null));
});

test("last scan reads naturally", () => {
  const now = 10 * 60 * 60_000;
  assert.equal(sinceLabel(now - 20_000, now), "just now");
  assert.equal(sinceLabel(now - 2 * 60_000, now), "2 min ago");
  assert.equal(sinceLabel(now - 2 * 60 * 60_000, now), "2 hr ago");
});
