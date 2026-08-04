# CLAUDE.md

ESPHome-Firmware für einen Home Assistant Voice Satellite auf einem
**Waveshare ESP32-S3-Touch-AMOLED-1.75** (rundes AMOLED 466×466, CO5300 + CST9217).

Nutzerdoku steht im [README.md](README.md), der Umsetzungsplan mit den noch offenen
Ausbaustufen in [docs/plan.md](docs/plan.md). Antworten auf Deutsch.

## Befehle

```bash
esphome config assist-satellit.yaml                                   # Schema prüfen (schnell)
esphome compile assist-satellit.yaml                                  # kompilieren (langsam)
esphome run assist-satellit.yaml --device /dev/cu.usbmodem101         # Erstflash per USB
esphome run assist-satellit.yaml --device assist-satellit.local       # OTA-Update
```

`compile` läuft mehrere Minuten — immer im Hintergrund starten, nie synchron
blockieren. `config` ist der schnelle Vorabcheck und sollte laufen, bevor eine
Änderung als fertig gemeldet wird.

## Harte Regeln

- **Niemals in Home Assistant kompilieren.** Der Raspberry Pi schafft
  Voice-Assistant-Builds nicht (RAM/Zeit). Build-Host ist immer der Mac, OTA geht
  direkt vom Mac ans Gerät. HA braucht nur die ESPHome-*Integration*, nicht das
  Builder-Add-on.
- **`secrets.yaml` wird nie committet** und nie im Klartext ausgegeben. Änderungen an
  `.gitignore` nicht ohne Prüfung.
- **`min_version: 2026.7.0`** nicht senken — darunter fehlt der CST9217-Support.

## Verifizierte Hardware-Fakten

Diese drei Punkte weichen bewusst von der ESPHome-Device-Seite ab. Sie sind gegen
das Waveshare-BSP geprüft und dürfen **nicht** "zurückkorrigiert" werden:

1. **Touch nutzt die Core-Plattform `cst9220`**, die CST9217 mit abdeckt
   (`CST9217_CHIP_ID = 0x9217`, seit 2026.7.0). Die External Component
   `shelson/esphome-cst9217` ist unmaintained und wird nicht gebraucht.
2. **Ein einziger `i2s_audio`-Bus** für Mikrofon und Lautsprecher. Das Board hat laut
   BSP genau einen I2S-Controller mit DOUT und DSIN. Die Zwei-Bus-Variante mit
   `allow_other_uses` ist falsch.
3. **GPIO45 und GPIO46 sind Strapping-Pins.** Die Compile-Warnung zu GPIO45
   (I2S-LRCLK) ist bekannt und unkritisch, GPIO46 hat `ignore_strapping_warning`.

Pinout: siehe Tabelle im README. Quelle der Wahrheit ist das Waveshare-BSP
(`components/esp32_s3_touch_amoled_1_75/include/bsp/esp32_s3_touch_amoled_1_75.h`),
nicht devices.esphome.io.

## Aufbau

Geräte-YAML + Packages. **Farben, Phasen-IDs und Timings stehen als Substitutions in
`assist-satellit.yaml`** — dort ändern, nicht in den Packages.

| Datei | Inhalt |
|---|---|
| `packages/core.yaml` | SoC, PSRAM, WLAN, API, OTA, Zeit, Diagnose |
| `packages/hardware.yaml` | I2C, QSPI-Display, Touch, I2S, ES7210/ES8311, Media Player |
| `packages/voice.yaml` | Wake Word, Voice Assistant, Engine-Umschaltung, Mute |
| `packages/ui.yaml` | Fonts, LVGL-Seiten, Ring, Standby-Uhr, Bedienseite |

Die Voice-Assistant-Logik folgt `esphome/wake-word-voice-assistants`
(esp32-s3-box-3) und `esphome/home-assistant-voice-pe`. Bei neuen Features zuerst
dort schauen, wie es offiziell gelöst ist.

## Bekannte Einschränkungen

- **LVGL-Spinner hat kein Modify-Schema.** `spin_time` und `arc_length` sind zur
  Laufzeit nicht änderbar; `lvgl.widget.update` nimmt nur generische
  Objekt-Eigenschaften. Die Sprachphase wird deshalb allein über die Ringfarbe
  kommuniziert.
- **Mikrofon (16 kHz) und Lautsprecher (48 kHz) teilen sich den I2S-Bus.** Falls Ton
  verzerrt: beide in `packages/hardware.yaml` auf 16000 setzen.
- **micro_wake_word-Modelle sind englisch.** STT/TTS laufen unabhängig davon auf
  Deutsch über die HA-Pipeline.
- **AXP2101 ist nicht im ESPHome-Core** — keine Akku-Telemetrie. Für Netzbetrieb
  irrelevant.
