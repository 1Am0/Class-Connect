#include <Arduino.h>
#include <SPI.h>
#include <MFRC522.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <esp_system.h>

// Confirmed RC522 wiring.
// Use printed GPIO labels, not header positions.
// Power the RC522 from 3.3V ONLY.
constexpr uint8_t SS_PIN   = 5;
constexpr uint8_t SCK_PIN  = 18;
constexpr uint8_t MOSI_PIN = 23;
constexpr uint8_t MISO_PIN = 19;
constexpr uint8_t RST_PIN  = 22;

// LEDs are active HIGH, with a series resistor on each.
constexpr uint8_t GREEN_LED_PIN = 2;
constexpr uint8_t RED_LED_PIN   = 25;

// Drives the NPN transistor through a 1k resistor.
// NPN emitter -> GND.
// NPN collector -> buzzer negative.
// Buzzer positive -> 3V3.
// Add 10k from transistor base to GND.
constexpr uint8_t BUZZER_PIN = 26;

// false = passive piezo; ESP32 generates the pitch.
// true = active 3.3V buzzer; buzzer generates its own pitch.
constexpr bool ACTIVE_BUZZER = false;

// The website usually answers in under a second, but a slow school network
// or a laptop waking up can take longer.
constexpr uint32_t ACK_TIMEOUT_MS = 20000;
constexpr uint32_t RESEND_MS = 1500;
constexpr uint32_t HEARTBEAT_MS = 20000;
// Holding a card on the reader, or tapping it twice, sends it once.
constexpr uint32_t DUPLICATE_DELAY_MS = 3000;
// A reply that arrives after the timeout still counts for this long.
constexpr uint32_t LATE_ACK_MS = 60000;

// How long the lights stay on. Nothing lasts longer than this.
constexpr uint32_t SUCCESS_LIGHT_MS = 1200;
constexpr uint32_t FAILURE_LIGHT_MS = 2000;

// Keep these unchanged for the existing website.
const char* SERVICE_UUID =
    "4f6f1000-1e0d-4f56-a310-83b8428d0010";

const char* EVENTS_UUID =
    "4f6f1001-1e0d-4f56-a310-83b8428d0010";

const char* ACK_UUID =
    "4f6f1002-1e0d-4f56-a310-83b8428d0010";

MFRC522 reader(SS_PIN, RST_PIN);

BLEServer* server = nullptr;
BLECharacteristic* events = nullptr;

volatile bool connected = false;
bool wasConnected = false;
bool pending = false;

bool restartAdvertising = false;
uint32_t disconnectedAt = 0;

uint8_t packet[17];
uint8_t packetLength = 0;

uint32_t sequence = 0;
uint32_t pendingSequence = 0;
uint32_t queuedAt = 0;
uint32_t lastNotify = 0;
uint32_t lastHeartbeat = 0;
uint32_t lastScan = 0;

// The last scan that timed out, so a late reply can still turn it green.
uint32_t lateSequence = 0;
uint32_t lateUntil = 0;

String lastUid;

// ACK data shared with the BLE task.
portMUX_TYPE ackMux = portMUX_INITIALIZER_UNLOCKED;
bool ackReady = false;
uint32_t ackSequence = 0;
uint8_t ackStatus = 13;

// LED and buzzer timing.
enum class Light { Off, Success, Saved, Failure };
Light light = Light::Off;
uint32_t lightStartedAt = 0;
uint32_t buzzerChangedAt = 0;
uint16_t buzzerFrequency = 0;
uint16_t beepDuration = 0;
uint16_t beepGap = 0;
uint8_t beepsRemaining = 0;
bool buzzerOn = false;

void driveBuzzer(bool on) {
  if (ACTIVE_BUZZER) {
    digitalWrite(BUZZER_PIN, on ? HIGH : LOW);
  } else if (on) {
    tone(BUZZER_PIN, buzzerFrequency);
  } else {
    noTone(BUZZER_PIN);
    digitalWrite(BUZZER_PIN, LOW);
  }
}

void stopBuzzer() {
  driveBuzzer(false);
  buzzerOn = false;
  beepsRemaining = 0;
}

void startBeeps(uint16_t frequency,
                uint8_t count,
                uint16_t duration,
                uint16_t gap) {
  stopBuzzer();

  if (count == 0) return;

  buzzerFrequency = frequency;
  beepDuration = duration;
  beepGap = gap;
  beepsRemaining = count;
  buzzerChangedAt = millis();
  buzzerOn = true;

  driveBuzzer(true);
}

void clearFeedback() {
  light = Light::Off;
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  stopBuzzer();
}

void showFailure() {
  clearFeedback();
  light = Light::Failure;
  lightStartedAt = millis();

  // Three low beeps, then silence.
  startBeeps(900, 3, 150, 150);
}

void showConfirmation(uint8_t status) {
  clearFeedback();
  lightStartedAt = millis();

  if (status == 3) {
    // Saved on the laptop; the website syncs it once it's back online.
    light = Light::Saved;
    startBeeps(2400, 1, 120, 0);
    return;
  }

  light = Light::Success;

  if (status == 2) {
    // Enrollment captured; finish enrollment on the website.
    startBeeps(2200, 2, 80, 80);
  } else if (status == 1) {
    // Student was already checked in.
    startBeeps(1800, 1, 80, 0);
  } else {
    // New attendance confirmed by the website.
    startBeeps(2400, 1, 120, 0);
  }
}

void updateFeedback(uint32_t now) {
  const uint32_t elapsed = now - lightStartedAt;
  bool green = false;
  bool red = false;

  switch (light) {
    case Light::Off:
      break;

    case Light::Success:
      green = true;
      if (elapsed >= SUCCESS_LIGHT_MS) light = Light::Off;
      break;

    case Light::Saved:
      // Three slow green blinks: saved, syncing shortly.
      green = (elapsed / 250) % 2 == 0;
      if (elapsed >= 1500) light = Light::Off;
      break;

    case Light::Failure:
      red = (elapsed / 250) % 2 == 0;
      if (elapsed >= FAILURE_LIGHT_MS) light = Light::Off;
      break;
  }

  if (light == Light::Off) {
    green = false;
    red = false;
  }

  digitalWrite(GREEN_LED_PIN, green ? HIGH : LOW);
  digitalWrite(RED_LED_PIN, red ? HIGH : LOW);

  if (beepsRemaining == 0) return;

  const uint16_t interval =
      buzzerOn ? beepDuration : beepGap;

  if (now - buzzerChangedAt < interval) return;

  buzzerChangedAt = now;

  if (buzzerOn) {
    driveBuzzer(false);
    buzzerOn = false;
    --beepsRemaining;
  } else {
    driveBuzzer(true);
    buzzerOn = true;
  }
}

class ConnectionCallbacks : public BLEServerCallbacks {
 public:
  void onConnect(BLEServer*) override {
    connected = true;
  }

  void onDisconnect(BLEServer*) override {
    connected = false;
  }
};

class AckCallbacks : public BLECharacteristicCallbacks {
 public:
  void onWrite(BLECharacteristic* characteristic) override {
    // Handles the return types used by ESP32 core 2.x and 3.x.
    const auto value = characteristic->getValue();

    if (value.length() != 7 ||
        uint8_t(value[0]) != 1 ||
        uint8_t(value[1]) != 3) {
      return;
    }

    const auto* bytes =
        reinterpret_cast<const uint8_t*>(value.c_str());

    const uint32_t id =
        uint32_t(bytes[2]) |
        (uint32_t(bytes[3]) << 8) |
        (uint32_t(bytes[4]) << 16) |
        (uint32_t(bytes[5]) << 24);

    portENTER_CRITICAL(&ackMux);
    ackSequence = id;
    ackStatus = bytes[6];
    ackReady = true;
    portEXIT_CRITICAL(&ackMux);
  }
};

void sendPending() {
  events->setValue(packet, packetLength);
  events->notify();
  lastNotify = millis();
}

void beginScan(const String& uid,
               const uint8_t* bytes,
               uint8_t size) {
  const uint32_t now = millis();

  // A card held on the reader is read again and again; only the first
  // read counts, and the rest never trigger an error.
  if (uid == lastUid &&
      now - lastScan < DUPLICATE_DELAY_MS) {
    lastScan = now;
    return;
  }

  lastUid = uid;
  lastScan = now;

  if (size != 4 && size != 7 && size != 10) {
    showFailure();
    Serial.println("Unsupported RFID UID length.");
    return;
  }

  if (!connected) {
    showFailure();

    Serial.printf("Tag detected: %s\n", uid.c_str());
    Serial.println(
        "NOT SAVED: connect Bluetooth in the website, "
        "then tap again.");
    return;
  }

  if (pending) {
    // Still waiting on the previous card: ignore quietly, no red light.
    lastUid = "";
    Serial.println(
        "BUSY: wait for confirmation, then tap this tag again.");
    return;
  }

  queuedAt = now;
  pendingSequence = ++sequence;
  pending = true;

  // Success feedback waits for the website's reply.
  clearFeedback();

  // Protocol:
  // version, scan type, sequence little-endian,
  // UID length, raw UID bytes.
  packet[0] = 1;
  packet[1] = 1;

  for (uint8_t i = 0; i < 4; i++) {
    packet[2 + i] =
        uint8_t(pendingSequence >> (8 * i));
  }

  packet[6] = size;
  memcpy(packet + 7, bytes, size);
  packetLength = 7 + size;

  sendPending();

  Serial.printf(
      "Tag %s sent; waiting for attendance confirmation.\n",
      uid.c_str());
}

void handleReply(uint8_t status) {
  // 0-3 all mean the attendance was recorded (3 = saved on the laptop,
  // syncing to the cloud shortly). Only 10+ are real failures.
  if (status <= 3) {
    showConfirmation(status);
  } else {
    showFailure();
  }

  switch (status) {
    case 0:
      Serial.println("CONFIRMED: student checked in.");
      break;

    case 1:
      Serial.println("CONFIRMED: already checked in.");
      break;

    case 2:
      Serial.println(
          "TAG CAPTURED: confirm enrollment on the website.");
      break;

    case 3:
      Serial.println(
          "SAVED ON LAPTOP: the website will sync it shortly.");
      break;

    case 10:
      Serial.println(
          "REJECTED: unknown tag. Enroll this tag first.");
      break;

    case 11:
      Serial.println(
          "REJECTED: student belongs to another class.");
      break;

    case 12:
      Serial.println(
          "REJECTED: no active period. "
          "Choose the scanner's class on the website.");
      break;

    case 14:
      Serial.println(
          "REJECTED: invalid scan. "
          "Check the firmware and tap again.");
      break;

    case 15:
      Serial.println(
          "REJECTED: scanner disabled or "
          "not owned by this classroom.");
      break;

    default:
      Serial.println(
          "NOT CONFIRMED: check the website message, "
          "then tap again.");
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  clearFeedback();

  Serial.println();
  Serial.println("Starting Classroom Bluetooth scanner.");

  Serial.printf(
      "RC522: SS=%u SCK=%u MOSI=%u MISO=%u RST=%u\n",
      SS_PIN, SCK_PIN, MOSI_PIN, MISO_PIN, RST_PIN);

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);

  reader.PCD_Init();
  delay(50);
  reader.PCD_DumpVersionToSerial();

  const uint8_t version =
      reader.PCD_ReadRegister(MFRC522::VersionReg);

  if (version == 0x00 || version == 0xFF) {
    showFailure();

    Serial.println(
        "WARNING: RFID reader not detected. "
        "Check 3.3V power, GND, and SPI wiring.");
  } else {
    Serial.println(
        "RC522 responded. Ready for a compatible "
        "13.56 MHz tag.");
  }

  char deviceName[24];

  snprintf(
      deviceName,
      sizeof(deviceName),
      "Classroom-%04X",
      uint16_t(ESP.getEfuseMac()));

  sequence = esp_random();

  BLEDevice::init(deviceName);

  server = BLEDevice::createServer();
  server->setCallbacks(new ConnectionCallbacks());

  BLEService* service =
      server->createService(SERVICE_UUID);

  events = service->createCharacteristic(
      EVENTS_UUID,
      BLECharacteristic::PROPERTY_NOTIFY);

  events->addDescriptor(new BLE2902());

  BLECharacteristic* acknowledgements =
      service->createCharacteristic(
          ACK_UUID,
          BLECharacteristic::PROPERTY_WRITE);

  acknowledgements->setCallbacks(new AckCallbacks());

  service->start();

  BLEAdvertising* advertising =
      BLEDevice::getAdvertising();

  advertising->addServiceUUID(SERVICE_UUID);
  advertising->setScanResponse(true);

  BLEDevice::startAdvertising();

  Serial.printf("Bluetooth ready: %s\n", deviceName);

  Serial.println(
      "On the website, click the blue Bluetooth button "
      "(bottom right) to connect.");
}

void loop() {
  const uint32_t now = millis();

  if (connected && !wasConnected) {
    wasConnected = true;
    restartAdvertising = false;
    lastHeartbeat = now - HEARTBEAT_MS;

    Serial.println(
        "Laptop connected. Waiting for browser subscription.");
  }

  if (!connected && wasConnected) {
    wasConnected = false;
    disconnectedAt = now;
    restartAdvertising = true;

    if (pending) {
      pending = false;
      showFailure();

      Serial.println(
          "NOT CONFIRMED: Bluetooth disconnected. "
          "Check the roster, reconnect, and tap again.");
    }
  }

  if (restartAdvertising &&
      !connected &&
      now - disconnectedAt >= 250) {
    restartAdvertising = false;
    server->startAdvertising();

    Serial.println(
        "Bluetooth disconnected; advertising again.");
  }

  uint32_t receivedSequence;
  uint8_t receivedStatus;
  bool gotAck;

  portENTER_CRITICAL(&ackMux);
  gotAck = ackReady;
  receivedSequence = ackSequence;
  receivedStatus = ackStatus;
  ackReady = false;
  portEXIT_CRITICAL(&ackMux);

  if (gotAck) {
    if (pending &&
        receivedSequence == pendingSequence) {
      pending = false;
      handleReply(receivedStatus);
    } else if (lateSequence != 0 &&
               receivedSequence == lateSequence &&
               int32_t(now - lateUntil) < 0) {
      // The website answered after we gave up: trust its answer.
      lateSequence = 0;
      Serial.print("Late reply. ");
      handleReply(receivedStatus);
    }
  }

  if (pending &&
      now - queuedAt >= ACK_TIMEOUT_MS) {
    pending = false;
    lateSequence = pendingSequence;
    lateUntil = now + LATE_ACK_MS;
    showFailure();

    Serial.println(
        "NOT CONFIRMED: no reply from the website. "
        "Check the roster before tapping again "
        "or marking attendance manually.");
  }

  if (pending &&
      connected &&
      now - lastNotify >= RESEND_MS) {
    sendPending();
  }

  if (!pending &&
      connected &&
      now - lastHeartbeat >= HEARTBEAT_MS) {
    uint8_t heartbeat[] = {1, 2};

    events->setValue(heartbeat, sizeof(heartbeat));
    events->notify();

    lastHeartbeat = now;
  }

  if (reader.PICC_IsNewCardPresent() &&
      reader.PICC_ReadCardSerial()) {
    String uid;

    for (uint8_t i = 0; i < reader.uid.size; i++) {
      if (reader.uid.uidByte[i] < 16) {
        uid += '0';
      }

      uid += String(reader.uid.uidByte[i], HEX);
    }

    uid.toUpperCase();

    beginScan(uid, reader.uid.uidByte, reader.uid.size);

    reader.PICC_HaltA();
    reader.PCD_StopCrypto1();
  }

  updateFeedback(millis());
  delay(15);
}
