# Home Assistant Voice Satellite auf Waveshare ESP32-S3-Touch-AMOLED-1.75

## Context

Ziel ist ein vollwertiger Home-Assistant-Voice-Satellit auf einem Waveshare
ESP32-S3-Touch-AMOLED-1.75 (rundes 1,75" AMOLED, 466×466) mit angeschlossenem
Lautsprecher — funktional so nah wie möglich am offiziellen Nabu-Casa-Ready-Made-Projekt
(Home Assistant Voice PE / ESP32-S3-Box-3), aber mit dem runden Display als
Statusanzeige statt eines LED-Rings.

Anforderungen aus dem Gespräch:

1. Nutzung als HA Voice Satellite
2. Erstmaliger Flash per USB am Computer (Mac)
3. Einbindung in Home Assistant
4. OTA-Updates für spätere Features, versioniert über ein **privates GitHub-Repo, lokal geklont**
5. Antworttext zusätzlich auf dem Display anzeigen
6. Standby = Display praktisch aus / gedimmte Uhr; bei Zuhören & Ausführen ein
   animierter Ring
7. Wake-Word-Engine in HA umschaltbar (On device ↔ In Home Assistant)
8. Display-Texte auf Deutsch, Touch weckt das Display, Lautstärke/Mute auf dem Touchscreen

**Entscheidende Randbedingung:** Kompilieren auf dem Raspberry Pi ist in der
Vergangenheit an Voice-Assistant-Konfigurationen gescheitert (RAM/Zeit). Deshalb
wird **nicht** das ESPHome-Builder-Add-on in HA als Build-Host verwendet. Stattdessen:
ESPHome-CLI auf dem Mac kompiliert, der Mac pusht OTA direkt per WLAN ans Gerät.
Home Assistant braucht nur die **ESPHome-Integration** (nicht das Add-on), um das
Gerät über die native API einzubinden. Das löst das Compile-Problem vollständig.

---

## Verifizierte Hardware-Fakten

Pins aus dem Waveshare-BSP (`examples/esp-idf/03_esp-brookesia/components/esp32_s3_touch_amoled_1_75/include/bsp/esp32_s3_touch_amoled_1_75.h`),
deckungsgleich mit der ESPHome-Device-Seite:

| Funktion | Pin | Anmerkung |
|---|---|---|
| I2C SDA / SCL | GPIO15 / GPIO14 | Touch, ES7210, ES8311, AXP2101, PCF85063, QMI8658, TCA9554 |
| QSPI CLK | GPIO38 | Display |
| QSPI Data 0–3 | GPIO4/5/6/7 | |
| Display CS / RST | GPIO12 / GPIO39 | Treiber **CO5300**, 466×466 |
| Touch INT / RST | GPIO11 / GPIO40 | **CST9217** |
| I2S BCLK / LRCLK / MCLK | GPIO9 / GPIO45 / GPIO42 | **eine** gemeinsame I2S-Instanz |
| I2S DOUT (Speaker) | GPIO8 | ES8311 DAC |
| I2S DIN (Mic) | GPIO10 | ES7210 ADC, Dual-Mic + AEC |
| Speaker-Amp Enable | GPIO46 | `BSP_POWER_AMP_IO`, **Strapping-Pin** |
| SD Card D0/CMD/CLK | GPIO3 / GPIO1 / GPIO2 | optional, Phase 6 |
| Backlight | — | AMOLED, keine PWM: Helligkeit per Display-Kommando |

SoC: ESP32-S3R8, 16 MB Flash, 8 MB Octal-PSRAM.

**Wichtige Erkenntnisse aus der Recherche:**

- **CST9217 ist seit ESPHome 2026.7.0 im Core** — Plattform `cst9220`
  (`CST9217_CHIP_ID = 0x9217` in `cst9220_touchscreen.h`, PR #16888, 2026-06-29).
  Die auf devices.esphome.io referenzierte External Component
  `shelson/esphome-cst9217` (0 Stars, unmaintained) wird **nicht** gebraucht.
  → `min_version: 2026.7.0`, aktuell ist 2026.7.3.
- **CO5300 ist im Core** über `display: platform: mipi_spi`, `bus_mode: quad`.
  Helligkeit via `set_brightness()` — auf AMOLED bedeutet Helligkeit 0 / schwarzes
  Bild echte Pixel-Abschaltung.
- **Ein einziger I2S-Bus** für Mic und Speaker (BSP bestätigt: ein Controller mit
  DOUT und DSIN). Das entspricht exakt dem offiziellen ESP32-S3-Box-3-Setup
  (`i2s_audio_bus` mit Mic @16 kHz und Speaker @48 kHz). Die zwei-Bus-Variante mit
  `allow_other_uses` von der Device-Seite wird nicht übernommen.
- **AXP2101 ist nicht im ESPHome-Core.** Nur Community-External-Components. Für den
  netzbetriebenen Satelliten nicht nötig — die funktionierende Community-Config
  fasst das PMIC nicht an. Akku-Telemetrie bleibt optionale Phase 6.
- **TCA9554** wird für unseren Funktionsumfang nicht gebraucht (Display- und
  Touch-Reset hängen an echten GPIOs).
- **micro_wake_word-Modelle sind englisch** (`okay_nabu`, `hey_jarvis`, `hey_mycroft`).
  STT/TTS/Intents laufen davon unabhängig auf Deutsch.

### Referenz-Konfigurationen (Basis für die Umsetzung)

- `esphome/wake-word-voice-assistants` → `esp32-s3-box-3/esp32-s3-box-3.yaml`
  (835 Zeilen): Phasenmodell, `wake_word_engine_location`-Select, Mute-Switch,
  Timer-Handling, Text-Sensoren für STT/TTS. **Das ist unsere Hauptvorlage.**
- `esphome/home-assistant-voice-pe` → `home-assistant-voice.yaml`: Entity-Namen,
  `wake_word_sensitivity`-Select, Wake-Sound-Switch, `vad:`, `gain_factor: 4`.
- `devices.esphome.io/devices/waveshare-esp32-s3-touch-amoled-175/`: verifizierte
  Pin-Belegung und funktionierende Display-/Audio-Blöcke.

---

## Zielarchitektur

```
/Users/moritzholzer/Claude/Assist/          ← Git-Repo (privat, lokal geklont)
├── README.md                               ← Setup-, Flash- und Update-Anleitung
├── .gitignore                              ← secrets.yaml, .esphome/, *.bin
├── secrets.yaml                            ← NICHT im Repo
├── secrets.yaml.example                    ← Vorlage mit Platzhaltern
├── assist-satellit.yaml                    ← Geräte-Config, bindet packages ein
└── packages/
    ├── core.yaml        esphome / esp32 / psram / wifi / api / ota / logger / time
    ├── hardware.yaml    i2c / spi / i2s_audio / display / touchscreen / audio_dac / audio_adc
    ├── voice.yaml       micro_wake_word / voice_assistant / media_player / selects / switches
    ├── ui.yaml          lvgl (Fonts, Farben, Pages, Widgets)
    └── ui_scripts.yaml  Phasen-Logik, draw/update-Skripte, Standby-Timer
```

`assist-satellit.yaml` bindet die Packages über lokale `packages:`-Includes ein
(nicht als Remote-Package — das Repo liegt ja schon lokal beim Build-Host).
Substitutions für Name, Farben und Phasen-IDs stehen im Geräte-YAML, damit ein
zweites Gerät später nur eine weitere dünne Datei braucht.

### Voice-Assistant-Phasenmodell (übernommen von Box-3)

| ID | Phase | Ring-Farbe | Deutscher Text |
|---|---|---|---|
| 1 | idle | aus | (Standby-Page) |
| 2 | listening | `#03A9F4` blau, Spinner | „Ich höre …" |
| 3 | thinking | `#FFC107` amber, Spinner schneller | „Einen Moment …" |
| 4 | replying | `#4CAF50` grün, Puls | Antworttext |
| 10 | not ready | `#616161` grau | „Keine Verbindung" |
| 11 | error | `#F44336` rot | Fehlermeldung |
| 12 | muted | `#9E9E9E` grau, statisch | „Mikrofon aus" |
| 20 | timer finished | `#FF9800` orange, blinkend | „Timer abgelaufen" |

### Display-Design

**Main-Page** (schwarzer Hintergrund = AMOLED-Pixel aus):
- Ring: LVGL-`spinner`, 430×430 zentriert (≈18 px Rand), `arc_width: 14`.
  Die Track-Arc (Hauptteil) bleibt dunkelgrau `#1A1A1A`, die Indikator-Arc bekommt
  die Phasenfarbe. `arc_length: 70°`, `spin_time` phasenabhängig
  (listening 1400 ms, thinking 800 ms).
- Für `replying` und `muted` statt Spinner ein statischer `arc` über den vollen
  Kreis in Phasenfarbe (kein Drehen während des Sprechens).
- Zentrum, drei Labels innerhalb eines 300×300-Quadrats (rundes Display!):
  - `lbl_phase` — Phasentext, klein, oben
  - `lbl_request` — STT-Transkript aus `on_stt_end`, gedämpft grau
  - `lbl_response` — TTS-Text aus `on_tts_start`, weiß, `long_mode: wrap`,
    max. ~5 Zeilen
- Textquellen: `voice_assistant.on_stt_end` (Variable `x` = Transkript) und
  `voice_assistant.on_tts_start` (Variable `x` = Antworttext). Beide werden in
  Template-Text-Sensoren gespiegelt, damit die Texte auch in HA sichtbar sind.

**Standby-Page**: große Uhr `HH:MM` (Font ~120 px), Datum klein darunter,
Display-Helligkeit auf ~8 %. Gegen Einbrennen wird die Uhr-Position jede Minute um
±10 px verschoben (Pixel-Shift). Zeitquelle: `time: platform: homeassistant`.

**Control-Page**: Tippen im Standby → Lautstärke als `arc` (adjustable) plus
Mute-Button; nach 8 s ohne Bedienung zurück in den Standby.

**Wechsel-Logik**: jede Phasenänderung ≠ idle → Main-Page + volle Helligkeit.
`lvgl: on_idle:` nach 30 s → Standby-Page + dimmen. `touchscreen: on_touch:` →
aufwecken. Im Standby wird LVGL nicht pausiert (die Uhr muss laufen), aber die
Rendering-Last ist minimal.

---

## Umsetzung in Phasen

Jede Phase endet mit einem flash- und testbaren Zustand.

### Phase 0 — Toolchain und Repo (Mac)

1. ESPHome-CLI installieren: `uv tool install esphome` (Fallback: `pipx install esphome`).
   Version prüfen, muss ≥ 2026.7.0 sein.
2. `git init` in `/Users/moritzholzer/Claude/Assist`, `.gitignore` anlegen
   (`secrets.yaml`, `.esphome/`, `*.bin`, `.DS_Store`).
3. `secrets.yaml.example` + reale `secrets.yaml`: `wifi_ssid`, `wifi_password`,
   `api_encryption_key` (32-Byte base64), `ota_password`.
4. Privates GitHub-Repo anlegen und als `origin` verknüpfen — **erst nach**
   Bestätigung, dass `.gitignore` greift.

### Phase 1 — Grundgerüst: Boot, WLAN, Display, Touch

`packages/core.yaml` und `packages/hardware.yaml` mit:

- `esp32: variant: esp32s3`, `flash_size: 16MB`, `framework: esp-idf`
- `psram: mode: octal, speed: 80MHz`
- `esphome.min_version: 2026.7.0`, `platformio_options` für flash_mode/f_flash
  aus der verifizierten Device-Config
- `api` mit `encryption.key`, `ota: platform: esphome` mit Passwort
- `logger: hardware_uart: USB_SERIAL_JTAG`
- `time: platform: homeassistant`
- `display: platform: mipi_spi, model: CO5300, bus_mode: quad`, Pins wie oben,
  `dimensions: 466×466`
- `light: platform: monochromatic` + `output: platform: template`, das
  `id(disp).set_brightness(state*255)` aufruft (Helligkeitssteuerung für AMOLED)
- `touchscreen: platform: cst9220` (Core!), `interrupt_pin: GPIO11`,
  `reset_pin: GPIO40`, `transform: mirror_x: true, mirror_y: true`

**Erster Flash per USB** (siehe Verification unten).
Erfolgskriterium: Gerät bootet, Display zeigt Testbild, Touch-Koordinaten im Log,
Gerät taucht in HA auf.

### Phase 2 — Audio-Kette

In `packages/hardware.yaml`:

- **Ein** `i2s_audio`-Bus `i2s_bus`: `i2s_bclk_pin: GPIO9`,
  `i2s_lrclk_pin: GPIO45`, `i2s_mclk_pin: GPIO42`
- `audio_adc: platform: es7210`, `sample_rate: 16000`, `bits_per_sample: 16bit`
- `audio_dac: platform: es8311`, `sample_rate: 48000`, `bits_per_sample: 16bit`
- `microphone: platform: i2s_audio`, `i2s_din_pin: GPIO10`, `adc_type: external`,
  16000 Hz / 16 bit
- `speaker: platform: i2s_audio`, `i2s_dout_pin: GPIO8`, `dac_type: external`,
  48000 Hz / 16 bit, `audio_dac: es8311_dac`, `buffer_duration: 100ms`
- `switch: platform: gpio` auf GPIO46 mit **`ignore_strapping_warning: true`**,
  `restore_mode: RESTORE_DEFAULT_ON` (Speaker-Amp)
- `media_player: platform: speaker` mit `announcement_pipeline` (FLAC, 48 kHz,
  1 Kanal) — analog Box-3

Erfolgskriterium: TTS aus HA ans `media_player`-Entity kommt hörbar raus,
`microphone` liefert Pegel im Log.

### Phase 3 — Voice Assistant

`packages/voice.yaml`, eng an Box-3 + Voice PE:

- `micro_wake_word:` mit `okay_nabu` / `hey_jarvis` / `hey_mycroft`,
  `microphone: {channels: 1, gain_factor: 4}`, `vad:`,
  `stop_after_detection: false`, `task_stack_in_psram: true`
- `voice_assistant:` mit `micro_wake_word: mww`, `media_player: speaker_media_player`,
  `use_wake_word: false`, `noise_suppression_level: 2`, `auto_gain`, `volume_multiplier`
- `select: Wake word engine location` mit Optionen `On device` / `In Home Assistant`
  — die vom Nutzer gewünschte Umschaltung, exakt die Box-3-Logik
  (`box3.yaml:586–628`): bei „In Home Assistant" `micro_wake_word.stop` +
  `set_use_wake_word(true)` + `voice_assistant.start_continuous`, umgekehrt entsprechend
- `select: Wake word sensitivity` mit den kalibrierten `probability_cutoff`-Werten
  aus Voice PE (`vpe.yaml:1794–1807`)
- `switch: Mute` (Template, `microphone.mute` / `unmute`), `switch: Wake sound`
- `globals: voice_assistant_phase` (int), `init_in_progress` (bool)
- Trigger `on_listening`, `on_stt_vad_end`, `on_stt_end`, `on_tts_start`, `on_end`,
  `on_error`, `on_client_connected/disconnected` setzen die Phase und rufen
  `script.execute: update_ui`
- `text_sensor: platform: template` für `text_request` und `text_response`

Erfolgskriterium: „Okay Nabu, schalte das Licht im Wohnzimmer ein" funktioniert
end-to-end; Umschalten des Selects wechselt die Engine ohne Reboot.

### Phase 4 — LVGL-UI: Ring und Text

`packages/ui.yaml` + `packages/ui_scripts.yaml`:

- `font:` mit Google-Font (Figtree), `glyphsets: [GF_Latin_Core]` für Umlaute
  (ä/ö/ü/ß), Größen 20 / 28 / 40 / 120
- `color:` Definitionen für die Phasenfarben aus der Tabelle oben
- `lvgl:` mit `buffer_size: 25%` als Startwert (Speicherdruck durch VA + mWW;
  bei Bedarf hochdrehen), `displays: [disp]`, `touchscreens: [ts]`,
  `theme` mit schwarzem Hintergrund
- Pages `page_main`, `page_standby`, `page_controls`
- Skript `update_ui`: liest `voice_assistant_phase`, setzt Spinner-Sichtbarkeit,
  Indikator-Farbe, `spin_time` und die drei Label-Texte
- Skript `wake_display` / `sleep_display`: Page-Wechsel + Helligkeit
- `lvgl: on_idle: timeout: 30s` → `sleep_display`
- `touchscreen: on_touch:` → `wake_display`

Erfolgskriterium: Ring dreht sich beim Zuhören, Transkript und Antworttext
erscheinen lesbar, deutsche Umlaute werden korrekt gerendert.

### Phase 5 — Standby, Uhr, Touch-Bedienung

- Standby-Page mit Uhr, Pixel-Shift-Interval (60 s)
- Control-Page: Volume-`arc` (adjustable) gebunden an `media_player.volume_set`,
  Mute-Button gebunden an den Mute-Switch, Auto-Rückkehr nach 8 s
- Optional: `number`-Entities in HA für Standby-Timeout und Standby-Helligkeit

### Phase 6 — Optional / später

- Timer-Support (Box-3-Muster: `on_timer_*`-Trigger, `timer_ringing`-Switch,
  Timer-Ring auf dem Display als Fortschritts-Arc)
- AXP2101-Akku-Telemetrie über eine der Community-External-Components
  (`stefanthoss/esphome-axp2101` o. Ä.) — nur wenn Akkubetrieb gewünscht
- QMI8658-IMU als Wake-on-Motion statt/zusätzlich zum Touch
- SD-Karte für lokale Sounds
- Deutsches Wake-Word: eigenes microWakeWord-Modell trainieren

---

## Update-Workflow (nach dem Erstflash)

```bash
cd /Users/moritzholzer/Claude/Assist && git pull && esphome run assist-satellit.yaml --device assist-satellit.local
```

- Kompiliert auf dem Mac (schnell), pusht OTA direkt per WLAN — **Home Assistant
  und der RasPi sind daran nicht beteiligt**.
- Versionierung: Git-Tags (`v0.1`, `v0.2`, …) plus eine `project.version`-Substitution
  im YAML, damit die laufende Version als Attribut in HA sichtbar ist.
- Rollback: `git checkout v0.1 && esphome run …`.
- Optional später: GitHub Action, die bei jedem Push nur `esphome config` +
  `esphome compile` als Build-Check laufen lässt (kein OTA, da GitHub das lokale
  Netz nicht erreicht).

---

## Verification

**Phase 0/1 — Erstflash am Mac**

1. Board per USB-C an den Mac. ESP32-S3 hat natives USB-Serial-JTAG; wenn das Gerät
   nicht erscheint: BOOT halten, RESET kurz drücken, BOOT loslassen (Download-Modus).
2. Port prüfen:
   ```bash
   ls /dev/cu.usbmodem*
   ```
3. Flashen:
   ```bash
   cd /Users/moritzholzer/Claude/Assist && esphome run assist-satellit.yaml --device /dev/cu.usbmodem101
   ```
4. Danach hängt die Logausgabe am seriellen Port — Boot-Log auf Fehler prüfen
   (I2C-Scan muss ES7210, ES8311, CST9217, AXP2101 finden).
5. In HA: Einstellungen → Geräte → ESPHome sollte `assist-satellit` per mDNS
   anbieten; mit dem `api_encryption_key` aus `secrets.yaml` übernehmen.

**Phase 2 — Audio**

- In HA `media_player.assist_satellit` eine TTS-Nachricht schicken → Ton muss
  sauber und ohne Knacken kommen.
- Falls Audio verzerrt/rauscht: der geteilte I2S-Bus mit ungleichen Sample-Raten
  (Mic 16 k / Speaker 48 k) ist der wahrscheinlichste Verdächtige — dann beide
  auf 16000 Hz setzen und erneut testen.
- Mikrofon: `logger` auf `DEBUG` für `micro_wake_word`, Pegelwerte prüfen.

**Phase 3 — Voice**

- Wake Word sagen → im Log muss `on_wake_word_detected` erscheinen.
- Ganzen Durchlauf testen: Wake Word → Befehl → Aktion → gesprochene Antwort.
- Select `Wake word engine location` in HA auf „In Home Assistant" stellen und den
  Durchlauf wiederholen (setzt eine openWakeWord-fähige Assist-Pipeline in HA voraus).

**Phase 4/5 — UI**

- Live am Gerät beobachten: Ring dreht bei „Ich höre …", Farbwechsel bei
  „Einen Moment …", Antworttext erscheint.
- Deutschen Satz mit Umlauten testen („Schalte die Küchenbeleuchtung ein") und
  prüfen, dass ä/ö/ü/ß gerendert werden — sonst fehlt das Glyphset im Font.
- 30 s nichts tun → Standby mit Uhr, Display sichtbar gedimmt.
- Display antippen → Main-Page, volle Helligkeit.
- Speicher prüfen: `debug:`-Komponente aktivieren und Free-Heap/PSRAM im Log
  beobachten. Bei Boot-Loops oder LVGL-Allokationsfehlern `buffer_size` senken.

---

## Bekannte Risiken

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Geteilter I2S-Bus mit 16 k/48 k | Audio verzerrt | Beide Raten auf 16000 angleichen |
| LVGL + Voice Assistant Speicherdruck | Boot-Loop / LVGL-Alloc-Fehler | `buffer_size` 25 % → 12 %, `task_stack_in_psram: true` |
| GPIO45/46 sind Strapping-Pins | Compile-Warnung, ggf. Bootprobleme | `ignore_strapping_warning: true` |
| AXP2101 nicht im Core | Kein Akku-Status | Für Netzbetrieb irrelevant; Phase 6 |
| micro_wake_word nur englisch | Wake Word englisch, Rest deutsch | Akzeptieren oder eigenes Modell (Phase 6) |
| Lautsprecher-Impedanz unklar | Verzerrung bei hoher Lautstärke | `volume_max` im `media_player` begrenzen |

---

## Quellen

- [ESPHome Device-Seite Waveshare ESP32-S3-Touch-AMOLED-1.75](https://devices.esphome.io/devices/waveshare-esp32-s3-touch-amoled-175/)
- [Waveshare Wiki / Doku](https://docs.waveshare.com/ESP32-S3-Touch-AMOLED-1.75)
- [Waveshare BSP-Repo (Pin-Definitionen)](https://github.com/waveshareteam/ESP32-S3-Touch-AMOLED-1.75)
- [esphome/wake-word-voice-assistants (ESP32-S3-Box-3 Referenz)](https://github.com/esphome/wake-word-voice-assistants)
- [esphome/home-assistant-voice-pe (offizielles Nabu-Casa-Projekt)](https://github.com/esphome/home-assistant-voice-pe)
- [ESPHome cst9220-Komponente (CST9217-Support)](https://github.com/esphome/esphome/tree/dev/esphome/components/cst9220)
- [ESPHome mipi_spi Display](https://esphome.io/components/display/mipi_spi/)
- [ESPHome voice_assistant](https://esphome.io/components/voice_assistant/)
- [ESPHome micro_wake_word](https://esphome.io/components/micro_wake_word/)
- [ESPHome LVGL](https://esphome.io/components/lvgl/)
