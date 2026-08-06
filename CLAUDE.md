# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
esphome logs assist-satellit.yaml --device assist-satellit.local      # Laufzeit-Logs übers Netz
esphome clean assist-satellit.yaml                                    # Build-Cache verwerfen
```

`compile` läuft mehrere Minuten — immer im Hintergrund starten, nie synchron
blockieren. `config` ist der schnelle Vorabcheck und sollte laufen, bevor eine
Änderung als fertig gemeldet wird.

Es gibt **keine Testsuite und keine CI**. Verifikation ist die Kette
`config` → `compile` → OTA → `logs`; die Checkliste dazu steht im Abschnitt
*Verification* in [docs/plan.md](docs/plan.md). `config` löst Substitutions und
Packages auf, prüft aber keine Lambdas — C++-Fehler in `!lambda` fallen erst beim
`compile` auf.

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
| `packages/ui.yaml` | Fonts, LVGL-Seiten, Ring, Standby-Uhr |

Die Voice-Assistant-Logik folgt `esphome/wake-word-voice-assistants`
(esp32-s3-box-3) und `esphome/home-assistant-voice-pe`. Bei neuen Features zuerst
dort schauen, wie es offiziell gelöst ist.

### Wie die Packages zusammenhängen

ESPHome-Packages sind **kein Namensraum** — alle IDs landen in einem flachen
Gültigkeitsbereich und werden über Dateigrenzen hinweg referenziert. Ein
umbenanntes `id:` bricht deshalb still ein anderes Package. Die bestehenden
Querverbindungen:

| Wer | ruft/nutzt | wo definiert |
|---|---|---|
| `hardware.yaml` → `touchscreen.on_touch` | `script: on_screen_touch` | `ui.yaml` |
| `voice.yaml` → jeder Phasenwechsel | `script: update_ui` | `ui.yaml` |
| `ui.yaml` → Standby-Uhr | `ha_time` | `core.yaml` |
| `ui.yaml` → Helligkeit | `light: display_brightness` | `hardware.yaml` |
| `core.yaml` → `on_boot` | `script: update_ui` | `ui.yaml` |
| `core.yaml` → `ha_time.on_time` | `script: update_clock`, `lbl_clock`, `lbl_date` | `ui.yaml` |

Der Minutentakt für Uhr und Einbrennschutz liegt bewusst in `core.yaml` am
`time:`-Block und nicht bei den Widgets: ESPHome führt **Plattform-Listen wie
`time:` nicht per `id` über Package-Grenzen zusammen** — ein zweiter Eintrag mit
`id: ha_time` in `ui.yaml` wird als eigene, plattformlose Komponente validiert
und schlägt fehl.

Zentraler Zustand ist das Global **`voice_assistant_phase`** (`voice.yaml`).
Regel: **nie die Phase setzen, ohne danach `script.execute: update_ui`
aufzurufen** — `update_ui` malt nicht nur Ring und Texte, es entscheidet auch
über Standby (`phase_idle` → `sleep_display`, alles andere → `wake_display`).

Die Skripte sind die Bedienoberfläche der Logik, nicht die Handler selbst:

- `voice.yaml`: `start_wake_word`, `stop_wake_word`, `set_idle_or_muted`,
  `end_session`, `clear_error`
- `ui.yaml`: `update_ui`, `wake_display`, `sleep_display`, `update_clock`

**Alles mit `delay:` oder `wait_until:` gehört in ein Skript mit `mode: restart`,
nie direkt in einen Trigger.** Ein Trigger ist eine Aktionsliste ohne
Restart-Semantik — feuert er ein zweites Mal, während die erste Liste noch in
einem `delay` hängt, laufen beide durcheinander. Deshalb sind `on_end` und
`on_error` nur noch Einzeiler, die `end_session` bzw. `clear_error` starten;
`on_listening` und `on_client_disconnected` brechen beide per `script.stop` ab,
damit ihr verzögertes `set_idle_or_muted` nicht in einen neuen Vorgang
hineinschreibt. Jedes `wait_until` braucht zusätzlich ein `timeout:`, sonst hängt
das Gerät bei einem verschluckten Zustandswechsel dauerhaft in der Phase fest.

Zwei Punkte, die man beim Ändern leicht übersieht:

- **Lokales Wake Word und HA-Wake-Word schließen sich aus.** `start_wake_word`
  schaltet je nach Select `wake_word_engine_location` entweder
  `micro_wake_word.start` **oder** `set_use_wake_word(true)` +
  `voice_assistant.start_continuous`. Nie beides direkt aufrufen — immer über die
  Skripte gehen, sonst streiten sich beide um das Mikrofon.
- **`init_in_progress`** unterdrückt Fehler-Anzeigen und das `on_value` des
  Selects, bis die API-Verbindung steht (`on_client_connected` setzt es auf
  `false`). Neue Boot-Zeit-Logik muss diesen Guard mitprüfen.

Substitutions aus `assist-satellit.yaml` werden auch **innerhalb von Lambdas**
als `${phase_listening}` / `${color_thinking}` eingesetzt (Textersetzung vor dem
YAML-Parsing) — daher `switch/case` über Phasen statt Enums.

## Design-Referenz

`design_handoff_voice_ui/voice-ui-mockup.html` ist das erste HTML/CSS-Mockup der
vier Kernzustände (Standby, Listening, Thinking, Replying) — reine Vorlage, kein
Code fürs Gerät. Der Glow um den Ring im Mockup ist ein CSS-`drop-shadow` und hat
in LVGL keine Entsprechung; Optionen dazu stehen im README des Ordners.

Ein zweites, umfangreicheres Mockup (`Voice Assistant UI.dc.html` im
Claude-Design-Projekt "Voice Assistant UI Design") erweitert das um die drei
fehlenden Zustände **Error, Muted, Not Ready** und ersetzt den Phasentext auf
`page_main` durch Statusicons (Material Symbols, siehe unten). Umgesetzt mit
LVGL-Widgets in `ui.yaml`; das Mockup selbst bleibt reine Vorlage, nicht Code.

## Bekannte Einschränkungen

- **LVGL-Spinner hat kein Modify-Schema.** `spin_time` und `arc_length` sind zur
  Laufzeit nicht änderbar; `lvgl.widget.update` nimmt nur generische
  Objekt-Eigenschaften. Deshalb liegen in `ui.yaml` drei fertige Ringvarianten
  übereinander (`ring_slow` 1400 ms, `ring_fast` 800 ms, `ring_full` stehend),
  und `update_ui` blendet die passende ein. Neue Ringtempi heißen: neuer
  Spinner, nicht neuer Parameter.
- **LVGL kennt keinen Blur.** Der Glow aus dem Design-Mockup ist als zweiter,
  breiterer Ring mit `${ring_glow_opa}` dahinter angenähert (`*_glow`-Widgets).
  Die beiden Spinner-Paare laufen synchron, weil sie dieselbe `spin_time` haben
  und beim Seitenaufbau gemeinsam starten — driftet das auf dem Gerät sichtbar
  auseinander, sind die Glow-Spinner das Erste, was rausfliegt.
- **LVGL-Arc kennt keine Strichelung.** Das zweite Design-Mockup zeigt Muted als
  gestrichelten und Not Ready als gepunkteten Ring — bewusste Design-Entscheidung
  war, das **nicht** über viele kleine Arc-Segmente nachzubauen, sondern nur die
  Ringfarbe zu ändern (`color_muted`, `color_not_ready` in
  `assist-satellit.yaml`). Beide bleiben technisch der gleiche `ring_full` wie
  Replying/Error.
- **Kein Pulse-Animation-Primitive in ESPHome-LVGL.** Das Mockup lässt den
  Listening-Ring als Vollring in Skalierung und Helligkeit pulsieren; das gibt es
  in ESPHome-LVGL nicht ohne eigene Endlos-Animationslogik über `interval:`.
  Angenähert mit dem bereits vorhandenen rotierenden `ring_slow`-Spinner statt
  einer neuen Animation.
- **Statusicons statt Phasentext.** `page_main` zeigt seit dem zweiten
  Design-Mockup keinen Text mehr (`lbl_phase`/`lbl_request`/`lbl_response`
  wurden entfernt), sondern ein Icon aus dem Font `font_icon`
  (`gfonts://Material+Symbols+Outlined`, Codepoints aus dem
  [Material-Symbols-Codepoint-Register](https://github.com/google/material-design-icons/blob/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints)).
  Das war eine bewusste Design-Entscheidung: Antworttext ist damit nur noch als
  `text_sensor` in HA sichtbar, nicht mehr auf dem Display. Verarbeitung zeigt
  stattdessen drei statische Punkte (`dot_1`–`dot_3`) statt des im Mockup
  blinkenden Trios — aus demselben Grund wie beim Pulse: keine neue
  Endlos-Animation für einen rein kosmetischen Effekt.
- **Mikrofon (16 kHz) und Lautsprecher (48 kHz) teilen sich den I2S-Bus.** Falls Ton
  verzerrt: beide in `packages/hardware.yaml` auf 16000 setzen.
- **micro_wake_word-Modelle sind englisch.** STT/TTS laufen unabhängig davon auf
  Deutsch über die HA-Pipeline.
- **AXP2101 ist nicht im ESPHome-Core** — keine Akku-Telemetrie. Für Netzbetrieb
  irrelevant.
