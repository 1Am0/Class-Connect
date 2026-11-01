# Bluetooth attendance setup

The ESP32 reads an RFID tag and sends its UID over Bluetooth LE to the teacher's browser. For a recognized student in the active class, the browser saves an attendance operation locally before acknowledging the tap, then syncs it with Supabase. The ESP32 does not connect to school Wi-Fi.

## Setup

1. Use the classic ESP32 DevKit with an MFRC522 reader. Connect SDA/SS to GPIO 5, RST to 22, SCK to 18, MISO to 19, MOSI to 23, GND to GND, and power the reader with **3.3V**, never 5V.
2. Install the Arduino ESP32 board package and MFRC522 library. Upload `esp32/ClassroomBluetooth/ClassroomBluetooth.ino` using the ESP32 Dev Module board. Close Serial Monitor before uploading. No Wi-Fi password, device token, or other credentials go in this sketch.
3. Start the app with `pnpm dev` for the local demo. Open http://127.0.0.1:3000 in Chrome or Edge and enter the demo classroom. A hosted installation requires HTTPS and a configured teacher account.
4. Open **Scanner**, select the active classroom scanner record, and click **Connect Bluetooth**. Choose the device named `Classroom-XXXX` in the browser chooser. Turn on Windows Bluetooth if needed. An embedded preview may not support Bluetooth; use a normal browser window.
5. Select the intended class for the scanner, or use the schedule. Enroll actual RFID tags from a student's edit dialog in the class roster; demo students' sample UIDs will not match physical tags automatically.
6. Tap an enrolled tag and verify that the student's attendance updates. Wiring: RC522 (SCK 18, MISO 19, MOSI 23, SDA 5, RST 22, 3.3V only), green LED on GPIO 2, red LED on GPIO 25 (each with a series resistor), and a passive piezo on GPIO 26 through an NPN transistor (set `ACTIVE_BUZZER` for an active buzzer). Feedback never lasts more than two seconds: green for about a second with one beep when confirmed (a lower beep if already checked in, two beeps for a new tag), three slow green blinks when saved on the laptop and **Pending sync**, and red blinking with three low beeps for two seconds when rejected or not confirmed. A reply that arrives late still turns the light green. Serial output at 115200 baud gives details.

For enrollment, enable enrollment for the selected scanner, tap the tag, then confirm its assignment in the student form. A captured enrollment UID does not create attendance.

## Keeping it running

Keep the laptop powered, awake, within Bluetooth range, and the browser tab open. Client-side navigation between app pages preserves the connection. Reloading, closing the tab, signing out, or losing the connection requires reconnecting through Scanner. The ESP32 may use a USB power supply once firmware is uploaded.

For a hosted app, accept the school's guest Wi-Fi page on the laptop and renew it whenever the school requires. A local demo on the same laptop can process attendance without internet while its local server is running. Local demo data is saved on that laptop; it is not a hosted database.

Recognized taps use an IndexedDB queue in this browser profile and retry automatically while the site is open. Keep the same profile until **Pending sync** clears; clearing site storage discards unsynced operations. If the browser cannot save the tap locally, the board receives no queued acknowledgement and retries for up to 15 seconds. Unknown tags and enrollment still need an online server response. Repeated notifications for one sequence reuse the same acknowledgement. Heartbeats are forwarded only when received from the physical device.

## Security and protocol

`POST /api/bluetooth` handles unknown tags and enrollment through the existing server processor. Recognized taps use `POST /api/attendance-operations`, which requires the signed-in teacher, validates the active device, tag, class membership, and operation ID, and keeps duplicate retries idempotent. The browser never receives a device API secret. Bluetooth relay access is available in the configured production app as well as local demo mode.

The BLE service is `4f6f1000-1e0d-4f56-a310-83b8428d0010`, with notification characteristic ending `1001` and write-with-response acknowledgement characteristic ending `1002`. Packets contain a version, type, sequence, and raw UID; even 10-byte tags fit in the default notification payload. The browser caches completed sequences so a lost acknowledgement does not resubmit the same scan during that connection.

This prototype does not implement BLE bonding or application-level device authentication. The teacher selects the nearby scanner; RFID UIDs are identifiers, not secure credentials. Use it as a supervised classroom prototype.

Browser requirements follow [Chrome's Web Bluetooth documentation](https://developer.chrome.com/docs/capabilities/bluetooth): a secure context, an explicit button click, and user selection of the device.
