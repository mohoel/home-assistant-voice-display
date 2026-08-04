# Assist Satellit

Home Assistant Voice Satellite auf einem **Waveshare ESP32-S3-Touch-AMOLED-1.75**
(rundes 1,75"-AMOLED, 466×466) mit angeschlossenem Lautsprecher.

Funktionsumfang orientiert sich am offiziellen Nabu-Casa-Projekt
(Home Assistant Voice PE / ESP32-S3-Box-3), nutzt aber das runde Display als
Statusanzeige statt eines LED-Rings.

## Features

- Wake Word lokal auf dem Gerät (`micro_wake_word`) **oder** in Home Assistant —
  umschaltbar über eine Select-Entity, ohne Neustart
- Gesprochener Text und Antwort erscheinen zusätzlich als Text auf dem Display
- Animierter Ring beim Zuhören, Nachdenken und Antworten, farbcodiert nach Phase
- Standby zeigt eine stark gedimmte Uhr; schwarzer AMOLED-Hintergrund heißt
  physisch abgeschaltete Pixel
- Antippen im Standby öffnet Lautstärke und Stummschaltung direkt auf dem Touchscreen
- Stummschaltung, Wake-Word-Empfindlichkeit und Displayhelligkeit als HA-Entities

## Warum nicht das ESPHome-Add-on in Home Assistant?

Voice-Assistant-Konfigurationen sind zu groß, um auf einem Raspberry Pi zuverlässig
zu kompilieren. Deshalb ist der **Mac der Build-Host**: ESPHome kompiliert lokal und
schickt das Update per OTA direkt ans Gerät. Home Assistant braucht nur die
**ESPHome-Integration**, nicht das Builder-Add-on.

## Einrichtung

### 1. Voraussetzungen

```bash
brew install esphome
```

ESPHome muss mindestens **2026.7.0** sein — erst ab dieser Version ist der
CST9217-Touchcontroller im Core enthalten.

### 2. Secrets anlegen

```bash
cp secrets.yaml.example secrets.yaml
```

Danach in `secrets.yaml` WLAN-Name und -Passwort eintragen. API-Key und
OTA-Passwort sind bereits generiert. Die Datei steht in `.gitignore` und wird
nie committet.

### 3. Erstmaliges Flashen per USB

Board per USB-C an den Mac anschließen. Port suchen:

```bash
ls /dev/cu.usbmodem*
```

Flashen (Port ggf. anpassen):

```bash
esphome run assist-satellit.yaml --device /dev/cu.usbmodem101
```

Meldet sich kein Port, das Board in den Download-Modus bringen: **BOOT** halten,
**RESET** kurz drücken, **BOOT** loslassen.

### 4. In Home Assistant einbinden

Das Gerät meldet sich per mDNS. Unter *Einstellungen → Geräte & Dienste* taucht
`assist-satellit` als ESPHome-Gerät auf. Beim Hinzufügen den
`api_encryption_key` aus `secrets.yaml` eintragen.

Danach unter *Einstellungen → Sprachassistenten* eine Assist-Pipeline mit
deutschem STT/TTS zuweisen.

## Updates

```bash
git pull && esphome run assist-satellit.yaml --device assist-satellit.local
```

Kompiliert auf dem Mac, überträgt per OTA über WLAN. Home Assistant ist daran
nicht beteiligt.

Rollback auf eine getaggte Version:

```bash
git checkout v0.1.0 && esphome run assist-satellit.yaml --device assist-satellit.local
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `assist-satellit.yaml` | Gerätedatei: Substitutions (Farben, Phasen, Timings) und Packages |
| `packages/core.yaml` | SoC, PSRAM, WLAN, API, OTA, Zeit, Diagnose |
| `packages/hardware.yaml` | I2C, QSPI-Display, Touch, I2S-Audio, Codecs, Media Player |
| `packages/voice.yaml` | Wake Word, Voice Assistant, Selects, Mute, Text-Sensoren |
| `packages/ui.yaml` | Fonts, LVGL-Seiten, Ring-Animation, Standby-Uhr, Bedienseite |

Farben, Phasen-IDs und Standby-Zeiten stehen als Substitutions in
`assist-satellit.yaml` — dort anpassen, nicht in den Packages.

## Hardware-Referenz

| Funktion | Pin |
|---|---|
| I2C SDA / SCL | GPIO15 / GPIO14 |
| QSPI CLK | GPIO38 |
| QSPI Data 0–3 | GPIO4 / GPIO5 / GPIO6 / GPIO7 |
| Display CS / RST | GPIO12 / GPIO39 (Treiber CO5300) |
| Touch INT / RST | GPIO11 / GPIO40 (CST9217) |
| I2S BCLK / LRCLK / MCLK | GPIO9 / GPIO45 / GPIO42 |
| I2S DOUT / DIN | GPIO8 (ES8311) / GPIO10 (ES7210) |
| Verstärker-Enable | GPIO46 |
| SD-Karte D0 / CMD / CLK | GPIO3 / GPIO1 / GPIO2 (ungenutzt) |

SoC: ESP32-S3R8, 16 MB Flash, 8 MB Octal-PSRAM.

GPIO45 und GPIO46 sind Strapping-Pins. Die Warnung beim Kompilieren ist bekannt
und unkritisch.

## Fehlersuche

**Ton verzerrt oder rauscht.** Mikrofon (16 kHz) und Lautsprecher (48 kHz) teilen
sich einen I2S-Bus. Falls es Probleme gibt, in `packages/hardware.yaml` beide auf
`16000` setzen.

**Boot-Loop oder LVGL-Speicherfehler.** In `packages/ui.yaml` `buffer_size` von
`25%` auf `12%` senken. Die Sensoren „Freier Heap" und „Freier PSRAM" in HA zeigen
den Speicherdruck.

**Umlaute fehlen auf dem Display.** Im `font:`-Block muss
`glyphsets: [GF_Latin_Core]` stehen.

**Wake Word reagiert nicht.** Die mitgelieferten Modelle sind englisch
(„Okay Nabu", „Hey Jarvis", „Hey Mycroft"). Deutsch sprechen funktioniert erst ab
dem Befehl — Sprache und Antwort laufen über die HA-Pipeline. Empfindlichkeit über
die Select-Entity erhöhen.

## Nicht umgesetzt

- **Akku-Telemetrie.** Das AXP2101-PMIC ist nicht im ESPHome-Core; für Netzbetrieb
  irrelevant.
- **Timer-Anzeige.** Die HA-Sprachtimer laufen, werden aber noch nicht auf dem
  Display dargestellt.
- **Deutsches Wake Word.** Bräuchte ein eigenes microWakeWord-Modell.
