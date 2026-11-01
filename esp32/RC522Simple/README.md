# Simple ESP32 + RC522 test

For a classic ESP32 DevKit / ESP32-WROOM-32 and an MFRC522 (RC522) SPI reader. ESP32-C3/S3 boards may require different pins. This sketch prints card IDs over USB serial; it does not send attendance to the website.

Unplug USB before wiring. Use GPIO labels, not physical pin positions.

| RC522 pin | ESP32 connection |
| --- | --- |
| 3.3V | 3V3 (never 5V/VIN) |
| GND | GND |
| SDA / SS | GPIO 5 |
| SCK | GPIO 18 |
| MOSI | GPIO 23 |
| MISO | GPIO 19 |
| RST | GPIO 22 |
| IRQ | Leave disconnected |

The reader's SDA pin is SPI chip select in this setup. Keep jumper wires short and ensure the header is soldered securely.

1. In Arduino IDE Boards Manager, install **esp32 by Espressif Systems**.
2. In Library Manager, install **MFRC522 by GithubCommunity** (the miguelbalboa/rfid library).
3. Open `RC522Simple.ino`, select your board (usually **ESP32 Dev Module** for a classic generic DevKit), and select its USB port.
4. Upload, then open Serial Monitor at **115200 baud**. Press EN/Reset to see startup diagnostics if needed.
5. Tap a compatible 13.56 MHz MIFARE card or the key fob supplied with the reader. Expect `Card UID: A1B2C3D4` (your ID will differ). Remove and retap to read again.

If upload stays on Connecting, hold BOOT while it connects and release when uploading begins. If startup reports communication failure or firmware 0x00/0xFF, check power, ground, SPI wiring, and solder joints. A 125 kHz tag will not work.

The sketch has not been compiled or tested on physical hardware in this workspace.

References: [MFRC522 library](https://github.com/miguelbalboa/rfid), [Espressif SPI documentation](https://docs.espressif.com/projects/arduino-esp32/en/latest/api/spi.html).
