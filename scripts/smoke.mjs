// Run against a local DEMO_MODE server only. Creates and deactivates a test student.
import assert from "node:assert/strict";
const base = "http://127.0.0.1:3000";
const bluetooth = process.argv.includes("--bluetooth");
let cookie = "";
async function request(path, body, method = body ? "POST" : "GET") {
  if (bluetooth && path === "/api/simulate") {
    path = "/api/bluetooth";
    body = { ...body, action: "scan" };
  }
  const r = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: base,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { r, j: await r.json() };
}
assert.equal((await request("/api/state")).r.status, 401);
if (bluetooth)
  assert.equal(
    (await request("/api/bluetooth", { action: "heartbeat" })).r.status,
    401,
  );
const login = await request("/api/auth", { demo: true });
assert.equal(login.r.status, 200);
cookie = login.r.headers.get("set-cookie").split(";")[0];
let { j: s } = await request("/api/state");
assert.equal(s.demo, true, "Never run this script against a real classroom.");
// Upgrade only invalid UIDs from the early, disposable local seed.
for (const tag of s.rfid_tags.filter((t) => t.active && t.uid.length === 7)) {
  assert.equal(
    (
      await request("/api/manage", {
        action: "tag",
        student_id: tag.student_id,
        uid: tag.uid.padStart(8, "0"),
      })
    ).r.status,
    200,
  );
}
const period =
  s.periods.find((p) => p.id === s.teacher.override_period_id) ?? s.periods[0];
const originalOverride = s.teacher.override_period_id;
assert.equal(
  (
    await request("/api/manage", {
      action: "settings",
      override_period_id: period.id,
    })
  ).r.status,
  200,
);
const testName = "Workflow " + Date.now();
const createdStudent = await request("/api/manage", {
  action: "student",
  first_name: "Workflow",
  last_name: "Test",
  display_name: testName,
  active: true,
});
s = (await request("/api/state")).j;
const student = s.students.find((st) => st.display_name === testName),
  device = s.devices.find((d) => d.active);
assert.equal(createdStudent.j.id, student.id, "New student response identifies the saved row.");
const tag = "F" + Date.now().toString(16).slice(-7).toUpperCase();
try {
  const enrollmentA = await request("/api/manage", { action: "enrollment", device_id: device.id, enabled: true });
  const enrollmentB = await request("/api/manage", { action: "enrollment", device_id: device.id, enabled: true });
  assert.ok(enrollmentA.j.enrollment_until);
  assert.notEqual(enrollmentA.j.enrollment_until, enrollmentB.j.enrollment_until);
  await request("/api/manage", { action: "enrollment", device_id: device.id, enabled: false, expected_until: enrollmentA.j.enrollment_until });
  assert.equal((await request("/api/state")).j.devices.find(d => d.id === device.id).enrollment_until, enrollmentB.j.enrollment_until, "Closing an older form must not cancel newer tag setup.");
  await request("/api/manage", { action: "enrollment", device_id: device.id, enabled: false, expected_until: enrollmentB.j.enrollment_until });
  assert.equal((await request("/api/state")).j.devices.find(d => d.id === device.id).enrollment_until, null);
  if (bluetooth) {
    assert.equal(
      (
        await request("/api/bluetooth", {
          action: "heartbeat",
          deviceId: device.id,
        })
      ).j.status,
      "heartbeat_received",
    );
    assert.equal(
      (
        await request("/api/bluetooth", {
          action: "heartbeat",
          deviceId: "00000000-0000-4000-8000-000000000000",
        })
      ).r.status,
      403,
    );
    const crossOrigin = await fetch(base + "/api/bluetooth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        Origin: "https://example.invalid",
      },
      body: JSON.stringify({ action: "heartbeat", deviceId: device.id }),
    });
    assert.equal(crossOrigin.status, 403);
  }
  assert.equal(
    (
      await request("/api/manage", {
        action: "membership",
        student_id: student.id,
        period_id: period.id,
      })
    ).r.status,
    200,
  );
  assert.equal(
    (
      await request("/api/manage", {
        action: "tag",
        student_id: student.id,
        uid: tag,
      })
    ).r.status,
    200,
  );
  const scans = await Promise.all(
    Array.from({ length: 6 }, () =>
      request("/api/simulate", { deviceId: device.id, uid: tag }),
    ),
  );
  assert.equal(scans.filter((x) => x.j.status === "checked_in").length, 1);
  assert.equal(
    scans.filter((x) => x.j.status === "already_checked_in").length,
    5,
  );
  s = (await request("/api/state")).j;
  assert.equal(
    s.attendance_records.filter((r) => r.student_id === student.id).length,
    1,
  );
  const record = s.attendance_records.find((r) => r.student_id === student.id),
    session = s.attendance_sessions.find(
      (x) => x.id === record.attendance_session_id,
    );
  const manual = {
    action: "attendance",
    student_id: student.id,
    period_id: period.id,
    date: session.date,
  };
  await request("/api/manage", { ...manual, status: "absent" });
  await request("/api/manage", { ...manual, status: "present" });
  assert.equal(
    (await request("/api/simulate", { deviceId: device.id, uid: tag })).j
      .status,
    "already_checked_in",
  );
  s = (await request("/api/state")).j;
  assert.equal(
    s.attendance_records.find((r) => r.id === record.id).source,
    "manual",
  );
  assert.equal(
    (await request("/api/simulate", { deviceId: device.id, uid: "FFFFFFFF" })).j
      .status,
    "unknown_tag",
  );
  const other = s.periods.find((p) => p.id !== period.id);
  await request("/api/manage", {
    action: "settings",
    override_period_id: other.id,
  });
  assert.equal(
    (await request("/api/simulate", { deviceId: device.id, uid: tag })).j
      .status,
    "wrong_period",
  );
  await request("/api/manage", {
    action: "settings",
    override_period_id: period.id,
  });
  await request("/api/manage", {
    action: "enrollment",
    device_id: device.id,
    enabled: true,
  });
  assert.equal(
    (await request("/api/simulate", { deviceId: device.id, uid: "01234567" })).j
      .status,
    "enrollment_detected",
  );
  assert.equal(
    (await request("/api/state")).j.devices.find((d) => d.id === device.id)
      .pending_uid,
    "01234567",
  );
  await request("/api/manage", {
    action: "enrollment",
    device_id: device.id,
    enabled: false,
  });
  await request("/api/manage", {
    action: "tag",
    student_id: student.id,
    uid: "E" + tag.slice(1),
  });
  assert.equal(
    (await request("/api/simulate", { deviceId: device.id, uid: tag })).j
      .status,
    "unknown_tag",
  );
  assert.equal(
    (
      await request("/api/scans", {
        deviceId: device.device_identifier,
        apiKey: "wrong",
        uid: tag,
      })
    ).r.status,
    401,
  );
  assert.equal(
    (
      await request("/api/devices/heartbeat", {
        deviceId: device.device_identifier,
        apiKey: "wrong",
      })
    ).r.status,
    401,
  );
  await request("/api/manage", {
    action: "membership",
    student_id: student.id,
    period_id: period.id,
    remove: true,
  });
  assert.equal(
    (
      await request("/api/simulate", {
        deviceId: device.id,
        uid: "E" + tag.slice(1),
      })
    ).j.status,
    "wrong_period",
  );
  console.log(
    "PASS: authenticated APIs, six simultaneous scans, manual + RFID, unknown tag, wrong period, enrollment, replacement, removed membership, unauthorized hardware.",
  );
} finally {
  await request("/api/manage", {
    action: "enrollment",
    device_id: device.id,
    enabled: false,
  });
  await request("/api/manage", {
    action: "student",
    id: student.id,
    first_name: "Workflow",
    last_name: "Test",
    display_name: testName,
    active: false,
  });
  await request("/api/manage", {
    action: "membership",
    student_id: student.id,
    period_id: period.id,
    remove: true,
  });
  await request("/api/manage", {
    action: "settings",
    override_period_id: originalOverride,
  });
}
