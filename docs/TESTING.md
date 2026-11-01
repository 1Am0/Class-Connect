# Verification

Run `pnpm test` for pure business logic and PostgreSQL tests. Tests use sample data and a temporary in-memory PGlite database, not your Supabase project.

Run `pnpm build`, then `node scripts/auth-production-smoke.mjs` to check production authentication against a local Supabase stub. It starts its own app server on port 3197 and checks signed-out redirects, a signed-in database outage, the absence of demo/setup screens, forwarded public origins for signup/reset emails and callbacks, and dynamic dashboard rendering. It does not use a real Supabase project or deliver emails.

Run `node scripts/smoke.mjs` while `pnpm dev` is running in local demo mode. This creates one test student, exercises HTTP routes, then deactivates the student and removes their membership. It preserves the test student’s history intentionally. It refuses to run unless the API reports local demo mode.

Run `node scripts/smoke.mjs --bluetooth` to exercise that workflow through the Bluetooth relay endpoint, including signed-out, cross-origin, foreign-device, and heartbeat checks. The automated suite also tests binary packet validation, leading zero UIDs, duplicate notifications, retries, lost acknowledgements, and disconnect handling.

Bluetooth validation on September 16, 2026: all 24 tests, TypeScript, production build, and the Bluetooth HTTP smoke workflow passed. The Bluetooth firmware compiled successfully with ESP32 Arduino core 3.3.11 for ESP32 Dev Module (1,105,731 bytes). Upload and physical BLE/RFID tests are pending the USB board reconnection. See [Bluetooth setup](BLUETOOTH.md).

Coverage includes normalized UIDs and leading zero bytes; automatic schedule boundaries and manual overrides; school dates; unknown and inactive tags; wrong periods; successful scans; duplicates; six concurrent HTTP scans; manual followed by RFID; enrollment capture and expiration; old tag rejection after replacement; removed memberships; balanced groups; present-only eligibility; new-day absences; history preservation; foreign-key tenant isolation; RLS reads; rejected browser writes; and inaccessible device hashes and RPCs.

Schedule tests also cover overlapping bell times, restoring an archived class whose time overlaps another active class, importing overlapping periods, and scanner routing to the lowest period unless a class is selected.

Roster import tests cover pasted names, spreadsheet columns, leading-zero Student Numbers, duplicate identifiers, name-only review candidates, synchronization removals, transaction rollback, tenant isolation, and preservation of attendance and card assignments. Before using a hosted database, apply migration `007`, then try a CSV with a Student Number and a second import that updates the same roster. Confirm that canceling the preview changes nothing, and that Synchronize removes only the intended class memberships.

Weekly schedule tests cover weekday assignment, omitted periods, custom class times, manual scanner selection, school-local dates and daylight saving time. The migration test checks legacy-time backfill, version conflicts, RPC permissions, and scan destination validation. After applying migration `008` on hosted Supabase, try assigning different presets to two weekdays, leave one weekday unassigned, and verify that automatic scanner selection follows those days while a manually selected scanner class remains available.

First-run tests cover migrated teachers, new teacher setup, invalid schedules, and atomic rollback. Attendance queue tests cover reload ordering, teacher isolation, local storage failure, rapid changes, conflicts, and idempotent server operations. Apply migrations `009` and `010` before testing these flows on hosted Supabase.

PGlite executes the migration after removing only the Supabase-managed `pgcrypto` extension and Realtime-publication statements. Actual hosted Auth, subscription delivery, and hardware require the deployment checks below.

## Before using real classroom data

1. Apply the migration in a fresh Supabase project and create a teacher using Auth.
2. Sign in from two separate teacher accounts. Confirm each sees only its own data.
3. Add periods, students, memberships, and a scanner. Save its one-time token.
4. With two dashboard tabs open, change attendance and confirm the second updates.
5. Call `/api/scans` and `/api/devices/heartbeat` using the real device token; check unauthorized responses with a bad token.
6. Enroll a physical tag, confirm a successful scan, then tap repeatedly.
7. Replace its tag and verify the old tag is rejected.
8. Disconnect Wi-Fi during a recognized Bluetooth tap. Confirm the row changes immediately with **Pending sync**, the board shows a slow blink, and the same browser syncs after reconnection. A queued acknowledgement means saved locally, not confirmed by Supabase. Unknown tags still require an online response.
9. Check certificate validation, NTP access, and school Wi-Fi policies on the actual network.
10. Verify the school timezone and deliberately test a period boundary.

Not yet verified on actual hardware: reader voltage/wiring, physical Bluetooth scans and acknowledgements, Wi-Fi sketch HTTPS certificate chain, and LED behavior. No buzzer is wired in this version; GPIO 2 LED and Serial Monitor provide feedback.
