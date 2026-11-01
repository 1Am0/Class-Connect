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
