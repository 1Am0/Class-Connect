#include <SPI.h>
#include <MFRC522.h>

// Classic ESP32 DevKit / ESP32-WROOM-32. RC522 power: 3.3V only.
constexpr uint8_t SS_PIN = 5;
constexpr uint8_t RST_PIN = 22;
MFRC522 reader(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  SPI.begin(18, 19, 23, SS_PIN); // SCK, MISO, MOSI, SS
  reader.PCD_Init();
  delay(50);
  reader.PCD_DumpVersionToSerial();
  Serial.println("Ready. Tap an RFID card or key fob.");
}

void loop() {
  if (!reader.PICC_IsNewCardPresent()) return;
  if (!reader.PICC_ReadCardSerial()) return;

  Serial.print("Card UID: ");
  for (byte i = 0; i < reader.uid.size; i++) {
    if (reader.uid.uidByte[i] < 0x10) Serial.print("0");
    Serial.print(reader.uid.uidByte[i], HEX);
  }
  Serial.println();

  reader.PICC_HaltA();
  reader.PCD_StopCrypto1();
  // Move the card away and tap again for another reading.
}
