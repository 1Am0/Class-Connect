# Class Connect

**Tap-in classroom attendance for teachers.** Students tap an RFID card on an ESP32 reader or scan a rotating QR code on the projector, and the teacher's dashboard updates live. The same roster powers a random student wheel, balanced group maker, attendance history, and CSV export.

Class Connect started as an electrical engineering and software capstone: custom hardware, a firmware sketch, a real-time web app, and a database with row-level security, all working together.

## Highlights

- **Two ways to check in.** RFID tags (NTAG213) read by an ESP32 + MFRC522, or a QR code that changes every 20 seconds so a photo of the board stops working quickly.
- **Live attendance.** Present, Absent, Late, and Excused, with first-check-in preservation and duplicate-scan protection.
- **Works through flaky school Wi-Fi.** The scanner can relay through the teacher's laptop over Bluetooth, and manual changes are queued in the browser and synced when the connection returns.
- **Teacher tools.** Class schedules with automatic scanner routing, bulk roster import from CSV, a random student wheel, present-only balanced groups, and reusable activity sets (vocabulary, conversation prompts, sentence scramble).
- **History and export.** Search and filter any past session, correct a day, and export to CSV (formula-safe).
- **English and Spanish** interface, with a simple path to add more languages.
- **Try it without hardware.** A local demo mode and RFID simulator run the real server logic with sample data.

## How it works

```text
NTAG213 tag --RF--> MFRC522 --SPI--> ESP32 --Wi-Fi/HTTPS--------> Next.js API --> Supabase (Postgres + RLS)
                                       |                              ^                    |
                                       +--Bluetooth--> teacher laptop-+                    +--> live dashboard

Student phone --scan rotating QR + type school ID--> Next.js API
```

## Tech stack

Next.js, React, TypeScript, Tailwind CSS, Supabase (Postgres, Auth, Realtime, row-level security), pnpm. Firmware is Arduino C++ for a classic ESP32 DevKit and an MFRC522 reader.

## Quick start (demo mode, no hardware or accounts)

Requires Node.js 22 or newer and pnpm.

```sh
pnpm install
cp .env.example .env.local   # keep DEMO_MODE=true and ENABLE_SIMULATOR=true
pnpm dev
```

Open <http://127.0.0.1:3000> and choose **Open demo classroom**. The demo has three class periods with sample students. Use **Scanner** to simulate a card tap. Demo data is stored in `.demo/attendance.json`, which is git-ignored, and demo mode is disabled in production.

## Hardware

| MFRC522 pin | ESP32 pin |
| ----------- | --------- |
| SDA / SS    | GPIO 5    |
| SCK         | GPIO 18   |
| MOSI        | GPIO 23   |
| MISO        | GPIO 19   |
| RST         | GPIO 22   |
| GND         | GND       |
| 3.3V        | **3.3V, never 5V** |

Firmware lives in [`esp32/`](esp32/). Copy `secrets.example.h` to `secrets.h` and fill in your Wi-Fi, server URL, and scanner token. The firmware validates TLS certificates and never stores a teacher password. For school guest networks with a login page, see the [Bluetooth setup guide](docs/BLUETOOTH.md).

## Documentation

- [Full setup and reference guide](docs/SETUP.md): Supabase configuration, Google sign-in, QR check-in, roster import, scanner API, deployment, troubleshooting.
- [Architecture](docs/ARCHITECTURE.md)
- [Bluetooth relay](docs/BLUETOOTH.md)
- [Testing notes](docs/TESTING.md)

## Testing

```sh
pnpm test        # unit tests, SQL/RLS tests (PGlite), and HTTP workflow checks
pnpm typecheck
pnpm build
```

## Privacy and security design

- Student records live only in **your own** Supabase project. This repository contains no real student data, and the demo uses invented names.
- Scanner tokens are high-entropy and stored only as SHA-256 hashes. They are shown once when created.
- Row-level security limits each teacher to their own classes. Browser database writes and privileged calls are denied.
- QR codes are signed per class, school day, and 20-second window. Check-in only saves during the class's scheduled time, and each phone can check in one student per class per day.
- Server routes verify the signed-in teacher and validate every input.

## Status and limitations

The web app, shared scan logic, database schema, and security rules are covered by automated tests. Hosted Supabase wiring, deployment, and end-to-end tests on your own ESP32 and reader must be verified in your environment. Not included: durable offline scanner queues, immutable audit logs, school-wide administration, and direct student-information-system integrations.

## Project layout

| Path | Purpose |
| ---- | ------- |
| `app/` | Next.js routes and API handlers (`/api/scans`, `/api/manage`, QR check-in) |
| `components/` | Dashboard, attendance, wheel, groups, and activity UI |
| `lib/` | Shared scan pipeline, scheduling, server store, auth, and translations |
| `supabase/migrations/` | Database schema, security rules, and atomic write functions |
| `esp32/` | Scanner firmware examples |
| `tests/`, `scripts/` | Unit, database, and HTTP tests; seed and smoke scripts |

Built by [1Am0](https://github.com/1Am0).