import { test } from "node:test";
import assert from "node:assert/strict";
import { decodePacket, encodeAck } from "../lib/bluetooth/protocol";
import { ScanRelay, type RelayResponse } from "../lib/bluetooth/relay";
import { relayBluetooth, relaySchema } from "../lib/server/bluetooth";
import { demoSeed } from "../lib/demo-seed";
import type { RelayStore } from "../lib/server/bluetooth";
function packet(uid = "04A7318C926680", sequence = 0x12345678) {
  const bytes = new Uint8Array(7 + uid.length / 2);
  bytes.set([1, 1]);
  new DataView(bytes.buffer).setUint32(2, sequence, true);
  bytes[6] = uid.length / 2;
  for (let i = 0; i < uid.length / 2; i++)
    bytes[7 + i] = parseInt(uid.slice(i * 2, i * 2 + 2), 16);
  return new DataView(bytes.buffer);
}
function harness(post: (body: object) => Promise<RelayResponse>) {
  const acks: Uint8Array[] = [];
  const reports: string[] = [];
  let receives = 0,
    updates = 0;
  const relay = new ScanRelay("device", {
    post,
    acknowledge: async (bytes) => {
      acks.push(bytes);
    },
    report: (message) => reports.push(message),
    received: () => receives++,
    updated: () => updates++,
  });
  return { relay, acks, reports, counts: () => ({ receives, updates }) };
}
test("Bluetooth protocol preserves leading zero bytes and 4/7/10-byte tags within default MTU", () => {
  for (const uid of ["00112233", "04A7318C926680", "00010203040506070809"]) {
    const p = packet(uid);
    assert.ok(p.byteLength <= 20);
    assert.deepEqual(decodePacket(p), {
      type: "scan",
      sequence: 0x12345678,
      uid,
    });
  }
  assert.deepEqual(decodePacket(new DataView(Uint8Array.from([1, 2]).buffer)), {
    type: "heartbeat",
  });
  assert.deepEqual(
    [...encodeAck(0x12345678, "enrollment_detected")],
    [1, 3, 0x78, 0x56, 0x34, 0x12, 2],
  );
});
test("Malformed, truncated and unknown Bluetooth messages are rejected", () => {
  for (const bytes of [
    [],
    [1],
    [2, 2],
    [1, 2, 0],
    [1, 7],
    [1, 1, 0, 0, 0, 0, 4, 1],
  ])
    assert.throws(() =>
      decodePacket(new DataView(Uint8Array.from(bytes).buffer)),
    );
});
test("Duplicate notifications share one request and replay its acknowledgement", async () => {
  let calls = 0;
  let resolve!: (value: RelayResponse) => void;
  const h = harness(async () => {
    calls++;
    return new Promise((r) => {
      resolve = r;
    });
  });
  const first = h.relay.accept(packet());
  await h.relay.accept(packet());
  assert.equal(calls, 1);
  resolve({ success: true, status: "checked_in", student: "Test" });
  await first;
  await h.relay.accept(packet());
  assert.equal(calls, 1);
  assert.equal(h.acks.length, 2);
  assert.equal(h.counts().updates, 1);
});
test("a locally queued tap has a distinct ACK only after durable storage finishes", async () => {
  let resolve!: (value: RelayResponse) => void;
  const h = harness(
    async () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const scan = h.relay.accept(packet());
  assert.equal(h.acks.length, 0);
  resolve({ success: true, status: "queued_locally" });
  await scan;
  assert.equal(h.acks[0][6], 3);
  assert.match(h.reports[0], /pending sync/i);
});
test("Temporary network errors can retry the same notification without a false success ACK", async () => {
  let calls = 0;
  const h = harness(async () =>
    ++calls === 1
      ? { success: false, status: "temporarily_unavailable" }
      : { success: true, status: "checked_in" },
  );
  await h.relay.accept(packet());
  assert.equal(h.acks.length, 0);
  await h.relay.accept(packet());
  assert.equal(calls, 2);
  assert.equal(h.acks[0][6], 0);
});
test("Unknown tags return a failure acknowledgement and remain deduplicated", async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { success: false, status: "unknown_tag" };
  });
  await h.relay.accept(packet());
  await h.relay.accept(packet());
  assert.equal(calls, 1);
  assert.equal(h.acks[0][6], 10);
  assert.match(h.reports[0], /Unknown tag/);
});
test("Lost BLE acknowledgement never resubmits an already saved scan", async () => {
  let calls = 0,
    acks = 0;
  const reports: boolean[] = [];
  const relay = new ScanRelay("device", {
    post: async () => {
      calls++;
      return { success: true, status: "checked_in" };
    },
    acknowledge: async () => {
      if (++acks <= 2) throw new Error("Disconnected");
    },
    received: () => {},
    report: (_message, success) => reports.push(success),
    updated: () => {},
  });
  await relay.accept(packet());
  await relay.accept(packet());
  assert.equal(calls, 1);
  // One quiet retry, then the scanner's resend is answered from the cache.
  assert.equal(acks, 3);
  // The scan was saved, so the website never turns the message red.
  assert.deepEqual(reports, [true]);
});
test("Disconnect cancels subsequent actions and pending confirmation delivery", async () => {
  let resolve!: (value: RelayResponse) => void;
  const h = harness(async () => new Promise((r) => (resolve = r)));
  const pending = h.relay.accept(packet());
  h.relay.stop();
  resolve({ success: true, status: "checked_in" });
  await pending;
  await h.relay.accept(packet());
  assert.equal(h.acks.length, 0);
  assert.equal(h.counts().updates, 0);
});
test("Heartbeats never fabricate scans and malformed packets never reach the server", async () => {
  const bodies: object[] = [];
  const h = harness(async (body) => {
    bodies.push(body);
    return { success: true, status: "heartbeat_received" };
  });
  await h.relay.accept(new DataView(Uint8Array.from([1, 2]).buffer));
  await h.relay.accept(new DataView(Uint8Array.from([1, 7]).buffer));
  assert.deepEqual(bodies, [{ action: "heartbeat", deviceId: "device" }]);
  assert.equal(h.acks.length, 0);
});
test("Teacher relay accepts only owned active devices and shares enrollment processing", async () => {
  const s = demoSeed();
  let touches = 0,
    checkIns = 0,
    snapshots = 0;
  const store: RelayStore = {
    snapshot: async () => {
      snapshots++;
      return s;
    },
    activeDevice: async (deviceId) =>
      s.devices.some((device) => device.id === deviceId && device.active),
    touch: async () => {
      touches++;
    },
    checkIn: async () => {
      checkIns++;
      throw new Error("Unexpected attendance write");
    },
  };
  const id = s.devices[0].id;
  assert.equal(
    (await relayBluetooth(store, { action: "heartbeat", deviceId: id })).status,
    "heartbeat_received",
  );
  assert.equal(touches, 1);
  assert.equal(snapshots, 0);
  assert.equal(
    (
      await relayBluetooth(store, {
        action: "heartbeat",
        deviceId: "foreign-device",
      })
    ).status,
    "unauthorized_device",
  );
  assert.equal(touches, 1);
  s.devices[0].enrollment_until = new Date(Date.now() + 60000).toISOString();
  assert.equal(
    (
      await relayBluetooth(store, {
        action: "scan",
        deviceId: id,
        uid: "11223344",
      })
    ).status,
    "enrollment_detected",
  );
  assert.equal(checkIns, 0);
  s.devices[0].active = false;
  assert.equal(
    (
      await relayBluetooth(store, {
        action: "scan",
        deviceId: id,
        uid: "11223344",
      })
    ).status,
    "unauthorized_device",
  );
});
test("Relay schema rejects injected attendance status and malformed device IDs", () => {
  const id = demoSeed().devices[0].id;
  assert.throws(() =>
    relaySchema.parse({
      action: "scan",
      deviceId: id,
      uid: "11223344",
      status: "present",
    }),
  );
  assert.throws(() =>
    relaySchema.parse({ action: "heartbeat", deviceId: "other" }),
  );
});
