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

Geräte-YAML + Packages. **Phasen-IDs und Timings stehen als Substitutions in
`assist-satellit.yaml`** — dort ändern, nicht in den Packages. Für die
**Symbolfarben** gilt das nur noch halb: die Substitutions sind der
Auslieferungszustand und dienen als `initial_value` der Globals `col_*` in
`web.yaml`; zur Laufzeit gilt, was auf der Web-Bedienseite eingestellt und per
`restore_value` gespeichert ist. Eine Farbänderung in `assist-satellit.yaml`
wirkt daher nur auf einem Gerät, das diese Farbe noch nie gesetzt bekommen hat.

| Datei | Inhalt |
|---|---|
| `packages/core.yaml` | SoC, PSRAM, WLAN, API, OTA, Zeit, Diagnose |
| `packages/hardware.yaml` | I2C, QSPI-Display, Touch, I2S, ES7210/ES8311, Media Player |
| `packages/voice.yaml` | Wake Word, Voice Assistant, Engine-Umschaltung, Mute |
| `packages/ui.yaml` | Fonts, LVGL-Seiten, Phasen-Animationen, Standby-Uhr |
| `packages/web.yaml` | Web-Bedienseite: Webserver, Ausrichtung, Standby-Seite, Symbolfarben |

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
| `core.yaml` → `on_boot` | `script: apply_rotation`, `sync_color_texts`, `global: boot_done` | `web.yaml` |
| `core.yaml` → `on_boot` | `script: apply_colors` | `ui.yaml` |
| `core.yaml` → `ha_time.on_time` | `script: update_clock`, `lbl_clock`, `lbl_date` | `ui.yaml` |
| `web.yaml` → jede Farbeingabe | `script: apply_colors` | `ui.yaml` |
| `ui.yaml` → `update_ui`, `apply_colors` | `globals: col_*` | `web.yaml` |
| `ui.yaml` → `show_standby_page` | `select: sel_standby_page` | `web.yaml` |
| `ui.yaml` → `on_screen_touch` | `script: abort_session` | `voice.yaml` |
| `hardware.yaml` → `touchscreen.on_touch/on_release` | `script: detect_long_press` | `ui.yaml` |
| `ui.yaml` → `show_config_page` | `text_sensor: device_ip` | `core.yaml` |

Der Minutentakt für Uhr und Einbrennschutz liegt bewusst in `core.yaml` am
`time:`-Block und nicht bei den Widgets: ESPHome führt **Plattform-Listen wie
`time:` nicht per `id` über Package-Grenzen zusammen** — ein zweiter Eintrag mit
`id: ha_time` in `ui.yaml` wird als eigene, plattformlose Komponente validiert
und schlägt fehl.

Zentraler Zustand ist das Global **`voice_assistant_phase`** (`voice.yaml`).
Regel: **nie die Phase setzen, ohne danach `script.execute: update_ui`
aufzurufen** — `update_ui` schaltet nicht nur die Widgets der Mitte, es entscheidet auch
über Standby (`phase_idle` → `sleep_display`, alles andere → `wake_display`).

Die Skripte sind die Bedienoberfläche der Logik, nicht die Handler selbst:

- `voice.yaml`: `start_wake_word`, `stop_wake_word`, `set_idle_or_muted`,
  `end_session`, `clear_error`, `abort_session`
- `ui.yaml`: `update_ui`, `wake_display`, `sleep_display`, `show_standby_page`,
  `show_config_page`, `detect_long_press`, `update_clock`, `apply_colors`
- `web.yaml`: `apply_rotation`, `sync_color_texts`

**Alles mit `delay:` oder `wait_until:` gehört in ein Skript mit `mode: restart`,
nie direkt in einen Trigger.** Ein Trigger ist eine Aktionsliste ohne
Restart-Semantik — feuert er ein zweites Mal, während die erste Liste noch in
einem `delay` hängt, laufen beide durcheinander. Deshalb sind `on_end` und
`on_error` nur noch Einzeiler, die `end_session` bzw. `clear_error` starten;
`on_listening` und `on_client_disconnected` brechen beide per `script.stop` ab,
damit ihr verzögertes `set_idle_or_muted` nicht in einen neuen Vorgang
hineinschreibt. Jedes `wait_until` braucht zusätzlich ein `timeout:`, sonst hängt
das Gerät bei einem verschluckten Zustandswechsel dauerhaft in der Phase fest.

Punkte, die man beim Ändern leicht übersieht:

- **Lokales Wake Word und HA-Wake-Word schließen sich aus.** `start_wake_word`
  schaltet je nach Select `wake_word_engine_location` entweder
  `micro_wake_word.start` **oder** `set_use_wake_word(true)` +
  `voice_assistant.start_continuous`. Nie beides direkt aufrufen — immer über die
  Skripte gehen, sonst streiten sich beide um das Mikrofon.
- **`init_in_progress`** unterdrückt Fehler-Anzeigen und das `on_value` des
  Selects, bis die API-Verbindung steht (`on_client_connected` setzt es auf
  `false`). Neue Boot-Zeit-Logik muss diesen Guard mitprüfen.
- **`boot_done`** (`web.yaml`) ist der zweite, unabhängige Guard: ein
  Template-Select veröffentlicht seinen restaurierten Wert schon beim Setup und
  feuert `on_value`, bevor LVGL steht. `apply_rotation` steigt deshalb aus,
  solange `boot_done` false ist; gesetzt wird es in `core.yaml` im `on_boot`
  mit priority `-100`. Nicht mit `init_in_progress` verwechseln — das hängt an
  der API-Verbindung und käme für die Ausrichtung viel zu spät.
- **Ein Tippen bricht den laufenden Sprachvorgang ab.** `on_screen_touch`
  verzweigt nach Phase: Zuhören/Verarbeitung/Sprachausgabe → `abort_session`,
  sonst wie bisher Display wecken bzw. nur aufhellen. `abort_session` ruft
  `voice_assistant.stop` (`request_stop()` beendet die Pipeline aus jedem
  Zustand und stoppt in der Sprachausgabe das Announcement selbst — ein
  eigenes `media_player.stop` wäre doppelt), setzt die Phase über
  `set_idle_or_muted` und stellt das Wake Word über `end_session` wieder
  scharf, statt `start_wake_word` direkt zu rufen: nur `end_session` wartet,
  bis der Lautsprecher den I2S-Bus freigegeben hat. Ein danach doch noch
  eintreffendes `on_end` startet dasselbe Skript neu — `mode: restart`, also
  läuft nichts doppelt. Wichtig ist das `start_wake_word` am Ende, weil
  `request_stop()` `continuous_` löscht und das Gerät in der HA-Engine sonst
  taub bliebe.
- **Gedrückthalten öffnet `page_config`.** Die Geste steckt nicht in LVGL,
  sondern im Touchscreen-Treiber: `on_touch` startet `detect_long_press`
  (`delay: ${long_press_time}`), `on_release` stoppt es wieder. LVGLs
  `on_long_press` schied aus, weil es an einem Widget hängt und nur feuert,
  wenn der Finger auch eins trifft — hier soll jede Stelle zählen. `on_touch`
  feuert genau einmal je Berührung (`touchscreen.cpp`: `first_touch_`), das
  `mode: restart` des Skripts wird also nicht von Bewegungen zurückgesetzt.
  `show_config_page` füllt Label und QR-Code erst zur Laufzeit aus
  `device_ip` — beim Bauen ist die Adresse unbekannt. Die Ruhezone des
  QR-Codes muss dabei explizit an (`lv_qrcode_set_quiet_zone`), LVGL hat sie
  per Default aus und die Module stünden bis an den Kachelrand.

Substitutions aus `assist-satellit.yaml` werden auch **innerhalb von Lambdas**
als `${phase_listening}` eingesetzt (Textersetzung vor dem YAML-Parsing) — daher
`switch/case` über Phasen statt Enums. Für Farben gilt das nicht mehr: in
Lambdas steht `lv_color_hex((uint32_t) id(col_listening))`, die Substitution
`${color_listening}` taucht nur noch als `initial_value` des Globals auf.

## Design-Referenz

`design_handoff_voice_ui/voice-ui-mockup.html` ist das erste HTML/CSS-Mockup der
vier Kernzustände (Standby, Listening, Thinking, Replying) — reine Vorlage, kein
Code fürs Gerät. Es zeigt noch den Ring, den es auf dem Gerät nicht mehr gibt
(siehe *Bekannte Einschränkungen*); sein Glow ist ein CSS-`drop-shadow` und hat in
LVGL ohnehin keine Entsprechung.

Ein zweites, umfangreicheres Mockup (`Voice Assistant UI.dc.html` im
Claude-Design-Projekt "Voice Assistant UI Design") erweitert das um die drei
fehlenden Zustände **Error, Muted, Not Ready** und ersetzt den Phasentext auf
`page_main` durch Statusicons (Material Symbols, siehe unten). Umgesetzt mit
LVGL-Widgets in `ui.yaml`; das Mockup selbst bleibt reine Vorlage, nicht Code.

## Bekannte Einschränkungen

- **Es gibt keinen Ring mehr.** Alle Arc-Widgets (`ring_full`, `ring_slow`,
  `ring_fast` und ihre je drei Glow-Schichten) sind ersatzlos entfernt, samt
  aller `ring_*`- und `spin_time_*`-Substitutions, `color_track`,
  `color_muted` und `color_not_ready`. Jede Phase trägt sich jetzt über **ein
  Widget in der Bildschirmmitte**: Zuhören das atmende Mikrofon-Icon,
  Verarbeitung die drei Punkte, Sprachausgabe die fünf Balken, Error/Muted/Not
  Ready ein eingefärbtes Icon. `update_ui` versteckt zuerst alle neun Widgets
  (`lbl_icon`, `dot_1`–`dot_3`, `bar_1`–`bar_5`) und zeigt danach in einer
  dreistufigen Kaskade genau eine Gruppe.
  Der Ring war über mehrere Anläufe an der Zeichenbandbreite gescheitert: Die
  rotierenden Spinner ruckelten, weil vier konzentrische Arcs dieser Größe pro
  Frame den kompletten Ringkranz neu zeichnen; eine atmende **Deckkraft**
  ruckelte ebenso, sobald der Zyklus kurz genug war, um zu leben (zuletzt
  32 ms × 22 = 704 ms) — jede Deckkraftänderung zwingt LVGL, vier Arcs über den
  vollen 466-px-Kranz per Alpha gegen Schwarz zu mischen, fast die halbe
  Displayfläche pro Tick. Eine reine **Farbinterpolation** des stehenden Rings
  lief flüssig, wurde aber gestalterisch verworfen; danach fiel der Ring ganz.
  Wer ihn wieder einführen will, muss die Bandbreitengrenze mitplanen — und
  wissen, dass LVGL keinen Blur kennt (Glow nur als gestapelte Kopien), der
  LVGL-Arc keine Strichelung kann und der LVGL-Spinner kein Modify-Schema hat
  (`spin_time`/`arc_length` zur Laufzeit nicht änderbar).
- **Zuhören atmet das Mikrofon-Icon.**
  `update_ui` färbt das zentrale `lbl_icon` blau (`color_listening`,
  `0x03A9F4`) und ein eigener `interval: ${mic_step_time}` am Ende von `ui.yaml`
  lässt es atmen — dieselbe angehobene Kosinuswelle wie bei den Punkten der
  Verarbeitung, nur mit einem einzigen Widget und ohne Versatz: Deckkraft von
  `mic_opa_min` (60) auf 255 und eine Hebung um `mic_lift` (18 px), geschrieben
  per `lv_obj_set_style_text_opa` und `lv_obj_align`. Zyklus 40 ms × 22 =
  880 ms, in der Größenordnung des Design-Mockups (`pulse-ring 1.6s
  ease-in-out`; die Kosinuswelle ist dessen `ease-in-out`). Die **Größe** wird
  bewusst nicht animiert: ein Fontwechsel wäre ein sichtbarer Sprung, und der
  Weg über `transform_scale` lässt LVGL 9 das Widget pro Frame in einen
  eigenen Layer rendern — genau die Zeichenbandbreite, an der schon der Ring
  gescheitert ist (ungetestet, aber der Grund, es gar nicht erst zu
  versuchen). Die
  Deckkraft darf hier animieren, weil es ein einzelnes 240×240-Label ist und
  kein 466-px-Kranz. Der Endzustand muss beim Verlassen der Phase
  **zurückgesetzt** werden (`aktiv`-Merker: `text_opa` auf `LV_OPA_COVER`,
  Alignment auf Mitte) — `update_ui` setzt zwar `text_color`, aber weder
  `text_opa` noch die Ausrichtung. Bei Punkten und Balken entfällt das, weil
  die außerhalb ihrer Phase versteckt sind und der erste Takt alles neu
  schreibt.
- **Statusicons statt Phasentext.** `page_main` zeigt seit dem zweiten
  Design-Mockup keinen Text mehr (`lbl_phase`/`lbl_request`/`lbl_response`
  wurden entfernt), sondern ein Icon aus dem Font `font_icon`
  (`gfonts://Material+Symbols+Outlined`, Codepoints aus dem
  [Material-Symbols-Codepoint-Register](https://github.com/google/material-design-icons/blob/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints)).
  Das war eine bewusste Design-Entscheidung: Antworttext ist damit nur noch als
  `text_sensor` in HA sichtbar, nicht mehr auf dem Display. Verarbeitung zeigt
  stattdessen drei Punkte (`dot_1`–`dot_3`), Sprachausgabe fünf Balken
  (`bar_1`–`bar_5`) — beide Phasen zeigen **kein** Icon. Übrig sind damit
  **vier** Glyphen: `mic` (`\U0000E31D`), `mic_off` (`\U0000E02B`), `warning`
  (`\U0000F083`), `wifi_off` (`\U0000E648`); der Haken für „fertig“
  (`\U0000E668`) ist mit der Sprachausgabe-Animation entfallen.
  Die Farbcodierung von Error/Muted/Not Ready läuft seit dem Wegfall des Rings
  über die **Icon-Farbe**: Error → `col_error`, Muted und Not Ready →
  `col_dim` (Globals aus `web.yaml`, vorbelegt mit `${color_error}` bzw.
  `${color_text_dim}`).
  Die Fontgröße `font_icon: 216` gilt für alle vier Glyphen. Drei Maße hängen
  daran und müssen bei einer Änderung mitgezogen werden: die Box von `lbl_icon`
  (240×240), die Breite der Punktgruppe
  (`2 * dot_gap + dot_size_max = 2*79 + 58 = 216`) und die der Balkengruppe
  (`4 * bar_gap + bar_width = 4*48 + 24 = 216`).
- **Die Sprachausgabe ist ein Äqualizer aus fünf Balken.** `bar_1`–`bar_5` sind
  schlichte `obj:`-Widgets (`bg_color: ${color_replying}`, `radius: 20`,
  `border_width: 0`) mit eigenem `interval: ${bar_step_time}`-Takt nach demselben
  Muster wie die Punkte: angehobene Kosinuswelle, Versatz
  `bar_cycle_steps / 5 = 4`, Höhe zwischen `bar_size_min` und `bar_size_max`,
  Deckkraft ab `bar_opa_min`. Die Amplitude ist zusätzlich mit
  `{0.45, 0.75, 1.0, 0.75, 0.45}` skaliert — außen flacher, damit die Gruppe in
  den runden Bildschirm passt und nicht an den Rand stößt. Zyklus 40 ms × 20 =
  800 ms.
- **Die Punkt-Animation läuft als eigener Takt.** ESPHome-LVGL hat kein
  Animations-Primitive für Widget-Eigenschaften (`lvgl.widget.update` kennt
  keine Zeitachse). Ein `interval:`-Block am Ende von `ui.yaml` schreibt daher
  alle `dot_step_time` Größe, Position und Deckkraft der drei Punkte direkt über
  die LVGL-C-API (`lv_obj_set_size`, `lv_obj_align`, `lv_obj_set_style_bg_opa`).
  Die Amplitude ist eine angehobene Kosinuswelle, jeder Punkt ein Drittel Zyklus
  versetzt — der Buckel wandert von links nach rechts. Zwei Fallstricke: nach
  jedem `lv_obj_set_size` muss `lv_obj_align` folgen, sonst wächst der Punkt
  nach rechts unten statt aus seiner Mitte; und `radius` der Punkte ist bewusst
  größer als die halbe maximale Kantenlänge, damit LVGL auf die Hälfte klemmt
  und der Punkt in jeder Größe rund bleibt. Der Takt läuft immer, steigt aber
  außerhalb von `${phase_thinking}` sofort aus. Parameter: `dot_size`,
  `dot_size_max`, `dot_gap`, `dot_lift`, `dot_opa_min`, `dot_step_time`,
  `dot_cycle_steps` in `assist-satellit.yaml`.
- **Mikrofon (16 kHz) und Lautsprecher (48 kHz) teilen sich den I2S-Bus.** Falls Ton
  verzerrt: beide in `packages/hardware.yaml` auf 16000 setzen.
- **micro_wake_word-Modelle sind englisch.** STT/TTS laufen unabhängig davon auf
  Deutsch über die HA-Pipeline.
- **AXP2101 ist nicht im ESPHome-Core** — keine Akku-Telemetrie. Für Netzbetrieb
  irrelevant.
