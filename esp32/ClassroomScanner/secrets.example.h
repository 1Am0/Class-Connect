#pragma once
// Copy to secrets.h and fill these in. Never commit secrets.h.
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* API_BASE = "https://YOUR-DOMAIN.com";
const char* DEVICE_ID = "YOUR_DEVICE_IDENTIFIER";
const char* DEVICE_KEY = "YOUR_ONE_TIME_DEVICE_TOKEN";
// PEM root CA that signs YOUR deployment's HTTPS certificate chain.
// Obtain it from the certificate authority's official site. Do not use setInsecure().
const char ROOT_CA[] PROGMEM = R"PEM(
-----BEGIN CERTIFICATE-----
PASTE_YOUR_DEPLOYMENT_ROOT_CA_CERTIFICATE_HERE
-----END CERTIFICATE-----
)PEM";
