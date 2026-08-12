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
  **`secrets.public.yaml` ist davon ausgenommen und gehört committet** — es
  enthält bewusst keine echten Zugangsdaten, sondern feste Platzhalter für den
  anonymen Release-Build hinter `docs/` (siehe `.github/workflows/release.yml`
  und README, Abschnitt *Einrichtung*). Beim Anfassen dieser Datei nicht mit
  `secrets.yaml` verwechseln.
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
| `packages/ui.yaml` | Fonts, LVGL-Seiten, Phasen-Animationen, Standby-Uhr, Zifferblatt, Gesicht, Timer-Ring |
| `packages/settings.yaml` | Ausrichtung und Standby-Seite als HA-Entities |
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
| `core.yaml` → `on_boot` | `script: apply_rotation`, `global: boot_done` | `settings.yaml` |
| `core.yaml` → `ha_time.on_time` | `script: update_clock`, `lbl_clock`, `lbl_date` | `ui.yaml` |
| `ui.yaml` → `show_standby_page`, `update_timer_ui` | `select: sel_standby_page` | `settings.yaml` |
| `ui.yaml` → `on_screen_touch` | `script: abort_session` | `voice.yaml` |
| `hardware.yaml` → `touchscreen.on_touch/on_release` | `script: detect_long_press` | `ui.yaml` |
| `ui.yaml` → `show_config_page` | `text_sensor: device_ip` | `core.yaml` |
| `voice.yaml` → jedes `on_timer_*` | `script: update_timer_ui` | `ui.yaml` |
| `voice.yaml` → Klingel- und Bestätigungston | `media_player: media_out`, `files: snd_timer/snd_confirm` | `hardware.yaml` |
| `hardware.yaml` → `media_out.on_announcement` | `script: announcement_guard`, `global: voice_assistant_phase` | `voice.yaml` |
| `ui.yaml` → `on_screen_touch`, `update_timer_ui`, `update_clock` | `globals: timer_*` | `voice.yaml` |
| `ui.yaml` → `update_ui` | `globals: result_*`, `error_kind`, `is_followup` | `voice.yaml` |
| `core.yaml` → `api.actions.zeige_hinweis` | `script: show_hint` | `ui.yaml` |
| `core.yaml` → `ha_time.on_time` | `script: update_dial` | `ui.yaml` |
| `hardware.yaml` → `display_brightness.on_turn_on` | `script: show_standby_page`, `standby_return`, `page_off` | `ui.yaml` |
| `hardware.yaml` → `display_brightness.on_turn_on` | `global: boot_done` | `settings.yaml` |
| `settings.yaml` → `sel_standby_page.on_value` | `script: show_standby_page`, `page_standby`, `page_dial`, `page_face` | `ui.yaml` |
| `settings.yaml` → `sel_standby_page.on_value` | `global: voice_assistant_phase` | `voice.yaml` |
| `ui.yaml` → `wake_display` | `select: sel_standby_page` | `settings.yaml` |
| `settings.yaml` → `sel_standby_page.on_value` | `global: boot_done` | `settings.yaml` |

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
  `end_session`, `clear_error`, `abort_session`, `announcement_guard`,
  `timer_start_ringing`, `timer_ring_sound`, `timer_ring_guard`,
  `timer_stop_ringing`, `timer_ring_release`
- `ui.yaml`: `update_ui`, `wake_display`, `sleep_display`, `standby_return`,
  `show_standby_page`, `show_config_page`, `detect_long_press`, `update_clock`,
  `update_dial`, `update_timer_ui`, `ring_fade_out`, `show_hint`

**`wake_display` entscheidet, welche Seite die laufende Phase trägt** — nicht
`update_ui`. Das ist der einzige Ort, an dem der Gesichtsmodus hängt (siehe
unten); `update_ui` füllt weiterhin nur die Widgets von `page_main` und weiß
nichts von Seiten.
- `settings.yaml`: `apply_rotation`

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
- **`boot_done`** (`settings.yaml`) ist der zweite, unabhängige Guard: ein
  Template-Select veröffentlicht seinen restaurierten Wert schon beim Setup und
  feuert `on_value`, bevor LVGL steht. `apply_rotation` steigt deshalb aus,
  solange `boot_done` false ist; gesetzt wird es in `core.yaml` im `on_boot`
  mit priority `-100`. Nicht mit `init_in_progress` verwechseln — das hängt an
  der API-Verbindung und käme für die Ausrichtung viel zu spät.
- **Es gibt keine Weboberfläche mehr.** `web_server`, `packages/web.yaml` und
  das ganze Verzeichnis `web/` (eigene Bedienseite aus `app.js`/`app.css` plus
  `mockup.py`) sind entfallen — bedient wird ausschließlich über Home
  Assistant. Der Grund: Farben sind Compile-Zeit-Werte, das Farbfeld war schon
  vorher weg, und übrig blieben zwei Selects, die als HA-Entities ohnehin
  existieren. Was von `web.yaml` bleibt, steht in `packages/settings.yaml`:
  `sel_rotation`, `sel_standby_page`, `boot_done`, `apply_rotation`. Das Gerät
  beantwortet damit keine HTTP-Anfragen mehr (`captive_portal` im
  AP-Fallback ausgenommen). Wer die Seite zurückholen will, findet sie samt
  ihrer Begründungen in der Historie bis Commit vor diesem Umbau — sie hing
  nur an vier REST-Endpunkten und wäre wieder aufsetzbar.
  **`disabled_by_default` ist mit ihr entfallen.** Es hatte genau einen Zweck:
  die Bedienseite sollte nur die Display-Einstellungen zeigen, und `web_server`
  kennt kein "nur im Web verstecken". Ohne Weboberfläche kostet es nur — eine
  frisch eingerichtete HA-Integration legte die Entities deaktiviert an, und
  wer Displayhelligkeit oder Media Player dort vergaß, verlor den
  `on_turn_on`-Weg in den Standby und die Announcements. `entity_category`
  sortiert in HA ohnehin.
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
  `show_config_page` füllt die Adresse erst zur Laufzeit aus `device_ip` —
  beim Bauen ist sie unbekannt. Der QR-Code, der dort einmal stand, ist mit
  der Weboberfläche entfallen: er hätte ins Leere geführt. Die Seite zeigt
  jetzt Gerätename und Adresse, und ihr Zweck ist nur noch der eine —
  nachsehen, wohin `esphome run`/`esphome logs` gehen müssen.

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
  ringsum stoppen.
  **Der Timer-Klingelton stoppt es ringsum** — hier stand einmal, er sei nicht
  betroffen, weil `stop_after_detection` das Modell ohnehin angehalten habe.
  Das war falsch, und der Ton kam deshalb nie: `stop_after_detection` greift
  erst nach einer *Erkennung*, ein ablaufender Timer trifft das Gerät aber in
  aller Regel mitten im Lauschen. `timer_ring_sound` ruft deshalb selbst
  `stop_wake_word` und wartet 500 ms (dieselben wie beim Engine-Wechsel: der
  Mikrofontask gibt den Bus nicht im selben Atemzug frei);
  `timer_ring_release` stellt es wieder scharf, sobald der Lautsprecher fertig
  ist — und nur dann, wenn inzwischen kein Sprachvorgang begonnen hat, denn
  dessen `end_session` macht das selbst. Der Preis des einen Busses: solange
  es klingelt, hört das Gerät kein Wake Word. Beenden geht per Tippen, und
  nach `timer_ring_timeout` gibt `timer_ring_guard` von selbst Ruhe.
  **Dasselbe gilt für Ansagen aus Home Assistant** (`tts.speak`,
  `assist_satellite.announce`, `assist_satellite.ask_question`): sie treffen
  das Gerät im Leerlauf, also mitten im Lauschen, und blieben deshalb komplett
  stumm. `media_out.on_announcement` (`hardware.yaml`) ruft dafür
  `announcement_guard` — **ohne Phasenprüfung**, und das ist der Kern: dort
  stand zuerst eine auf `phase_idle`/`phase_muted`, und der Guard lief deshalb
  nie. `on_announce` feuert nämlich **zuerst** den TTS-Start-Trigger
  (`voice_assistant.cpp:1056`) und schickt die Ansage erst danach an den Media
  Player; die Phase steht also längst auf `phase_replying`. Sichtbar war das
  als „fünf Balken, aber kein Ton".
  Das Gerät räumt den Bus auch nicht selbst: `on_announce` geht nur
  `if (this->continuous_)` nach `STOP_MICROPHONE` (`voice_assistant.cpp:1070`),
  also allein in der HA-Engine. Das lokale `micro_wake_word` läuft unabhängig
  weiter und hält das Mikrofon.
  Der Guard fasst deshalb **nur `micro_wake_word` an**, nie `stop_wake_word`:
  dessen `voice_assistant.stop` würde die Ansage abwürgen, die ja gerade aus
  der Pipeline kommt. Scharf gestellt wird eine Sekunde nach dem letzten Ton
  und nur, wenn weder die Pipeline noch `micro_wake_word` schon wieder laufen
  — nach einer Rückfrage nimmt HA sofort auf, nach einer gewöhnlichen Antwort
  hat `end_session` es selbst getan. Ohne all das hing `ask_question` fest: HA
  wartet auf das Ende der Frage, die nie zu hören war.
- **`on_end` heißt bei einer Ansage nicht „fertig", sondern „losgegangen".**
  `on_announce` feuert `end_trigger_` **sofort beim Start** der Ansage
  (`voice_assistant.cpp:1080`), nicht an ihrem Ende. `end_session` läuft also
  die ganze Ansage lang mit und räumte danach unbesehen auf — bei
  `assist_satellite.ask_question` genau falsch: die Pipeline geht nach der
  Frage von selbst nach `START_MICROPHONE` weiter
  (`voice_assistant.cpp:513`), und das `voice_assistant.stop` aus
  `start_wake_word` drehte ihr das ab. Sichtbar als: Frage kommt, danach
  sofort Standby, kein Fragezeichen.
  Deshalb `pipeline_session` — gesetzt in `on_listening`, geprüft in
  `end_session`. War kein Sprachvorgang im Spiel, wartet `end_session` zwei
  Sekunden, bevor es aufräumt. Abgebrochen wird es in dieser Zeit nicht von
  sich selbst, sondern von `on_listening` (`script.stop: end_session`), sobald
  Home Assistant wirklich aufnimmt. Ein `voice_assistant.is_running` als
  Abbruchbedingung schiede aus: die Condition ist mit
  `|| is_continuous()` in der HA-Engine immer wahr
  (`voice_assistant.h:383`).
  **Der Bestätigungston braucht dieselben 500 ms.** `speaker.is_playing` wird
  false, sobald die letzten Samples abgegeben sind; den Bus gibt der
  Lautsprechertask erst danach frei. Ohne die Pause vor `start_wake_word`
  scheiterte `micro_wake_word` am Mikrofon — und weil danach nichts mehr
  nachfasst, blieb das Gerät nach einem still ausgeführten Befehl taub.
- **Nach der Antwort gehört die Bühne noch der Pipeline.** Home Assistant
  meldet eine offene Rückfrage im **`INTENT_END`**-Ereignis als
  `continue_conversation` (`esphome/assist_satellite.py`); gesetzt wird es,
  sobald die Antwort mit einem Fragezeichen endet
  (`conversation/chat_log.py` — auch griechisches `;` und vollbreites `？`).
  Die Komponente merkt es sich und wertet es erst nach dem Ton aus:
  `RESPONSE_FINISHED` geht dann nach `START_MICROPHONE` statt nach `IDLE`
  (`voice_assistant.cpp:513`).
  Zwischen „Ton fertig" und dieser Auswertung liegen rund 100 ms — und genau
  dort lag `start_wake_word`, dessen `voice_assistant.stop` den Merker
  **bedingungslos** löscht (`voice_assistant.cpp:692`). Das Gerät räumte sich
  also seine eigene Rückfrage ab, und im Log stand `RESPONSE_FINISHED → IDLE`.
  Deshalb wartet `end_session` vor dem Scharfstellen, bis
  `voice_assistant.is_running` false ist (Timeout 5 s, nur in der lokalen
  Engine — in der HA-Engine ist die Condition wegen `|| is_continuous()`
  immer wahr). Läuft die Rückfrage weiter, bricht `on_listening` das Skript
  ohnehin ab.
  **Merke: jedes `voice_assistant.stop` ist auch ein „vergiss die
  Rückfrage".** Wer eines hinzufügt, muss prüfen, ob an der Stelle eine offene
  Rückfrage möglich ist.
- **Ein Wachhund hält das Wake Word am Leben.** `interval: 30s` am Ende von
  `voice.yaml`: steht das Gerät im Leerlauf, ist nicht stumm, läuft die lokale
  Engine, spielt nichts — und `micro_wake_word` läuft trotzdem nicht —, dann
  startet er es neu und schreibt eine `WARN`-Zeile. Der Grund für dieses Netz
  ist, dass sämtliche Bus-Fehler dieses Projekts dasselbe Muster haben: ein
  fehlgeschlagener Mikrofonstart wird von niemandem wiederholt, und das Gerät
  steht danach still da und hört nichts mehr — ohne jede Meldung. Die
  Einzelstellen sind repariert (500 ms nach dem Bestätigungston,
  `announcement_guard`, `pipeline_session`); der Wachhund fängt die nächste.
  **Die `WARN`-Zeile darf nicht wegoptimiert werden** — schlägt er regelmäßig
  an, ist eine der Einzelkorrekturen unvollständig, und ohne die Zeile fällt
  genau das nie auf, weil er es ja repariert.
- **Eine Fehleranzeige gehört `clear_error`.** Viele Fehler lösen *beides* aus,
  erst `on_error` und gleich danach `on_end`. Ohne einen Guard räumte
  `end_session` das Fragezeichen nach Sekundenbruchteilen wieder weg, obwohl
  `clear_error` es drei Sekunden stehen lassen wollte — von außen ein
  Aufblitzen. Der abschließende `set_idle_or_muted` + `update_ui` in
  `end_session` läuft deshalb nur, solange die Phase **nicht** `phase_error`
  ist.
- **Die Balken enden mit dem Ton, die Ergebnisanzeige nicht.** `end_session`
  wartet auf das Ende der Sprachausgabe und setzt danach sofort
  `set_idle_or_muted` + `update_ui`, **falls** die Phase noch
  `phase_replying` ist. Ohne diesen Zweig liefen die fünf Balken noch die
  8 s des Nachlaufs weiter, obwohl längst nichts mehr zu hören war. Der
  Nachlauf bleibt, aber er gehört `phase_result`: Messwert und Haken sollen
  stehen bleiben (`${result_hold_time}`, 5 s), in `phase_replying` steht
  dagegen nichts Lesbares auf dem Schirm. Wer dort eine weitere Anzeige
  einbaut, die den Ton überdauern soll, muss sie wie das Ergebnis aus diesem
  Zweig ausnehmen.
  **Die Textsensoren haben ihre eigene, längere Standzeit** (`delay: 8s` am
  Ende von `end_session`). Sie sind die einzige Stelle, an der Frage und
  Antwort in Home Assistant landen, und hängen deshalb nicht daran, wie lange
  das Gerät selbst etwas zeigt.
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
- **Es gibt drei Standby-Seiten, ausgewählt über den Index.**
  `show_standby_page` liest `sel_standby_page.active_index()`: 0 ist die Uhr
  (`page_standby`), 1 das Zifferblatt (`page_dial`), 2 das Gesicht
  (`page_face`). Eine neue Option gehört deshalb ans **Ende** der Liste — wer
  eine einschiebt, verschiebt die Zuordnung still. Dazu kommen ein Zweig in
  `show_standby_page` und — sofern die Seite Zeit anzeigt — ein eigener
  `is_showing`-Zweig im Minutentakt in `core.yaml`. `page_face` braucht dort
  keinen.
  Das `on_value` des Selects schaltet sofort um, wenn gerade eine
  Standby-Seite vorne liegt. Es braucht **beide** Guards und zwar
  geschachtelt: `boot_done` hält den Aufruf zurück, bis LVGL steht (ein
  Template-Select feuert sein `on_value` schon beim Setup), und erst danach
  darf die `is_showing`-Prüfung überhaupt laufen. Als `and:` wäre das nur
  wegen der Kurzschluss-Auswertung richtig — geschachtelt ist es sichtbar
  richtig.
  **Ein laufender Timer sticht die Auswahl aus.** Weder Zifferblatt noch
  Gesicht können den Countdown tragen — die Ziffern stünden mitten im Kranz
  bzw. im Gesicht —, und der Ring allein sagt nur "noch ein Rest", nicht wie
  lang. Solange `timer_active` gilt, zeigt der Standby deshalb immer
  `page_standby`. Das steht an **zwei** Stellen, und beide werden gebraucht:
  in `show_standby_page` (beim Betreten des Standbys) und als eigener Zweig am
  Anfang von `update_timer_ui` (der Timer startet oder endet, während schon
  eine Standby-Seite vorne liegt). Der zweite Zweig schaltet die Seite selbst
  um, statt `show_standby_page` zu rufen: das Skript endet mit
  `update_timer_ui`, und ein `mode: restart`-Skript, das sich selbst neu
  startet, schösse sich mitten im eigenen Durchlauf ab.
  Sein Guard auf `phase_idle`/`phase_muted` ist die Umsetzung von "erst nach
  der Sprachausgabe": im Gesichtsmodus trägt `page_face` auch Zuhören,
  Verarbeitung und Sprachausgabe, und mitten hinein soll kein Countdown
  springen. `page_off` bleibt in beiden Zweigen außen vor — ein Timer weckt
  den Bildschirm nicht.
- **Das Gesicht ist eine Standby-Seite mit Sonderrolle.** `page_face` ist die
  Umsetzung von „Animierter Charakter rundes Display" (`Device Face.dc.html`).
  Anders als Uhr und Zifferblatt liegt es nicht nur nach einem Tippen vorne:
  ist es gewählt, trägt es auch **Zuhören, Verarbeitung und Sprachausgabe** —
  also genau die drei Phasen, die sonst Mikrofon-Icon, Punkte und Balken
  zeigen. Alles Übrige (Messwert, Haken, Fehler, stumm, nicht bereit,
  klingelnder Timer, `show_hint`) bleibt auch im Gesichtsmodus bei
  `page_main`: das trägt Information und ist keine Animation, für die der
  Entwurf eine Miene kennt.
  Die Abzweigung sitzt in **`wake_display`** und nirgends sonst — das ist die
  einzige Stelle, die `page_main` vorlegt, und sie wird von `update_ui` wie von
  `on_screen_touch` gerufen. `update_ui` selbst weiß nichts davon und füllt
  weiterhin nur die Widgets von `page_main`; im Gesichtsmodus liegen die dann
  eben hinten. Wer die Auswahl in `update_ui` nachbaut, hat sie an zwei Orten.
  **Ein Takt für alle vier Zustände statt vier Takte.** Punkte, Balken und
  Mikrofon haben je einen eigenen `interval:`, weil sie sich gegenseitig nie
  sehen. Das Gesicht ist in jeder Phase dasselbe Gesicht — nur seine Zielwerte
  wechseln. Genau daran hängt der geforderte fließende Übergang: jede Größe
  hat einen laufenden Wert und ein Ziel, und der laufende nähert sich dem Ziel
  je Takt um `k = 0.14` (`wert += (ziel - wert) * k`). Das ist ein
  exponentieller Einlauf ohne Zeitachse, die man treffen müsste — wechselt
  mitten in der Bewegung die Phase, biegen die Augen ab, statt zu springen.
  Bei 33 ms sind rund 0,45 s bis 90 % des Weges, das entspricht dem
  `transform .5s cubic-bezier(.4,0,.2,1)` des Mockups. Bewusst **nicht**
  eingeschliffen sind vier Dinge: der Lidschlag (eigenes `k = 0.5`, ein
  Schnappen; das Müde-Werden umgekehrt mit `k = 0.18`), der Wechsel des
  Mundziels beim Reden (alle 140 ms neu, der Weg dorthin bleibt weich — daher
  zappelt der Mund, statt zu flackern), der Versatz des Zitterns (kommt erst
  nach dem Einlauf dazu, geglättet wäre es ein Wackeln) und der Mundradius
  (zwischen Pille und rundem „O" gibt es keine Zwischenform, die gemeint wäre).
  **Das Warten kennt zwölf Marotten** — Zunge, große Augen, offener Mund,
  Doppelblinzler, müde, Augenrollen, doppelter Blick, Zwinkern, skeptisch,
  Staunen, Grinsen, Zittern. Gezogen werden sie **nicht gewürfelt, sondern aus
  einem Mischbeutel**: alle zwölf liegen einmal darin, werden per Fisher-Yates
  gemischt und der Reihe nach abgearbeitet; beim Nachfüllen wird getauscht,
  falls die erste der neuen Runde die letzte der alten wäre. Damit kommt keine
  zweimal hintereinander, jede gleich oft, und die Reihenfolge ist in jeder
  Runde eine andere. Wer eine Marotte einschiebt, muss ihre Nummer im `enum`,
  ihre Dauer in `QUIRK_DAUER` und ihren Zweig im inneren `switch` zusammen
  pflegen — die Nummern sind Indizes, kein Zufallsbereich mehr.
  **Zwinkern und Skeptisch sind der Grund, warum die Augen getrennte Werte
  haben** (`esl`/`esr`, `lidl`/`lidr`, eigene Cache-Paare). Vorher teilten sie
  sich Größe und Cache; die Position gilt weiterhin beiden, deshalb steht sie
  als `pos_neu` vor den zwei Zweigen und ihr Merker wird erst danach
  nachgezogen.
  **Geschrieben wird nur, was sich in ganzen Pixeln geändert hat.** Das ist
  kein Feinschliff, sondern der Grund, warum der Glow bezahlbar bleibt: ein
  `lv_obj_set_size` invalidiert alte *und* neue Fläche, mit Glow je Auge rund
  122×172 px. Im Warten stehen die Augen die meiste Zeit still und der Takt
  läuft ohne einen einzigen LVGL-Aufruf durch; bewegt wird nur in Schüben von
  einer knappen halben Sekunde. Bei Ruckeln ist `face_glow` die erste
  Stellschraube — auf 0 nimmt es den Weichzeichner ganz heraus. (Ungetestet
  auf dem Gerät, aber dieselbe Bandbreitenfalle wie beim gescheiterten Ring.)
  Der `is_showing: page_face`-Guard steht in **YAML** statt im Lambda und
  ersetzt zugleich eine Prüfung auf den Gesichtsmodus: `page_face` liegt nur
  vorne, wenn das Gesicht gewählt ist. Aus demselben Grund haben Punkte und
  Balken seither einen `is_showing: page_main`-Guard bekommen — sonst rechneten
  sie im Gesichtsmodus für eine unsichtbare Seite. Das **Mikrofon bleibt ohne
  Guard**: sein Lambda muss beim Verlassen der Phase `text_opa` und Ausrichtung
  zurücksetzen, und das darf nicht ausfallen.
  Die Geometrie ist 1:1 aus dem Mockup übernommen, das schon auf 466×466
  gezeichnet ist; umgerechnet ist nur der Bezugspunkt (dort linke obere Ecke,
  hier die Bildschirmmitte). Alle Versätze stehen **positiv** in den
  Substitutions und werden vorzeichenrichtig eingesetzt (`-${face_eye_dy}`) —
  eine negative Substitution ergäbe irgendwo `--71`.
  **Das Fragezeichen steht auf der Gegenseite des Blicks.** Beim Denken gehen
  die Augen nach `34 * seite`, das Fragezeichen nach `-${face_q_dx} * seite`.
  Ursprünglich hatten beide dasselbe Vorzeichen — dann stapelte sich alles in
  derselben oberen Ecke und das Fragezeichen lag den Augen im Weg. Wer das
  Vorzeichen anfasst, dreht damit die Aussage der Miene um.
  Die Zunge liegt in der Z-Ordnung **unter** dem Mund und ragt 6 px in ihn
  hinein, damit ihre oberen Ecken verdeckt sind: LVGL kann Radien nur für alle
  vier Ecken zugleich, das `border-radius: 0 0 20px 20px` des Mockups gibt es
  so nicht.
  `esphome::random_uint32()` statt `rand()`: der Hardware-RNG braucht keinen
  Startwert und liefert nicht auf jedem Gerät dieselbe Folge — sonst blinzelten
  alle Satelliten im Gleichtakt.
- **Standby heißt aus, nicht gedimmt.** Nach `standby_timeout` schaltet
  `sleep_display` das Display komplett ab: Helligkeit 0 **und** die leere Seite
  `page_off`. Beides zusammen, weil das Dimm-Register des CO5300 bei 0 nur die
  kleinste Stufe meint — erst eine Seite ohne leuchtendes Widget macht den
  AMOLED wirklich dunkel.
  Eine gedimmte Zwischenstufe gab es einmal (`standby_brightness` +
  `screen_off_delay`, zweistufig über ein Skript `screen_off`) und sie ist auf
  Ansage wieder entfallen: eine dauerhaft gedimmte Uhr war der einzige ständig
  leuchtende Inhalt im ganzen Entwurf. Beide Substitutions sind weg; wer die
  Stufe zurückholt, muss auch den Einbrennschutz mit zurückholen (siehe
  `core.yaml`).
  **Ein sichtbarer Bildschirm hat trotzdem zwei Helligkeiten**, und das ist
  kein Widerspruch dazu: `active_brightness` (100 %) gilt allein beim Zuhören,
  alles andere — Uhr, Zifferblatt, Gesicht im Warten, Verarbeitung, Antwort,
  Fehler, Hinweis, Konfigurationsseite — läuft auf
  `idle_brightness` (80 %). Der Sprung nach
  oben ist selbst Rückmeldung ("er hört jetzt zu") und fällt aus dem
  Augenwinkel auf, bevor das Mikrofon-Icon gelesen ist. Die Verzweigung sitzt
  in `wake_display`; die beiden anderen Stellen, die das Display einschalten
  (`on_screen_touch` im Leerlauf, `show_config_page`), nehmen fest
  `idle_brightness`. Wer eine weitere ergänzt, muss
  sich dort für eine der beiden Stufen entscheiden.
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
- **Der Countdown steht in drei Labels, nicht in einem.** `lbl_timer_pre`
  (rechtsbündig), `lbl_timer_colon` (feste Box in der Mitte) und
  `lbl_timer_sec` (linksbündig). Grund ist die Schrift: Figtrees Ziffern sind
  proportional, eine `1` ist schmaler als eine `8` — ein einzelnes zentriertes
  Label wanderte deshalb mit jeder Sekunde hin und her. Anker ist der letzte
  Doppelpunkt; nur über einer Stunde rückt die Gruppe um
  `${timer_hour_shift}` nach rechts, sonst stieße `1:23` links über den runden
  Rand — und ab zehn Stunden um `${timer_hour_shift2}` weiter, weil links eine
  Ziffer dazukommt und die Box nach links wächst (die halbe Ziffernbreite,
  rund 30 px bei `timer_font_size: 110`). Geschrieben wird mit
  `lv_obj_set_style_x`, weil der Codegen `x:` als Style-Property anlegt.
- **Die Ergebnisanzeige ist Icon, Zahl und Einheit.** Zahl und Einheit stehen
  nebeneinander in `box_result` (Flex, `flex_align_cross: END` als Ersatz für
  eine Grundlinie, die LVGL nicht kennt), darüber `lbl_result_icon`. Die feste
  Breite von 440 px ist Absicht: mit `SIZE_CONTENT` wüchse die Gruppe bei
  langen Einheiten („17:45 Uhr") über den runden Rand. `pad_column` kennt der
  Codegen nicht, der Abstand ist ein `pad_left` an der Einheit.
  **Welches Icon, entscheidet allein die Einheit** — mehr weiß das Gerät
  nicht, `on_intent_end` hat eine leere Parameterliste. Unbekanntes bekommt
  das Thermometer, weil Temperatur der häufigste Fall ist. **Prozent bekommt
  als einzige Einheit gar kein Icon**: das Zeichen steht schon hinter der
  Zahl, das Prozent-Icon darüber sagte dasselbe zweimal — `ico` ist dann
  `nullptr` und `lbl_result_icon` bleibt versteckt. Die Einheit **„Uhr" ist
  entfallen**: Home Assistant antwortet „Es ist 22:26" ohne Einheit hinter der
  Zahl, die Erkennung hätte also nie gegriffen (mit ihr das `schedule`-Icon).
- **Die Glocke des abgelaufenen Timers pulsiert am Mikrofon-Takt.** Es ist
  dasselbe Widget (`lbl_icon`) in derselben Größe, also braucht es keinen
  zweiten `interval:` — der Takt prüft auf `phase_listening` **oder**
  `phase_timer_ringing`.

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
also die fünf Balken wie bisher). Sie greift nur bei Antworten bis 80 Zeichen
und erkennt eine Zahl nur mit Einheit aus einer festen Liste. Erkennt sie
nichts, bleibt alles beim Alten — das ist der Rückfallpfad, nicht ein
Fehlerfall.

Die Bestätigung wird als Wort aus einer festen Liste **irgendwo** im Satz
gesucht, begrenzt auf 45 Zeichen, und sie wird **vor** dem Messwert geprüft:
„Rollo auf 50 Prozent gestellt" enthält eine Zahl mit Einheit, ist aber die
Rückmeldung zu einem Befehl. Eine Bestätigung schlägt deshalb eine Zahl im
selben Satz — der Preis ist, dass „Die Heizung ist auf 21 Grad eingestellt"
den Haken statt der Zahl zeigt. Befehle sind der häufigere Fall. Der frühere Test auf den *Satzanfang* traf
nur die knappste Form („Eingeschaltet.") — antwortete Home Assistant mit „Das
Licht wurde eingeschaltet", liefen die fünf Balken, obwohl gar nichts
gesprochen wurde. Die Längengrenze ist der Preis dafür: sie hält Sätze
draußen, die das Wort nur beiläufig enthalten („Im Wohnzimmer sind drei von
fünf Lampen eingeschaltet").

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

**Sein `icon` ist ein Name, kein `mdi:`-Slug.** Der Font trägt sieben Glyphen,
und ein nicht eingebetteter Codepoint ergab bisher das leere Kästchen des
Fonts — was aus HA heraus wie ein Fehler aussieht, weil `mdi:bell` dort
überall sonst funktioniert. `show_hint` übersetzt deshalb selbst:
`mikrofon`, `stumm`, `warnung`, `offline`, `frage`, `haken`, `glocke`. Ein
unbekannter Name zeigt **nur den Text** (`hint_text_only`, das `update_ui`
beim Wiederaufbau nach einem Sprachvorgang mitlesen muss); ein roher
Codepoint geht weiterhin durch, erkannt an einem Byte ≥ 0x80.

Substitutions aus `assist-satellit.yaml` werden auch **innerhalb von Lambdas**
als `${phase_listening}` eingesetzt (Textersetzung vor dem YAML-Parsing) — daher
`switch/case` über Phasen statt Enums. Das gilt genauso für Farben: in Lambdas
steht `lv_color_hex(${color_listening})` bzw. `farbe = ${color_listening};`,
nie ein Global.

## Design-Referenz

Das erste HTML/CSS-Mockup der vier Kernzustände (Standby, Listening, Thinking,
Replying) lag als `design_handoff_voice_ui/voice-ui-mockup.html` im Repo und ist
mit der README-Überarbeitung entfernt worden — es zeigte noch den Ring, den es
auf dem Gerät nicht mehr gibt (siehe *Bekannte Einschränkungen*), war also nicht
mehr die aktuelle Referenz. Wer es braucht, findet es in der Git-Historie vor
diesem Commit.

Ein viertes Mockup (`Device Face.dc.html`, Claude-Design-Projekt „Animierter
Charakter rundes Display") ist die Vorlage für `page_face`: zwei leuchtende
Augen und ein Mund, vier Zustände (Warten, Zuhören, Denken, Reden). Übernommen
sind Geometrie, Zeiten und die Zufallsbereiche der Marotten; nicht übernommen
ist das eckenselektive `border-radius` der Zunge (LVGL kann nur alle vier Ecken
zugleich, siehe unten). Der Glow ist im Mockup ein CSS-`box-shadow` und hier
ein LVGL-`shadow_*` am Widget selbst — das ist der eine Fall im Projekt, in dem
es dafür keinen Hilfskreis braucht, weil Augen und Mund gefüllte Rechtecke sind
und ihren Schatten selbst tragen können.

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

Zwei weitere Mockups betrafen die **Weboberfläche** des Geräts
(`Konfigurationsseite` und `Bedienseite` in Claude Design). Sie sind mit ihr
zusammen hinfällig; `web/mockup.py`, das Standbild für diese Entwürfe erzeugte,
ist mit dem Verzeichnis `web/` entfallen.

## Bekannte Einschränkungen

- **Es gibt keinen Phasen-Ring mehr — der Timer-Ring ist die eine Ausnahme.**
  `ring_timer` liegt im `top_layer` von LVGL und ist damit auf jeder Seite
  sichtbar, ohne ihn dreimal anzulegen. Er darf existieren, weil er eine
  völlig andere Last erzeugt als die gescheiterten Phasen-Ringe: **eine**
  Schicht statt vier, **kein** Glow, **keine** dauernde Deckkraftanimation,
  und eine Wertänderung **einmal pro Sekunde** statt 25-mal. Wer ihn anfasst,
  muss diese vier Punkte halten — insbesondere darf `update_timer_ui` pro
  Durchlauf nicht auch noch die Farbe setzen: die steht fest als
  `${color_timer}` in der Widget-Definition und ändert sich nie zur Laufzeit.
  **Die eine erlaubte Ausnahme ist `ring_fade_out`**: beim Abbrechen oder
  Ablaufen eines Timers verschwand der Ring von einem Bild aufs nächste, was
  wie ein Anzeigefehler wirkte. Jetzt läuft er auf null und blendet dabei aus
  — `${ring_fade_steps}` × `${ring_fade_step_time}` (14 × 25 ms), einmalig und
  danach nie wieder. Am Ende setzt das Skript die Deckkraft zurück, sonst
  finge der nächste Timer blass an; ein neuer Timer stoppt ein laufendes
  Ausblenden (`script.stop` im Aktiv-Zweig von `update_timer_ui`).
  Der Ring ist mit `${timer_ring_width}` 18 px breit und wächst dabei nach
  innen — die Außenkante bleibt auf 462.
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
  - **Den Glow des Entwurfs gibt es nicht mehr — und er kommt nicht
    zurück.** LVGL kennt keinen Weichzeichner für Linien oder Text, der
    einzige Weg war je ein Kreis, der nur seinen Schatten trägt (`bg_opa:
    TRANSP` plus `shadow_*`). Auf dem Gerät sah das nicht nach Leuchten aus,
    sondern nach einem kleinen Kreis **um** Ziffer und Minutenmarke herum: der
    Schatten ist die weichgezeichnete Kontur der Box, und bei 34 px Box mit
    40 px Weichzeichnung bleibt davon ein Ring übrig. Hervorgehoben wird
    seither das Element selbst — Akzentfarbe `${color_dial}` und volle
    Deckkraft, beim Strich zusätzlich mehr Länge (`dial_mark_len`) und
    `line_width: 4` gegen die 3 px der Stundenstriche. `dial_glow_num` und
    `dial_glow_tick` sind samt ihren Aufrufen in `update_dial` entfallen.
  - **Alle 72 Elemente liegen im Träger `dial_face`.** Angelegt wurde er für
    den Einbrennschutz, der das Zifferblatt mit *einem* Aufruf verschob statt
    mit 72; den gibt es nicht mehr, der Träger bleibt als greifbare Einheit.
    Er ist genau bildschirmgroß (466 px) — LVGL schneidet Kinder am Elternrand
    ab, und das äußerste Element ist die Minutenmarke mit 218 + 10 = 228 px.
    Die früheren 560 px galten allein dem Glow.
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
- **Die PV-Übersicht ist entfallen.** `page_power`, `update_power_flow`, der
  Schalter `sw_pv_overview`, die vier `homeassistant`-Sensorimporte in
  `core.yaml`, die fünf `font_power_*` und alle `power_*`- bzw.
  `color_pv`/`color_batt`/`color_netz`-Substitutions sind weg. Mit ihr fiel die
  einzige Ausnahme im `on_idle` (eine "angepinnte" Seite, die der Standby nicht
  wegräumen durfte) und der einzige Zweig in `on_screen_touch`, der einen
  Schalter statt einer Seite umlegte. Wer so etwas wieder braucht: die Umsetzung
  von `Leistungsfluss Display.dc.html` steht vollständig in der Historie.
- **Mikrofon (16 kHz) und Lautsprecher (48 kHz) teilen sich den I2S-Bus.** Falls Ton
  verzerrt: beide in `packages/hardware.yaml` auf 16000 setzen.
- **micro_wake_word-Modelle sind englisch.** STT/TTS laufen unabhängig davon auf
  Deutsch über die HA-Pipeline.
- **AXP2101 ist nicht im ESPHome-Core** — keine Akku-Telemetrie. Für Netzbetrieb
  irrelevant.
