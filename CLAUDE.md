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

Geräte-YAML + Packages. **Phasen-IDs, Symbolfarben und Timings stehen als
Substitutions in `assist-satellit.yaml`** — dort ändern, nicht in den
Packages. Farben sind reine Compile-Zeit-Werte, es gibt keine
Laufzeit-Einstellung dafür: eine Änderung braucht immer einen Neubau.

| Datei | Inhalt |
|---|---|
| `packages/core.yaml` | SoC, PSRAM, WLAN, API, OTA, Zeit, Diagnose |
| `packages/hardware.yaml` | I2C, QSPI-Display, Touch, I2S, ES7210/ES8311, Media Player |
| `packages/voice.yaml` | Wake Word, Voice Assistant, Engine-Umschaltung, Mute |
| `packages/ui.yaml` | Fonts, LVGL-Seiten, Phasen-Animationen, Standby-Uhr, Zifferblatt, Timer-Ring |
| `packages/web.yaml` | Web-Bedienseite: Webserver, Ausrichtung, Standby-Seite |
| `sounds/` | Klingel- und Bestätigungston als FLAC, eingebettet über `files:` am Media Player |

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
| `core.yaml` → `on_boot` | `script: apply_rotation`, `global: boot_done` | `web.yaml` |
| `core.yaml` → `ha_time.on_time` | `script: update_clock`, `lbl_clock`, `lbl_date` | `ui.yaml` |
| `ui.yaml` → `show_standby_page` | `select: sel_standby_page` | `web.yaml` |
| `ui.yaml` → `on_screen_touch` | `script: abort_session` | `voice.yaml` |
| `hardware.yaml` → `touchscreen.on_touch/on_release` | `script: detect_long_press` | `ui.yaml` |
| `ui.yaml` → `show_config_page` | `text_sensor: device_ip` | `core.yaml` |
| `voice.yaml` → jedes `on_timer_*` | `script: update_timer_ui` | `ui.yaml` |
| `voice.yaml` → Klingel- und Bestätigungston | `media_player: media_out`, `files: snd_timer/snd_confirm` | `hardware.yaml` |
| `ui.yaml` → `on_screen_touch`, `update_timer_ui`, `update_clock` | `globals: timer_*` | `voice.yaml` |
| `ui.yaml` → `update_ui` | `globals: result_*`, `error_kind`, `is_followup` | `voice.yaml` |
| `core.yaml` → `api.actions.zeige_hinweis` | `script: show_hint` | `ui.yaml` |
| `core.yaml` → `ha_time.on_time` | `lbl_timer` | `ui.yaml` |
| `core.yaml` → `ha_time.on_time` | `script: update_dial` | `ui.yaml` |
| `hardware.yaml` → `display_brightness.on_turn_on` | `script: show_standby_page`, `standby_return`, `page_off` | `ui.yaml` |
| `hardware.yaml` → `display_brightness.on_turn_on` | `global: boot_done` | `web.yaml` |
| `web.yaml` → `sel_standby_page.on_value` | `script: show_standby_page`, `page_standby`, `page_dial` | `ui.yaml` |
| `web.yaml` → `sel_standby_page.on_value` | `global: boot_done` | `web.yaml` |

Der Minutentakt für Uhr und Zifferblatt liegt bewusst in `core.yaml` am
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
  `end_session`, `clear_error`, `abort_session`, `timer_start_ringing`,
  `timer_ring_sound`, `timer_ring_guard`, `timer_stop_ringing`
- `ui.yaml`: `update_ui`, `wake_display`, `sleep_display`, `standby_return`,
  `show_standby_page`, `show_config_page`, `detect_long_press`, `update_clock`,
  `update_dial`, `update_timer_ui`, `show_hint`
- `web.yaml`: `apply_rotation`

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

- **Eigene Töne dürfen nur spielen, wenn das Wake Word nicht lauscht.** Das
  Board hat genau einen I2S-Controller für Mikrofon und Lautsprecher. Läuft die
  Wake-Word-Erkennung, hält sie ihn mit 16 kHz; ein Lautsprecherstart mit
  48 kHz scheitert dann an `Parent bus is busy`
  (`i2s_audio.speaker.std:401`) und die Komponente versucht es im Sekundentakt
  weiter. Genau das passierte, als der Bestätigungston noch direkt im `on_end`
  lag. Er steht deshalb in `end_session` **zwischen** dem Warten auf das Ende
  der Sprachausgabe und `start_wake_word` — das einzige Fenster, in dem der Bus
  sicher frei ist — und wird über `confirm_pending` dorthin vorgemerkt. Wer
  weitere Töne einbaut, braucht dasselbe Fenster oder muss das Wake Word
  ringsum stoppen. Der Timer-Klingelton ist davon nicht betroffen: er läuft
  zwar bei aktivem Wake Word, aber `micro_wake_word` ist zu dem Zeitpunkt über
  `stop_after_detection` bereits gestoppt — falls dort doch `Parent bus is
  busy` auftaucht, ist das dieselbe Ursache.
- **Eine Zeile pro Antwort geht als `ESP_LOGI("ergebnis", …)` ins Log.** Sie
  zeigt Antworttext, erkannte Art, Wert und Einheit. Das ist Absicht und darf
  nicht wegoptimiert werden: ohne sie lässt sich nicht unterscheiden, ob die
  Klassifikation danebenlag oder die Anzeige — und diese Frage kostet sonst
  eine komplette Runde aus Compile und OTA.
- **Der Timer klingelt lokal, aber HA weiß nichts davon.** `on_timer_finished`
  feuert, und die Komponente löscht den Timer **unmittelbar danach**
  (`voice_assistant.cpp:1030`) — für Home Assistant ist er in dem Moment
  erledigt. Das Gerät muss ihn also nicht abräumen, und genau deshalb kommt
  das Stoppen per Tippen ohne eine HA-Automation aus: `timer_stop_ringing`
  beendet nur den lokalen Ton. Wer hier eine Rückmeldung an HA einbaut, löst
  ein Problem, das es nicht gibt.
- **Quelle der Wahrheit für den Ring ist `on_timer_tick`.** Der Takt liefert
  jede Sekunde die vollständige Liste; `started`/`updated` schreiben zusätzlich
  sofort, damit der Ring nicht bis zu einer Sekunde hinterherhinkt. Der Takt
  läuft nur, solange die Liste nicht leer ist (`voice_assistant.cpp:1035`) —
  nach dem letzten Timer kommt also keine Korrektur mehr, weshalb
  `on_timer_cancelled` und `on_timer_finished` `timer_active` selbst auf
  `false` setzen müssen. Laufen noch weitere Timer, korrigiert der nächste Tick
  das innerhalb einer Sekunde zurück; der Ring kann dabei kurz blinken.
- **Es gibt zwei Standby-Seiten, ausgewählt über den Index.**
  `show_standby_page` liest `sel_standby_page.active_index()`: 0 ist die Uhr
  (`page_standby`), 1 das Zifferblatt (`page_dial`). Eine neue Option gehört
  deshalb ans **Ende** der Liste — wer eine einschiebt, verschiebt die
  Zuordnung still. Dazu kommen ein Zweig in `show_standby_page` und ein
  eigener `is_showing`-Zweig im Minutentakt in `core.yaml`.
  Das `on_value` des Selects schaltet sofort um, wenn gerade eine
  Standby-Seite vorne liegt. Es braucht **beide** Guards und zwar
  geschachtelt: `boot_done` hält den Aufruf zurück, bis LVGL steht (ein
  Template-Select feuert sein `on_value` schon beim Setup), und erst danach
  darf die `is_showing`-Prüfung überhaupt laufen. Als `and:` wäre das nur
  wegen der Kurzschluss-Auswertung richtig — geschachtelt ist es sichtbar
  richtig.
  Auf dem Zifferblatt gibt es **keinen Countdown**: von einem laufenden Timer
  bleibt dort nur der Ring im `top_layer`. Das ist Absicht, die Ziffern
  stünden mitten im Kranz.
- **Standby heißt aus, nicht gedimmt.** Nach `standby_timeout` schaltet
  `sleep_display` das Display komplett ab: Helligkeit 0 **und** die leere Seite
  `page_off`. Beides zusammen, weil das Dimm-Register des CO5300 bei 0 nur die
  kleinste Stufe meint — erst eine Seite ohne leuchtendes Widget macht den
  AMOLED wirklich dunkel.
  Eine gedimmte Zwischenstufe gab es einmal (`standby_brightness` +
  `screen_off_delay`, zweistufig über ein Skript `screen_off`) und sie ist auf
  Ansage wieder entfallen: eine dauerhaft gedimmte Uhr war der einzige ständig
  leuchtende Inhalt im ganzen Entwurf. Beide Substitutions sind weg,
  `active_brightness` ist die einzige verbliebene Helligkeit. Wer die Stufe
  zurückholt, muss auch den Einbrennschutz mit zurückholen (siehe
  `core.yaml`).
  Uhr und Zifferblatt sind damit **keine Dauerzustände mehr**, sondern das, was
  ein Tippen für `standby_timeout` zeigt.
  **Der Rückweg in den Standby hängt nicht an einem zweiten `on_idle`.** Der
  `IdleTrigger` feuert je Untätigkeitsphase genau einmal
  (`lvgl_esphome.cpp:429`) und misst reine Touch-Untätigkeit. Nach einem
  Tippen greift er von selbst wieder (die Berührung setzt den Zähler zurück) —
  aber für einen Weckweg ohne Berührung käme er nie. Genau dafür gibt es
  `standby_return` (`delay: ${standby_timeout}` → `sleep_display`), und es hat
  genau **einen** Aufrufer: `display_brightness.on_turn_on` in `hardware.yaml`,
  also das Einschalten des Lichts aus Home Assistant. Ohne das stünde dort ein
  heller, leerer Bildschirm, den nichts mehr ausschaltet. Die geräteeigenen
  Wege laufen in diesem Trigger bewusst ins Leere, weil sie die Seite **vor**
  dem Einschalten umschalten; er feuert ohnehin nur beim Wechsel von aus nach
  an und braucht denselben `boot_done`-Guard wie `apply_rotation`, weil er
  schon beim Wiederherstellen des Lichtzustands im Setup feuern kann.
  Umgekehrt gilt: **jeder Weg, der das Display wach hält, muss
  `script.stop: standby_return` aufrufen** — sonst fällt der Bildschirm mitten
  im Hinschauen ins Dunkle. Das sind `wake_display`, `show_config_page` und der
  Idle/Muted-Zweig von `on_screen_touch`; letzterer holt zusätzlich über
  `show_standby_page` die Standby-Seite zurück, weil im Standby `page_off`
  vorne liegt und ein Tippen sonst nur das Nichts aufhellen würde.
  **Einen Pixel-Shift gibt es deshalb nicht mehr.** Uhr, Datum, Countdown und
  `dial_face` wanderten früher minütlich ein paar Pixel; das ist mit dem
  Ausschalten ersatzlos entfallen (`core.yaml` ruft im Minutentakt nur noch
  `update_clock` bzw. `update_dial`). Wer die zweite Stufe wieder ausbaut,
  muss den Einbrennschutz mit zurückholen.
- **`update_clock` steigt bei laufendem Timer aus.** Uhr und Datum teilen sich
  ihre Labels mit dem Countdown (`lbl_date` trägt dann den Timernamen). Ohne
  den Guard schriebe der Minutentakt aus `core.yaml` jede Minute Uhrzeit und
  Datum hinein, bis `update_timer_ui` eine Sekunde später zurückschreibt.

## Was Home Assistant dem Gerät schickt — und was nicht

Der wichtigste Punkt beim Erweitern der Ergebnisanzeige: **Das Gerät erfährt
nie, was ein Befehl bewirkt hat.** Strukturiert kommen nur drei Dinge an:

| Trigger | Nutzlast |
|---|---|
| `on_stt_end` | erkannter Text |
| `on_tts_start` | Antworttext |
| `on_timer_*` | `Timer{id, name, total_seconds, seconds_left, is_active}` |

`on_intent_end` existiert, hat aber eine **leere Parameterliste**
(`voice_assistant/__init__.py:311`) — keine Domain, keine Entität, kein Wert.
Ein Symbol je nach geschaltetem Gerät (Glühbirne, Rollo, Saugroboter) ist damit
**ohne HA-Automation nicht möglich**, und „Eingeschaltet" verrät nicht, was
eingeschaltet wurde. Diese Grenze bitte nicht durch immer feineres Parsen des
Antwortsatzes umgehen wollen.

Was daraus folgt: Die Klassifikation in `on_tts_start` ist bewusst eine
**Heuristik über den Antwortsatz** mit genau drei Ausgängen — Messwert
(`result_kind == 1`), Bestätigung (`== 2`) und alles Übrige (`phase_replying`,
also die fünf Balken wie bisher). Sie greift nur bei Antworten bis 60 Zeichen,
erkennt eine Zahl nur mit Einheit aus einer festen Liste und eine Bestätigung
nur als Satzanfang aus einer festen Wortliste. Erkennt sie nichts, bleibt alles
beim Alten — das ist der Rückfallpfad, nicht ein Fehlerfall.

**Ein LLM-Agent als Konversationsagent hebelt die Heuristik aus.** Läuft in
Home Assistant statt der eingebauten Intent-Erkennung ein Sprachmodell, sind die
Antworten Fließtext („Das klingt unangenehm. Soll ich die aktuelle Temperatur
im Schlafzimmer überprüfen …") statt „Eingeschaltet" oder „21,5 Grad". Die
Klassifikation greift dann nie und alles landet im Balken-Zweig — technisch
richtig, aber die Ergebnisanzeige bleibt in dem Fall ungenutzt. Das ist keine
Fehlfunktion und sollte nicht durch aufwendigeres Parsen „repariert" werden.

Wer echte Domain-Icons will, hat den Haken `api: actions: zeige_hinweis`
(`core.yaml` → `show_hint` in `ui.yaml`). Der ist **optional**: ohne einen
Aufruf aus HA passiert nichts, und der Normalbetrieb kommt ohne jede Automation
aus. Das ist eine Produktentscheidung — die Firmware soll weitergebbar sein,
ohne dass Fremde erst Automationen anlegen müssen.

Substitutions aus `assist-satellit.yaml` werden auch **innerhalb von Lambdas**
als `${phase_listening}` eingesetzt (Textersetzung vor dem YAML-Parsing) — daher
`switch/case` über Phasen statt Enums. Das gilt genauso für Farben: in Lambdas
steht `lv_color_hex(${color_listening})` bzw. `farbe = ${color_listening};`,
nie ein Global.

## Design-Referenz

`design_handoff_voice_ui/voice-ui-mockup.html` ist das erste HTML/CSS-Mockup der
vier Kernzustände (Standby, Listening, Thinking, Replying) — reine Vorlage, kein
Code fürs Gerät. Es zeigt noch den Ring, den es auf dem Gerät nicht mehr gibt
(siehe *Bekannte Einschränkungen*); sein Glow ist ein CSS-`drop-shadow` und hat in
LVGL ohnehin keine Entsprechung.

Ein drittes Mockup (`Runde Zeitanzeige.dc.html`, Claude-Design-Projekt
„Runde Zeitanzeige") ist die Vorlage für die Standby-Seite `page_dial`:
Strichkranz auf Radius 218, Ziffern auf Radius 168, keine Zeiger, aktuelle
Stunde und Minute im Akzent mit Glow. Übernommen sind Radien, Längen,
Strichstärken und Deckkräfte; nicht übernommen ist der dreifach gestapelte
CSS-`box-shadow` (LVGL kann nur einen Schatten) und der Schnittwechsel der
aktiven Ziffer auf Weight 500 — ein zweiter Font für zwölf Ziffern lohnt
nicht, Farbe und volle Deckkraft tragen die Hervorhebung.

Ein zweites, umfangreicheres Mockup (`Voice Assistant UI.dc.html` im
Claude-Design-Projekt "Voice Assistant UI Design") erweitert das um die drei
fehlenden Zustände **Error, Muted, Not Ready** und ersetzt den Phasentext auf
`page_main` durch Statusicons (Material Symbols, siehe unten). Umgesetzt mit
LVGL-Widgets in `ui.yaml`; das Mockup selbst bleibt reine Vorlage, nicht Code.

## Bekannte Einschränkungen

- **Es gibt keinen Phasen-Ring mehr — der Timer-Ring ist die eine Ausnahme.**
  `ring_timer` liegt im `top_layer` von LVGL und ist damit auf jeder Seite
  sichtbar, ohne ihn dreimal anzulegen. Er darf existieren, weil er eine
  völlig andere Last erzeugt als die gescheiterten Phasen-Ringe: **eine**
  Schicht statt vier, **kein** Glow, **keine** Deckkraftanimation, und eine
  Wertänderung **einmal pro Sekunde** statt 25-mal. Wer ihn anfasst, muss
  diese vier Punkte halten — insbesondere darf `update_timer_ui` pro Durchlauf
  nicht auch noch die Farbe setzen: die steht fest als `${color_timer}` in der
  Widget-Definition und ändert sich nie zur Laufzeit.
  Zwei LVGL-Eigenheiten stecken darin: `start_angle: 270` / `end_angle: 269`
  ist der übliche Weg zu einem Vollkreis ab zwölf Uhr (`start == end` wäre
  entartet und ergäbe gar keinen Bogen, und Werte über 360 normalisiert LVGL
  weg), und der Arc frisst keine Berührungen, weil der Codegen
  `LV_OBJ_FLAG_CLICKABLE` entfernt, sobald `adjustable` false ist
  (`lvgl/widgets/arc.py:88`) — sonst läge ein 462 px großer Fangkorb über der
  ganzen Oberfläche.
- **Das Zifferblatt ist die einzige Stelle mit `line:`-Widgets — und das ist
  ein Compile-Schalter, kein Stilmittel.** ESPHome kompiliert nur die
  LVGL-Widgets ein, die im YAML wirklich vorkommen (`__init__.py:476`:
  `LV_USE_<TYP>` je benutztem Typ, alles andere landet als `0` in der
  generierten `lv_conf.h`). Die 60 Striche von `page_dial` müssen deshalb im
  YAML stehen und können **nicht** zur Laufzeit über `lv_line_create` erzeugt
  werden — ohne einen einzigen `line:`-Eintrag steht `LV_USE_LINE` auf 0 und
  die Funktion existiert gar nicht. Der übliche Ausweg über
  `esphome: platformio_options: build_flags` fällt hier flach: der Build läuft
  als natives ESP-IDF/CMake-Projekt ohne `platformio.ini` (siehe auch den
  Hinweis zu `flash_mode` in `core.yaml`).
  Warum überhaupt `line:`: ein Strich zeigt radial nach außen, steht also
  fast immer schräg. Ein gedrehtes `obj:` bräuchte `transform_rotation` und
  damit einen eigenen Layer je Frame — dieselbe Bandbreitenfalle wie beim
  Ring. Ein `arc:` bräuchte keine Drehung, kann seine Winkel aber nur
  ganzzahlig setzen, und ein Grad sind auf Radius 218 rund 3,8 px; die zarten
  2-px-Minutenstriche des Entwurfs gäbe es damit nicht.
  Die 72 Zeilen Geometrie sind **erzeugt**, die Formel steht im
  Kopfkommentar von `page_dial`. Jeder Strich ist die Diagonale seiner
  eigenen Box, deshalb liegt die Box-Mitte genau auf dem Kranzradius und
  `align: CENTER` plus Versatz genügt. Das `max(…, 1)` bei Breite und Höhe
  gilt den vier achsparallelen Strichen (12, 3, 6, 9 Uhr): eine Box der
  Breite 0 hat eine leere Fläche und würde beim Zeichnen übersprungen.
  Drei weitere Punkte, die man beim Anfassen übersieht:
  - **`lv_line_set_points` kopiert nicht**, es übernimmt den Zeiger. Das
    Punktearray der Minutenmarke in `update_dial` muss deshalb `static` sein.
    Danach folgt zwingend ein `lv_obj_set_size`, sonst zieht die
    Inhaltsgröße (`width_def = LV_SIZE_CONTENT`) die Box wieder zusammen.
  - **Der Glow ist ein Kreis, der nur seinen Schatten trägt** (`bg_opa:
    TRANSP` plus `shadow_*`). LVGL kennt keinen Weichzeichner für Linien oder
    Text — das ist der einzige Weg. Er kostet nichts, weil er sich höchstens
    einmal pro Minute bewegt.
  - **Alle 72 Elemente liegen im Träger `dial_face`.** Angelegt wurde er für
    den Einbrennschutz, der das Zifferblatt mit *einem* Aufruf verschob statt
    mit 72; den gibt es nicht mehr, der Träger bleibt als greifbare Einheit.
    Er ist mit 560 px größer als der Bildschirm, weil LVGL Kinder am
    Elternrand abschneidet und der Glow sonst angeschnitten wäre.
  In einer **Flow-Sequenz muss eine Substitution in Anführungszeichen**
  (`points: [[0, "${dial_mark_len}"], …]`) — sonst liest der YAML-Parser das
  `${` als Beginn einer Flow-Map und bricht ab.
- **Für die Phasen gibt es keinen Ring.** Alle früheren Arc-Widgets
  (`ring_full`, `ring_slow`, `ring_fast` und ihre je drei Glow-Schichten) sind
  ersatzlos entfernt, samt
  aller `ring_*`- und `spin_time_*`-Substitutions, `color_track`,
  `color_muted` und `color_not_ready`. Jede Phase trägt sich jetzt über **ein
  Widget in der Bildschirmmitte**: Zuhören das atmende Mikrofon-Icon,
  Verarbeitung die drei Punkte, Sprachausgabe die fünf Balken, Error/Muted/Not
  Ready ein eingefärbtes Icon. `update_ui` versteckt zuerst alle dreizehn
  Widgets (`lbl_icon`, `dot_1`–`dot_3`, `bar_1`–`bar_5`, `lbl_value`,
  `lbl_unit`, `lbl_hint_icon`, `lbl_hint_text`) und zeigt danach genau eine
  Gruppe. Das steht seit der Ergebnisanzeige als **ein Lambda mit `switch`**
  statt als Kaskade aus `lvgl.widget.show/hide`: mit sechs Fällen wäre die
  YAML-Verschachtelung sechs Ebenen tief geworden.
  `lv_obj_add_flag`/`lv_obj_remove_flag` ist genau das, was der Codegen aus
  `lvgl.widget.hide/show` ohnehin erzeugt
  (`lvgl/widgets/__init__.py:317`) — Achtung, in LVGL 9.5 heißt es
  `remove_flag`, nicht mehr `clear_flag`.
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
  (`bar_1`–`bar_5`) — beide Phasen zeigen **kein** Icon. Es sind **sieben**
  Glyphen: `mic` (`\U0000E31D`), `mic_off` (`\U0000E02B`), `warning`
  (`\U0000F083`), `wifi_off` (`\U0000E648`), `question_mark` (`\U0000EB8B`),
  `check` (`\U0000E668`) und `notifications_active` (`\U0000E7F7`). Der Haken
  war mit der Sprachausgabe-Animation einmal entfallen und ist mit der
  Bestätigungsanzeige zurückgekommen.
  Die Farbcodierung läuft seit dem Wegfall des Phasen-Rings über die
  **Icon-Farbe**: Error → `${color_error}`, „nicht verstanden“ →
  `${color_thinking}`, Muted / Not Ready / „HA nicht erreichbar“ →
  `${color_text_dim}`, Bestätigung → `${color_result}`, Timer →
  `${color_timer}` — feste Substitutions aus `assist-satellit.yaml`, keine zur
  Laufzeit einstellbaren Werte.
  Dass ein Glyph mehrfach vorkommt, ist Absicht: `question_mark` steht für
  „nicht verstanden“ (`error_kind == 1`, amber) **und** für die Rückfrage
  (`is_followup` beim Zuhören, blau und atmend), `wifi_off` für „not ready“
  **und** für `error_kind == 2`.
  Die Fontgröße `font_icon: 216` gilt für alle Glyphen. Drei Maße hängen
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
