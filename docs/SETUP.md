# Class Connect: full setup and reference guide

A teacher-facing engineering capstone built with **Next.js, TypeScript, React, Tailwind CSS, and Supabase**. Students tap an RFID tag; an ESP32 sends its UID through a laptop Bluetooth relay or directly over HTTPS; the teacher sees attendance update automatically. The same attendance powers a random student wheel and balanced group generator.

For school guest Wi-Fi with a browser acceptance page, use the [Bluetooth setup guide](BLUETOOTH.md). The laptop handles the network connection; the ESP32 needs only power and Bluetooth. Keep the laptop awake and the app tab open.

## What is included

- Teacher sign-up, sign-in, password recovery, secure server routes, and teacher-owned database records.
- Class schedules with automatic routing and a persistent manual scanner override.
- Student editing, bulk roster import, activation, multi-period membership, RFID enrollment, and tag replacement.
- Live attendance, four manual statuses, first-check-in preservation, and duplicate prevention.
- Random student wheel with avoid-repeats and reset; present-only balanced groups with copy and print.
- Session history with date, period, student search, status filters, and CSV export.
- Device provisioning, hashed scanner tokens, heartbeat status, and a developer-only simulator.
- A local demo with real server processing and disk persistence; PostgreSQL migration and optional hosted seed.
- ESP32 sketch, wiring guide, API contract, unit tests, SQL/RLS tests, and HTTP workflow checks.

The interface has a sidebar, searchable class attendance roster, and classroom tools. It adapts to desktop, tablet, and phone layouts.

## Run locally in demo mode

Use Node.js 22 or newer and pnpm. Node.js 24 was used for validation.

```sh
pnpm install
```

Copy `.env.example` to `.env.local`. Keep `DEMO_MODE=true` and `ENABLE_SIMULATOR=true` for the local demo; Supabase variables may stay empty.

```sh
pnpm dev
```

Open **http://127.0.0.1:3000** and choose **Open demo classroom**. The demo contains three periods with 28, 31, and 29 enrolled students. Some students appear in multiple periods. Period 3 starts with a manual scanner override so demonstrations work regardless of the current time.

The demo is stored in `.demo/attendance.json`, outside Git. To reset this disposable sample data, stop the server, delete that file, and restart. Demo mode is deliberately disabled in production and on Vercel. `pnpm build && pnpm start` requires Supabase to use the application; use `pnpm dev` for the demo.

## Configure Supabase

1. Create a new Supabase project.
2. Run `supabase/migrations/001_classroom.sql` in the SQL Editor, or apply it with the Supabase CLI. Then apply migrations `002` through `011` in filename order. Existing databases need only migrations they have not yet applied. Migration `009` handles first-run setup, `010` handles the browser attendance queue, and `011` adds school emails and QR check-in. Apply the missing scripts to hosted Supabase before deploying this version. Existing classes, attendance history, and cards are preserved.
3. In **Authentication → Providers → Email**, enable email/password signups and decide whether email confirmation is required. Only teachers create Supabase accounts. Students verify their school Google account directly for QR check-in; they never get a teacher profile or Supabase account. The `new_teacher` trigger in migration `001` creates each new teacher profile from the sign-up username.
4. In **Authentication → URL Configuration**, set the Site URL to your deployment origin and allow the local origin (`http://127.0.0.1:3000`) and hosted callback URLs (`https://YOUR_DOMAIN/auth/confirm`) as redirect URLs. Include `http://127.0.0.1:3000/auth/confirm` for local Supabase testing. Use the actual port if it differs.
   For Google sign-in, also allow the exact callback URLs `https://YOUR_DOMAIN/auth/confirm?flow=google` and, if testing locally against hosted Supabase, `http://127.0.0.1:3000/auth/confirm?flow=google`.
5. For reliable server-side email links across devices, edit **Authentication → Email Templates**. In **Confirm signup**, use `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm your email</a>`. In **Reset password**, use `<a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>`. The app also accepts PKCE `code` redirects from default templates when the same browser retains its verifier. Supabase's SMTP delivery must be configured for production; its built-in sender is rate limited. These Dashboard changes cannot be made by the website code.
6. Set `.env.local` to the values below. The app supports both legacy names and newer Vercel/Supabase integration names for public values.

```dotenv
DEMO_MODE=false
ENABLE_SIMULATOR=true
# Public URL (preferred first, fallback second):
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
# SUPABASE_URL=https://YOUR_PROJECT.supabase.co

# Public/browser key (preferred first, fallbacks after):
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_OR_PUBLISHABLE_KEY
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
# SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY

# Server-only privileged key (preferred first, fallback second):
# SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Your school's student email domain (ID 123456 -> 123456@students.example.edu):
NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN=students.example.edu

# Required for student QR check-in (students type their school ID):
QR_CHECKIN_SECRET=GENERATE_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
# Optional: use school Google sign-in instead of the ID form (needs IT approval):
# GOOGLE_STUDENT_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID
# GOOGLE_STUDENT_DOMAIN=students.example.edu
# GOOGLE_STUDENT_HOSTED_DOMAIN=CONFIRMED_DOMAIN_FROM_SCHOOL_IT
```

Restart the dev server after changing environment variables.

#### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DEMO_MODE` | Local only | `true` runs the local demo without Supabase. Ignored in production builds and on Vercel. |
| `ENABLE_SIMULATOR` | No | `true` shows the card-scan simulator outside production. |
| `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`) | Hosted | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`) | Hosted | Public browser key. |
| `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) | Hosted | Server-only admin key. Never prefix with `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN` | For QR check-in | Domain of student school emails. A six-digit School ID `123456` becomes `123456@<domain>`. Defaults to `students.example.edu`. The browser uses it too, so it is public and fixed at build time: redeploy after changing it. Set it before adding students. Changing it later does not rewrite emails already saved, and students whose saved email uses the old domain can't check in by QR until their School ID is saved again in **Edit student** or re-imported. |
| `QR_CHECKIN_SECRET` | For QR check-in | Server-only signing secret, at least 32 random characters. |
| `GOOGLE_STUDENT_CLIENT_ID` | No | Google Web client ID for student Google sign-in. |
| `GOOGLE_STUDENT_DOMAIN` | With Google sign-in | Must equal `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN`; Google sign-in stays off otherwise. |
| `GOOGLE_STUDENT_HOSTED_DOMAIN` | No | Google Workspace `hd` claim, if it differs from the email domain (for example `example.edu` for `students.example.edu`). |
| `DEMO_DEVICE_KEY` | No | Local demo hardware token, at least 32 random characters. | Use **Create account** on the sign-in page, or sign in with an existing teacher account. Registration requires a username, email address, and password of 8–20 characters with an uppercase letter and a number. If email confirmation is enabled, follow the email link before signing in. New teachers then enter their first class and weekly schedule; existing teachers and the local demo bypass this step. Settings → Account lets teachers change their username and password or request a reset email.

`NEXT_PUBLIC_` variables are public by design. Never put `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or a device token in a `NEXT_PUBLIC_` variable. The device-token hash is excluded from all dashboard responses and cannot be selected by authenticated browser roles.

The server verifies Supabase users rather than trusting an unverified session. All teacher mutations check ownership and validate their input. RLS limits browser reads to the signed-in teacher; browser database writes and privileged RPC calls are denied. `proxy.ts` refreshes cookies. See [architecture notes](ARCHITECTURE.md) for details.

### Enable Google sign-in

Google sign-in uses the existing teacher account and first-run setup. To activate the button on the hosted site:

1. In Google Cloud Auth Platform, configure the OAuth consent screen and create a **Web application** OAuth client. Add your website origin under **Authorized JavaScript origins**. Add the Supabase Auth callback URL shown in **Supabase → Authentication → Providers → Google** under **Authorized redirect URIs**. This is the Supabase callback, not the website's `/auth/confirm` route.
2. Copy the Google client ID and client secret into Supabase's **Google** provider settings and enable that provider. Keep the secret in the dashboard; the website needs no Google secret or new environment variable.
3. Add the website's `/auth/confirm?flow=google` URLs to **Supabase → Authentication → URL Configuration → Redirect URLs**, as described above. Use the real production domain and, if needed, the exact local URL. A Google Workspace administrator may also need to allow the OAuth application for school accounts.
4. Confirm migrations `001` through `010` have been applied to hosted Supabase, especially `009` for first-run setup and `010` for the attendance queue. Then test a new Google account and an existing verified email/password teacher account. Supabase links verified matching emails; do not create a second teacher profile or manually copy classroom records.

The local demo does not connect to Supabase and does not offer Google sign-in. Email/password registration and sign-in remain available.

### Student QR check-in

Students scan the class QR code on their phone and type their six-digit student ID. No school IT approval or student accounts are needed.

1. Apply migrations `011_student_qr_checkin.sql` and `012_school_student_ids.sql` after `001`–`010`. Neither deletes attendance or cards. If you already have students with six-digit IDs, run `set app.student_email_domain = 'your.domain';` in the same SQL Editor run, before `012`, so it fills their school emails. A new database can skip that line.
2. Set `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN` to your school's student email domain (see [Environment variables](#environment-variables)). Set `QR_CHECKIN_SECRET` on the hosted site to a random server-only secret of at least 32 characters (for example, the output of `openssl rand -base64 48`), then redeploy.
3. Enter each student's six-digit School ID in **Edit student**, or map the **Student number** column during roster import. Students without an ID show **School ID needed** and can't use QR; cards and manual attendance still work for them.
4. Open the class page and select **QR code** in its banner. Keep it on the projector: the code changes every 20 seconds. Students scan it, type their ID, and see "You're checked in, Ada L." (first name and last initial, so a mistyped ID is noticed).

How it stays fair: the code is signed for one class, one school day and a 20-second window. A scan opens check-in only if the code was on the board within about the last minute, and the student then has five minutes to enter their ID, so a photo passed around soon stops working. Check-in only saves during that class's scheduled time, so nobody can check in early. Each phone can check in one student per class per day, so one student can't check in friends from their phone. Repeated scans don't duplicate attendance, and a student already marked late or excused keeps that status. QR check-ins show a **QR** tag on the roster, so a quick look around the room catches anyone who isn't there.

Limits: a classmate who sends a live photo or video of the board within the minute could still let someone check in from elsewhere, and someone who knows a classmate's ID could use a second phone. For stronger identity, the page uses school Google sign-in instead whenever `GOOGLE_STUDENT_CLIENT_ID` is set and `GOOGLE_STUDENT_DOMAIN` equals `NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN`; that needs the school's Google Workspace administrator to allow the OAuth client for students.

Use a public HTTPS deployment when students scan from their own phones. A QR link containing `127.0.0.1` points back to the student's phone and will not reach the teacher's local server.

### Activity sets

Apply `supabase/migrations/013_activity_sets.sql` to hosted Supabase after `012`. Until it is applied, the existing classroom continues to load, but new activity sets cannot be saved. Teachers can create reusable vocabulary, conversation, and sentence sets in **Activities → Activity sets**. The top activity choices open Conversation prompts, Sentence scramble, and Vocabulary matching. Sets belong to the teacher and can be reused across class periods. The local demo saves sets in `.demo/attendance.json` without a migration.

Apply `supabase/migrations/014_class_banners.sql` after `013` so class banner themes, colors, and uploaded photos follow the teacher to every browser. It adds `teachers.class_banners` and a private `class-banners` storage bucket that only the server reads and writes. Banners a teacher already set in a browser move to their account on the next visit. Until it is applied, and in the local demo, banners are saved in each browser as before.

Apply `supabase/migrations/015_local_changes_win.sql` after `014`. Attendance changed in the teacher's browser then always overwrites the copy in Supabase. Before it, a queued change was refused as "changed elsewhere" when the cloud copy had moved on, and the cloud value stayed. A scan still never downgrades a student who is already present or late.

Apply `supabase/migrations/016_attendance_notes.sql` after `015` for optional attendance notes. Teachers turn notes and roster keyboard shortcuts on in **Settings → Attendance**; both are off by default and saved per browser. Notes are saved like other attendance changes, so they work offline, and they appear in Export CSV.

In a new or existing set, use **Import words**, **Import prompts**, or **Import sentences** to paste rows or upload a CSV. Preview the rows, then choose whether to add them or replace the draft's current items. Save the set to keep the import. In Vocabulary matching, click either a word or a meaning and then its counterpart; each correct pair stays connected by a colored line.

### Optional hosted sample data

Use an empty teacher account in a development Supabase project. Get its UUID from Auth Users and run:

```sh
# Set SEED_TEACHER_ID to your test teacher UUID in the shell first.
node --env-file=.env.local --import tsx scripts/seed.ts
```

The seed creates class data and sets Period 3 as the scanner override. It refuses to seed an account with existing periods. Create a real scanner from the website; the seed never creates a production device secret. If a seed run fails partway, inspect the reported database error before retrying; it is not a destructive reset script.

## Languages

Class Connect is available in English and Spanish. Teachers choose under **Settings → Appearance → Language** (or on the sign-in page); the choice is saved in that browser. Visitors who haven't chosen get their browser's language, so students' phones open the check-in page in Spanish when that is the phone's language, and they can switch at the top of the page.

All interface text lives in `lib/i18n/`:

- `lib/i18n/en/*.ts` — English, one file per area (`attendance.ts`, `settings.ts`, …). This is the source of truth.
- `lib/i18n/es/*.ts` — Spanish, with the same keys. TypeScript and `tests/i18n.test.ts` fail if a key or a `{placeholder}` is missing.
- `lib/i18n/es/server-messages.ts` — Spanish for messages that come from the server or shared code, keyed by their English text (`"Row {line}: Student Number is invalid."`).
- `lib/i18n/help/es.ts` — the Help Center articles in Spanish.

Text can use `{name}` placeholders, plural forms (`{ one: "1 student", other: "{count} students" }`) and simple tags for bold text (`"Last tap: <b>{name}</b>"`). Dates and times use the language's own format.

**Adding a language** (French as an example):

1. Copy `lib/i18n/en` to `lib/i18n/fr` and translate the values. You can translate one file at a time; anything not translated yet shows in English.
2. Run `node scripts/i18n-index.mjs` to rebuild the folder's index.
3. Add `{ code: "fr", name: "Français", intl: "fr-FR" }` to `lib/i18n/locales.ts` and `fr` to the packs in `lib/i18n/catalog.ts`.
4. Optionally add `lib/i18n/fr/server-messages.ts` (registered in `lib/i18n/server-messages.ts`) and `lib/i18n/help/fr.ts` (registered in `lib/i18n/help/index.ts`).

## Daily teacher workflow

1. Add each class’s name, period number, start time, and end time. Different periods may overlap, but active classes need distinct period numbers. Set the school timezone in **Settings → Account & school day**. Open **Edit weekly schedule** there to adjust automatic routing.
2. Open a class and use **Add student** in its attendance roster. A school-issued Student Number is optional for roster imports. The separate student directory has been removed.
3. Choose a class to view its roster. The routing line shows where scans go and offers **Send scans to this class** when destinations differ. Viewing a class alone does **not** redirect the physical scanner.
4. On **Scanner**, use **Attendance destination** to select a class for scanner taps. Choose **Follow class schedule** to resume automatic routing. When active class times overlap, automatic routing picks the lowest period number. A selected class stays in effect until you clear it, including after midnight.
5. Students scan their tags, or the teacher chooses Present, Absent, Late, or Excused from a row’s dropdown. Manual changes appear immediately with **Pending sync** while the browser saves them locally and retries Supabase. **Undo** queues a restoration of the prior record. **Select students to mark together** changes only explicitly checked students, up to 100 at a time, and reports individual failures. Clicking a student’s name focuses their status control.
6. Open **Random student** or **Create groups**. Only the students explicitly marked Present are eligible. Late and Excused are excluded in this version.
7. Open **Attendance history**, choose a date and period, then search/filter or use **Export CSV** above the roster. History starts read-only; choose **Correct this day** to edit, then **Done correcting** to finish. Viewing history never changes the active scanner period. CSV cells that could be interpreted as formulas are escaped.

Sessions belong to a school date plus a period. New sessions begin absent and are created when the active class is observed or first receives attendance. They preserve the initial roster even when a student later leaves. Days with no dashboard activity or scans do not get artificial absence sessions. No morning reset button is needed.

## Import a class roster

1. Open **Add class** or **Edit class**, then choose **Import roster**.
2. Paste one student per line or upload a CSV export from a spreadsheet or school system. XLSX files should be exported as CSV first. Paste supports `First Last`, `Last, First`, `First, Last`, and tab-separated spreadsheet columns; choose the name order when needed.
3. For CSV, map its full-name column or first/last columns and optional Student Number column. Check whether the first row is a heading. Preview and correct each row, remove unwanted rows, and resolve possible matches. Student Numbers are stored as text so leading zeroes remain intact.
4. Choose **Add students** to keep the current roster or **Synchronize** to remove students missing from the imported list. Synchronize shows exactly which students will leave this class and requires an explicit confirmation. It removes only class membership: student records, past attendance, and card assignments stay saved.
5. Confirm and read the results. Imported students may have no card; open their student profile to assign one later. Repeated imports match a saved Student Number automatically. Existing names and card assignments are not overwritten.

Imports are limited to 500 students and CSV files under 1 MB. The server validates every row and applies the confirmed changes in one database transaction. If the class roster changed while the preview was open, refresh and preview again. Canceling before confirmation saves nothing. A teacher can import only into their own active class.

## Add a scanner and enroll tags

1. In a Supabase-backed classroom, open **Scanner → Add scanner**.
2. Enter a friendly name and unique identifier, such as your own room identifier.
3. Save the generated secret immediately. It is displayed once to the authenticated teacher for provisioning; only a SHA-256 hash is stored. It is never embedded in client bundles or subsequent dashboard responses.
4. Copy the identifier and token into the ESP32’s private `secrets.h`.
5. Open a student's edit dialog from their class attendance roster, then choose **Tag → Start enrollment**. Tap the new tag on the selected reader. The UID appears automatically. Confirm to assign it.
6. Enrollment pauses attendance on that scanner for up to ten minutes. Closing the dialog returns it to attendance; **Scanner → End enrollment** also cancels it.
7. Assigning a replacement deactivates the old tag atomically. A UID already belonging to another student cannot be reassigned through this first version.

Device tokens are high-entropy generated values. To replace a compromised token, disable the old device and add a new identifier/token, then update firmware. No teacher password belongs in the ESP32.

## Test without hardware

In local development, open **Scanner** and use the RFID simulator. Choose a student or enter a UID. This calls `/api/simulate`, which authenticates the teacher and invokes the **same `processScan()` function** used by `/api/scans`. It also updates scanner last-seen time. The simulator is unavailable in production even if `ENABLE_SIMULATOR=true`.

For enrollment testing, use a second tab: start enrollment for a student in one tab, then simulate a new UID in the other. The first tab should show the captured UID automatically.

```sh
pnpm test
pnpm typecheck
pnpm build
# With a local demo dev server running:
node scripts/smoke.mjs
```

The smoke script leaves an inactive test student and its test attendance history, and restores the previous override. It never deletes classroom data. See [testing notes](TESTING.md).

## ESP32 API

Send `Content-Type: application/json` over HTTPS. The same scanner identifier works for every period; the server chooses the class using the teacher’s timezone, schedule, and override.

```http
POST /api/scans
```

```json
{
  "deviceId": "YOUR_DEVICE_IDENTIFIER",
  "apiKey": "YOUR_DEVICE_TOKEN",
  "uid": "04A7318C926680"
}
```

UIDs are normalized to uppercase; colons, hyphens, and spaces are accepted. Valid lengths are 4, 7, or 10 bytes. The server records its receipt time, not an untrusted device-supplied clock.

| HTTP | Status                    | Meaning                                                  |
| ---- | ------------------------- | -------------------------------------------------------- |
| 200  | `checked_in`              | Saved attendance, with student, period number, timestamp |
| 200  | `already_checked_in`      | Existing present/late record preserved                   |
| 200  | `enrollment_detected`     | UID captured; no attendance change                       |
| 422  | `unknown_tag`             | UID has no active student/tag assignment                 |
| 422  | `wrong_period`            | Student is not enrolled in the current class             |
| 422  | `no_active_period`        | No scheduled or manually selected class                  |
| 401  | `unauthorized_device`     | Missing, invalid, or disabled device credentials         |
| 400  | `invalid_request`         | Invalid JSON, UID, or fields                             |
| 409  | `conflict`                | Data changed during processing or violates a constraint  |
| 503  | `temporarily_unavailable` | Temporary server/database error; retry safely            |

Heartbeat:

```http
POST /api/devices/heartbeat
```

```json
{ "deviceId": "YOUR_DEVICE_IDENTIFIER", "apiKey": "YOUR_DEVICE_TOKEN" }
```

The sketch sends heartbeats every 20 seconds. The dashboard considers communication online for 60 seconds. A repeated successful scan never duplicates attendance or replaces the first timestamp. The sketch also suppresses same-tag reads for four seconds.

For direct HTTP testing in **local demo mode**, set `DEMO_DEVICE_KEY` to a random string of at least 32 characters. Requests can use the displayed local scanner identifier and that key. No default demo device key is included. This option is ignored in production.

## ESP32 wiring and firmware

Use a classic ESP32 DevKit and an MFRC522 module over SPI:

| MFRC522 pin | ESP32 pin           |
| ----------- | ------------------- |
| SDA / SS    | GPIO 5              |
| SCK         | GPIO 18             |
| MOSI        | GPIO 23             |
| MISO        | GPIO 19             |
| RST         | GPIO 22             |
| GND         | GND                 |
| 3.3V        | **3.3V — never 5V** |

```text
NTAG213 tag ──RF──> MFRC522 ──SPI──> ESP32 ──Wi-Fi / HTTPS──> Next.js
                      │               │
                      └── 3.3V / GND ─┘
```

Install the **esp32 board package by Espressif**, **MFRC522 by GithubCommunity/Miguel Balboa**, and **ArduinoJson 7** in Arduino IDE. WiFi, WiFiClientSecure, HTTPClient, SPI, and time are supplied by the ESP32 core. Select your board and serial port.

Open `esp32/ClassroomScanner/ClassroomScanner.ino`. Copy `secrets.example.h` to `secrets.h` in that sketch folder and fill in Wi-Fi, HTTPS base URL, scanner identifier, token, and the root CA certificate for your deployment. Obtain the PEM root from the certificate authority’s official site after checking your domain’s certificate chain. Do not disable certificate validation. NTP access is required to establish a valid clock. Update the root certificate if your hosting certificate chain changes.

Upload the sketch and open Serial Monitor at **115200 baud**. GPIO 2 is used for feedback; change `LED_PIN` if your ESP32 board uses a different built-in LED. A confirmed scan lights the LED; a failed scan blinks until the next successful confirmation. No buzzer is included.

The sketch holds one pending scan for at most 20 seconds, retries network/server errors up to three times, and reconnects Wi-Fi. If the queue is occupied, it tells the next student to retap. If retries expire, the student must retap or the teacher must mark attendance manually. Queue data is not retained across power loss. This is short-interruption protection, not a durable offline attendance system. The server’s receipt-time period applies to retries.

## Deploy to Vercel

1. Push this project to your Git provider and import it into Vercel as a Next.js project.
2. Use `pnpm install` and `pnpm build`, or Vercel’s detected defaults. Keep the lockfile committed.
3. Add public Supabase values (`NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`, plus one of `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or `SUPABASE_PUBLISHABLE_KEY`) and one server-only admin key (`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`). Set `DEMO_MODE=false` and `ENABLE_SIMULATOR=false`.
4. Apply the Supabase migration and provision the teacher before first use.
5. Add the deployment origin to Supabase Auth’s site/redirect settings and redeploy after changing public environment variables.
6. Use the deployment’s HTTPS origin in ESP32 `API_BASE`, provision its token, and configure the matching root CA.

No Vercel or Supabase project was deployed as part of the local build. No production credentials were provided.

## Troubleshooting

| Symptom                              | Check                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Setup page instead of dashboard      | Supabase URL/key values, migration, teacher profile; use local demo only with `pnpm dev` |
| Login rejected                       | Teacher exists in Auth and has a password; account email is confirmed                    |
| Sign-up or reset email missing       | Enable email signups, configure SMTP and templates, check redirect allow list and spam   |
| Scanner unauthorized                 | Exact device identifier/token, device enabled, correct deployment URL                    |
| No active period                     | School timezone, configured times, or set **Use for scanner**                            |
| Wrong period                         | Student’s period checkboxes and scanner override                                         |
| Unknown tag                          | Active UID assignment; old tags are deactivated after replacement                        |
| Enrollment never receives a tag      | Correct enabled device, active enrollment window, recent heartbeat                       |
| Dashboard offline                    | Request reaching server, Wi-Fi, TLS root, NTP, and last-seen time                        |
| No Realtime updates                  | Publication and RLS setup; 1.5-second polling should still reconcile state               |
| Failed HTTP / certificate error      | Valid clock and CA, HTTPS URL, school firewall/captive portal; inspect Serial Monitor    |
| Clipboard fails                      | Allow clipboard access on a secure origin; localhost is normally a secure context        |
| History seems empty                  | A session exists only after the active class is observed or receives attendance          |
| pnpm reports blocked esbuild scripts | Use `pnpm approve-builds` and approve only esbuild, then rerun install                   |

## Verification status and remaining work

Implemented and locally verified: web workflows, shared scan processor, authenticated local HTTP routes, duplicate/concurrent scan handling, production build/type checking, PostgreSQL schema/functions, and RLS isolation. The SQL tests use PGlite; hosted Realtime publication wiring and actual Supabase Auth must be checked with your own project.

Still requires your environment: Supabase credentials and migration application, Vercel deployment, physical wiring, board compilation/upload, Wi-Fi/certificate configuration, and end-to-end tests on the actual ESP32/MFRC522. These are not claimed as hardware-tested.

Deliberately outside this first version: durable multi-scan offline queues, immutable tap audit logs, school-wide administration, direct PowerSchool connections, native XLSX upload, automatic all-day calendar attendance generation, and multi-room routing for one teacher. For larger deployments, replace full-state polling with narrower date-scoped reads. Core requested teacher workflows are implemented.

## Files to understand first

| File                                           | Responsibility                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `lib/core.ts`                                  | Shared scan pipeline, schedule, UID handling, group and eligibility logic |
| `lib/server/store.ts`                          | Supabase/local persistence adapter                                        |
| `supabase/migrations/001_classroom.sql`        | Tables, constraints, RLS, atomic write functions                          |
| `supabase/migrations/005_home_preferences.sql` | Teacher-specific Home class order, plus unused legacy fields              |
| `lib/server/auth.ts`                           | Verified teacher/device authentication and HTTP errors                    |
| `app/api/scans/route.ts`                       | Physical scanner endpoint                                                 |
| `app/api/manage/route.ts`                      | Validated teacher commands                                                |
| `components/classroom.tsx`                     | Dashboard shell, selected class, live synchronization                     |
| `components/attendance.tsx`                    | Attendance and history interface                                          |
| `components/tools.tsx`                         | Wheel and groups                                                          |
| `app/globals.css`                              | Theme, responsive layout, print styles                                    |
| `esp32/ClassroomScanner/ClassroomScanner.ino`  | Complete firmware example                                                 |
| `tests/` and `scripts/smoke.mjs`               | Business, database, and HTTP verification                                 |

Further reading: [project architecture](ARCHITECTURE.md), [testing checklist](TESTING.md), [Supabase SSR authentication](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Next.js route handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [MFRC522 library](https://github.com/miguelbalboa/rfid), and [Espressif HTTP/TLS documentation](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/protocols/esp_http_client.html).

## Complete ESP32 example

Use this with `secrets.h` configured as described above. The canonical editable file is in `esp32/ClassroomScanner/`.

```cpp
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>
#include <time.h>
#include "secrets.h"

// Classic ESP32 DevKit pinout. Power RC522 from 3.3V, NEVER 5V.
constexpr uint8_t SS_PIN=5, RST_PIN=22, LED_PIN=2;
MFRC522 reader(SS_PIN,RST_PIN);
String pendingUid, lastUid;
uint32_t lastScan=0, lastWifiAttempt=0, lastHeartbeat=0, nextAttempt=0, queuedAt=0;
uint8_t attempts=0;
bool failedScan=false;
constexpr uint32_t RETRY_WINDOW_MS=20000;

void indicate(bool ok) {
  digitalWrite(LED_PIN,ok?HIGH:LOW);
  Serial.println(ok?"SCAN CONFIRMED":"SCAN NOT CONFIRMED - check the teacher dashboard");
}

// Returns HTTP code; -1 means network/TLS failure. Never prints the device secret.
int sendRequest(const char* path, const String& uid, String& status) {
  if(WiFi.status()!=WL_CONNECTED || time(nullptr)<1700000000) return -1;
  WiFiClientSecure secure;
  secure.setCACert(ROOT_CA);
  HTTPClient http;
  http.setConnectTimeout(3000);
  http.setTimeout(4000);
  if(!http.begin(secure,String(API_BASE)+path)) return -1;
  http.addHeader("Content-Type","application/json");
  JsonDocument body;
  body["deviceId"]=DEVICE_ID;
  body["apiKey"]=DEVICE_KEY;
  if(uid.length()) body["uid"]=uid;
  String payload;
  serializeJson(body,payload);
  int code=http.POST(payload);
  String response=http.getString();
  JsonDocument result;
  auto error=deserializeJson(result,response);
  status=error?"invalid_response":String(result["status"] | "request_failed");
  if(!error && result["error"].is<const char*>()) Serial.println(result["error"].as<const char*>());
  Serial.printf("HTTP %d: %s\n",code,status.c_str());
  http.end();
  return code;
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN,OUTPUT);
  SPI.begin(18,19,23,SS_PIN);
  reader.PCD_Init();
  reader.PCD_DumpVersionToSerial();
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID,WIFI_PASSWORD);
  // Certificate validation needs a valid clock. No blocking wait for Wi-Fi here.
  configTime(0,0,"pool.ntp.org","time.nist.gov");
  Serial.println("Scanner starting. Keep Serial Monitor open for connection and scan errors.");
}

void loop() {
  const uint32_t now=millis();
  if(WiFi.status()!=WL_CONNECTED && now-lastWifiAttempt>10000) {
    lastWifiAttempt=now;
    Serial.println("Wi-Fi disconnected; reconnecting. Scans are not confirmed until the server responds.");
    WiFi.reconnect();
  }

  if(pendingUid.length()) {
    // A bounded one-scan queue bridges short interruptions. Expired scans must be
    // retapped/manually checked in; never silently replay them into a later period.
    if(now-queuedAt>RETRY_WINDOW_MS) {
      Serial.println("Scan expired. Please tap again or ask the teacher for manual check-in.");
      pendingUid="";failedScan=true;indicate(false);
    } else if(WiFi.status()==WL_CONNECTED && time(nullptr)>=1700000000 && (int32_t)(now-nextAttempt)>=0) {
      String status;
      const int code=sendRequest("/api/scans",pendingUid,status);
      const bool ok=code==200 && (status=="checked_in" || status=="already_checked_in" || status=="enrollment_detected");
      if(ok) {indicate(true);failedScan=false;pendingUid="";}
      else if((code>=400 && code<500 && code!=429) || ++attempts>=3) {
        indicate(false);failedScan=true;pendingUid="";
      } else {nextAttempt=millis()+attempts*1000;Serial.println("Temporary failure; retrying safely.");}
    }
  }

  if(reader.PICC_IsNewCardPresent() && reader.PICC_ReadCardSerial()) {
    String uid;
    for(byte i=0;i<reader.uid.size;i++) {if(reader.uid.uidByte[i]<0x10)uid+='0';uid+=String(reader.uid.uidByte[i],HEX);}
    uid.toUpperCase();
    reader.PICC_HaltA();reader.PCD_StopCrypto1();
    if(pendingUid.length()) {Serial.println("Scanner busy. Please tap again after the pending scan completes.");}
    else if(uid!=lastUid || now-lastScan>=4000) {
      lastUid=uid;lastScan=now;pendingUid=uid;queuedAt=now;attempts=0;nextAttempt=now;
      digitalWrite(LED_PIN,LOW);Serial.println("Tag read; awaiting server confirmation.");
    }
  }

  if(!pendingUid.length() && WiFi.status()==WL_CONNECTED && now-lastHeartbeat>=20000) {
    lastHeartbeat=now;String status;
    const int code=sendRequest("/api/devices/heartbeat","",status);
    if(code!=200)Serial.println("Heartbeat failed. Check network, certificate, and scanner token.");
  }
  if(failedScan)digitalWrite(LED_PIN,(now/250)%2); // Persistent visible error until next confirmed scan.
  delay(20);
}

```

## Offline browser attendance

Manual attendance and recognized browser-connected Bluetooth taps are written to this browser’s IndexedDB queue before the interface shows them as **Pending sync**. The queue is scoped to the signed-in teacher, survives reloads and temporary connection loss, and retries automatically while the site is open. A scanner acknowledgement for a queued tap means saved on the laptop, not yet confirmed by Supabase; the ESP32 blinks green slowly three times for this state. Unknown tags and enrollment continue through the normal online scanner validation. The standalone Wi-Fi scanner is unchanged. If a queued change conflicts with a newer server record, the row shows the conflict and lets the teacher discard the queued change and reload the confirmed status. Keep the same browser profile open until pending changes sync; clearing site storage deletes unsynced local operations. Migration `010` must be applied on hosted Supabase before queued writes can complete. Flash the updated `esp32/ClassroomBluetooth/ClassroomBluetooth.ino` firmware to see the distinct queued indication on the device.
