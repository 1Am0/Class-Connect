// Exercises the real scanner endpoints against local demo data, without hardware.
import assert from "node:assert/strict";
process.loadEnvFile(".env.local");
assert.equal(process.env.DEMO_MODE, "true");
assert.ok(
  process.env.DEMO_DEVICE_KEY?.length >= 32,
  "Configure DEMO_DEVICE_KEY locally first.",
);
const base = "http://127.0.0.1:3000";
const login = await fetch(base + "/api/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ demo: true }),
});
const cookie = login.headers.get("set-cookie").split(";")[0];
const s = await (
  await fetch(base + "/api/state", { headers: { Cookie: cookie } })
).json();
assert.equal(s.demo, true);
const device = s.devices.find((d) => d.active),
  period = s.periods.find((p) => p.id === s.teacher.override_period_id);
assert.ok(period, "Select a manual demo period first.");
const student = s.students.find(
  (st) =>
    st.active &&
    s.period_students.some(
      (m) => m.student_id === st.id && m.period_id === period.id,
    ),
);
const tag = s.rfid_tags.find((t) => t.active && t.student_id === student.id);
async function post(path, body) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { r, j: await r.json() };
}
const auth = {
  deviceId: device.device_identifier,
  apiKey: process.env.DEMO_DEVICE_KEY,
};
assert.equal(
  (await post("/api/devices/heartbeat", auth)).j.status,
  "heartbeat_received",
);
const first = await post("/api/scans", { ...auth, uid: tag.uid });
assert.equal(first.r.status, 200);
assert.equal(first.j.success, true);
assert.equal(
  (await post("/api/scans", { ...auth, uid: tag.uid })).j.status,
  "already_checked_in",
);
assert.equal(
  (await post("/api/scans", { ...auth, uid: "FFFFFFFF" })).j.status,
  "unknown_tag",
);
console.log(
  "PASS: real /api/scans and heartbeat authenticated with the private demo device key; successful scan, duplicate, and unknown tag verified.",
);
