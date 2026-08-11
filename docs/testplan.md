# Testplan — Abhakliste

Alle Funktionen des Satelliten in Testreihenfolge. Nummern sind stabil: bei
einem Problem genügt „Nummer 34 geht nicht".

Voraussetzung: Gerät geflasht, per WLAN erreichbar, in Home Assistant
eingebunden. Für viele Punkte hilft ein offenes Log:

```bash
esphome logs assist-satellit.yaml --device assist-satellit.local
```

## A. Grundfunktion und Anbindung

- [ ] **1.** Gerät bootet, Display zeigt nach dem Start etwas an (nicht schwarz).
- [ ] **2.** Gerät erscheint in Home Assistant, API verbunden (keine Anzeige „nicht bereit" mehr).
- [ ] **3.** Bei fehlender HA-Verbindung: `wifi_off`-Icon in Grau (Phase „nicht bereit").
- [ ] **4.** OTA-Update läuft durch (`esphome run … --device assist-satellit.local`).
- [ ] **5.** Diagnose-Entities in HA vorhanden und plausibel: Freier Heap, Freier PSRAM, WLAN-Signal, ESPHome-Version, IP-Adresse.
- [ ] **6.** Entity „Neustart" startet das Gerät neu.

## B. Sprachassistent — Grundablauf

- [ ] **7.** Wake Word „okay nabu" wird lokal erkannt (Standardmodell).
- [ ] **8.** Wake Word „hey jarvis" wird erkannt.
- [ ] **9.** Wake Word „hey mycroft" wird erkannt.
- [ ] **10.** Nach der Erkennung: blaues Mikrofon-Icon in der Mitte, es **atmet** (Deckkraft und Höhe schwanken, Zyklus ~0,9 s).
- [ ] **11.** Beim Zuhören geht die Helligkeit sichtbar hoch (80 % → 100 %) und danach wieder zurück.
- [ ] **12.** Nach dem Sprechen: drei gelbe Punkte laufen als Welle von links nach rechts (Verarbeitung).
- [ ] **13.** Während der Antwort: fünf grüne Balken als Äqualizer, Mitte höher als außen.
- [ ] **14.** Die Balken enden **mit** dem Ton, nicht später.
- [ ] **15.** Antwort ist über den Lautsprecher hörbar und unverzerrt.
- [ ] **16.** Bestätigungston nach einem Schaltbefehl **ohne** Sprachausgabe. *(Nur dann — nach einer gesprochenen Antwort kommt keiner. So gewollt.)*
- [ ] **17.** Direkt danach ist das Wake Word wieder scharf (zweiter Befehl funktioniert ohne Wartezeit).
- [ ] **18.** In HA: Sensor „Erkannter Text" zeigt die letzte Frage.
- [ ] **19.** In HA: Sensor „Antwort" zeigt die letzte Antwort.
- [ ] **20.** Im Log steht je Antwort eine Zeile `ergebnis: Antwort='…' -> art=… wert='…' einheit='…'`.

## C. Rückfragen, Fehler, Sonderfälle

- [ ] **21.** Rückfrage von HA (`assist_satellite.ask_question`): die Frage ist **hörbar**, danach zeigt das Display ein **Fragezeichen** statt des Mikrofons, blau und atmend. *(Repariert: die Ansage blieb stumm, weil die Wake-Word-Erkennung den I2S-Bus hielt — HA wartete dann ewig auf ihr Ende. `announcement_guard` räumt den Bus jetzt und stellt danach wieder scharf.)*
  *Zusatzprüfung:* nach der beantworteten Rückfrage hört das Gerät wieder auf das Wake Word.
  *Zweiter Fehler an derselben Stelle:* die Frage war hörbar, aber das Gerät fiel sofort in den Standby statt aufzunehmen. `on_announce` feuert `end_trigger` beim **Start** der Ansage, nicht an ihrem Ende — der Aufräumteil drehte der Pipeline die Aufnahme ab. `end_session` wartet jetzt zwei Sekunden, wenn kein Sprachvorgang vorausging.
- [ ] **22.** „Nicht verstanden": Fragezeichen in Gelb, und es steht **3 Sekunden** — kein Aufblitzen mehr. *(Repariert: `end_session` räumte die Fehleranzeige weg, bevor `clear_error` sie zeigen konnte.)* Eine Sprachausgabe dazu kommt aus Home Assistant, nicht vom Gerät: bei `intent-not-recognized` sagt die Pipeline „Entschuldigung, das habe ich nicht verstanden", bei reiner Stille (`stt-no-text-recognized`) sagt sie nichts.
  *So testen:* Wake Word sagen und dann **schweigen** (→ `stt-no-text-recognized`), oder Unsinn sagen, den kein Intent trifft (→ `intent-not-recognized`).
- [ ] **21a.** Rückfrage vom **Konversationsagenten** (kein `ask_question`): einen Auftrag geben, der eine Rückfrage auslöst — z. B. „Stelle einen Timer" ohne Dauer. Erwartet: Antwort hörbar, danach **von selbst** wieder Zuhören mit dem blauen Fragezeichen, ohne erneutes Wake Word.
  *Wann HA das anfordert:* wenn die Antwort mit einem Fragezeichen endet — dann setzt HA `continue_conversation` im `INTENT_END`-Ereignis. Mit dem eingebauten Intent-Agenten kommt das kaum vor, mit einem LLM regelmäßig.
- [ ] **21b.** Nach der beantworteten Rückfrage reagiert das Wake Word wieder.
- [ ] **23.** HA nicht erreichbar während eines Vorgangs: `wifi_off`-Icon in Grau.
- [ ] **24.** Sonstiger Fehler: rotes Warndreieck.
- [ ] **25.** Nach jeder Fehleranzeige kehrt das Gerät von selbst in den Ruhezustand zurück und hört wieder auf das Wake Word.
- [ ] **26.** Befehl ohne Sprachausgabe (TTS aus / leere Antwort): das Gerät hängt nicht, sondern fällt in den Ruhezustand.

## D. Ergebnisanzeige (Messwert / Bestätigung)

Test jeweils per Sprachbefehl; die Klassifikation greift nur bei kurzen
Antworten (≤ 80 Zeichen).

- [ ] **27.** „Wie warm ist es im Wohnzimmer?" → Zahl + Einheit groß in der Mitte, darüber das Thermometer-Icon.
- [ ] **28.** Prozentwert (z. B. Batterie- oder Helligkeitsstand) → Zahl mit `%`, **kein** Icon darüber. *(Geändert: das Prozent-Icon sagte dasselbe zweimal.)*
- [ ] **29.** *(entfallen)* Uhrzeit als Messwert. HA antwortet „Es ist 22:26" ohne Einheit — die Erkennung hätte nie gegriffen, die Einheit „Uhr" ist entfernt.
- [ ] **30.** Leistungs-/Energiewert (W, kW, kWh, V, A) → Blitz-Icon.
- [ ] **31.** Längenwert (m, km, cm, mm) → Lineal-Icon.
- [ ] **32.** Unbekannte Einheit → Thermometer-Icon als Rückfall (kein leeres Feld).
- [ ] **33.** Zahl **im Gerätenamen** stört nicht (z. B. „Sensor 2 zeigt 21 Grad" → 21 Grad wird angezeigt).
- [ ] **34.** Schaltbefehl („Schalte das Licht ein") → grüner Haken statt Balken, **3 s** statt 5 s.
- [ ] **34a.** Direkt danach reagiert das Wake Word wieder. *(Repariert: `start_wake_word` kam dem Bestätigungston zu dicht hinterher, der Lautsprecher hielt den I2S-Bus noch — danach blieb das Gerät taub, bis etwas anderes es weckte.)*
- [ ] **34b.** Rollo auf einen Prozentwert stellen („Fahre das Rollo auf 50 Prozent") → **Haken**, nicht die Zahl. *(Neu: die Bestätigung wird vor dem Messwert geprüft.)*
- [ ] **34c.** Gegenprobe, dass echte Messwerte davon nicht erwischt werden: „Wie warm ist es im Bad?" → weiterhin Zahl mit Einheit. Bekannter Grenzfall: „Die Heizung ist auf 21 Grad eingestellt" zeigt jetzt den Haken.
- [ ] **35.** Ergebnis bzw. Haken bleiben nach dem Ton noch **3 s** stehen und verschwinden dann.
- [ ] **36.** Langer Fließtext (z. B. LLM-Agent als Konversationsagent) → weiterhin die fünf Balken, keine Fehlanzeige. *(Erwartetes Verhalten, kein Fehler.)*
- [ ] **37.** Lange Einheit oder langer Wert stößt nicht über den runden Displayrand.

## E. Bedienung am Gerät

- [ ] **38.** Tippen im Ruhezustand weckt das Display und zeigt die gewählte Standby-Seite.
- [ ] **39.** Tippen **während des Zuhörens** bricht den Vorgang ab.
- [ ] **40.** Tippen **während der Verarbeitung** bricht ab.
- [ ] **41.** Tippen **während der Sprachausgabe** stoppt die Ausgabe sofort.
- [ ] **42.** Nach jedem Abbruch hört das Gerät wieder auf das Wake Word. *(Eine kurze Verzögerung ist bauartbedingt: Mikrofon und Lautsprecher teilen sich einen I2S-Bus, das Wake Word startet erst, wenn der Lautsprecher ihn freigegeben hat — 500 ms.)*
- [ ] **43.** Gedrückthalten (3 s) an beliebiger Stelle öffnet die Konfigurationsseite mit Gerätename und IP-Adresse.
- [ ] **44.** Die angezeigte IP stimmt mit der aus HA/dem Log überein.
- [ ] **45.** Die Konfigurationsseite verschwindet nicht, solange man hinschaut (kein Standby währenddessen), und geht danach ordentlich in den Standby.

## F. Standby und Helligkeit

- [ ] **46.** Nach 30 s ohne Berührung schaltet das Display **komplett aus** (schwarz, nicht nur gedimmt).
- [ ] **47.** Ein Sprachvorgang weckt das Display ohne Berührung.
- [ ] **48.** Nach dem Sprachvorgang fällt das Display wieder in den Standby.
- [ ] **49.** Entity „Display" (Licht) in HA ausschalten → Display aus.
- [ ] **50.** Entity „Display" in HA einschalten → Display an, und nach 30 s von selbst wieder aus (kein dauerhaft heller, leerer Bildschirm).
- [ ] **51.** Alles außer dem Zuhören läuft auf 80 % Helligkeit, das Zuhören auf 100 %.

## G. Standby-Seiten

- [ ] **52.** Select „Standby-Seite" = **Uhr**: Uhrzeit groß, darunter das Datum.
- [ ] **53.** Die Uhr springt zur vollen Minute weiter (nicht erst nach einer Berührung).
- [ ] **54.** Select = **Zifferblatt**: 60 Striche im Kranz, zwölf Ziffern, keine Zeiger.
- [ ] **55.** Aktuelle **Stunde** ist als Ziffer farbig hervorgehoben (orange, volle Deckkraft).
- [ ] **56.** Aktuelle **Minute** ist als Strich hervorgehoben — länger und dicker als die übrigen.
- [ ] **57.** Zifferblatt aktualisiert sich minütlich.
- [ ] **58.** Select = **Gesicht**: zwei leuchtende Augen und ein Mund erscheinen im Standby.
- [ ] **59.** Umschalten des Selects wirkt **sofort**, wenn gerade eine Standby-Seite zu sehen ist.
- [ ] **60.** Umschalten mitten in einem Sprachvorgang schiebt **nichts** ins Bild (Wirkung erst danach).
- [ ] **61.** Die Auswahl überlebt einen Neustart (`restore_value`).

## H. Gesicht (nur bei Standby-Seite = „Gesicht")

- [ ] **62.** Warten: Augen offen, Mund schmal; gelegentliches **Blinzeln** (schnell, ein Schnappen).
- [ ] **63.** Gelegentliche Marotte: Blick wandert, Zunge erscheint kurz unter dem Mund.
- [ ] **64.** Zuhören: das Gesicht bleibt vorne (kein Mikrofon-Icon), Miene ändert sich.
- [ ] **65.** Denken: Augen wandern zur Seite, Fragezeichen erscheint auf der **Gegenseite** des Blicks.
- [ ] **66.** Reden: Mund bewegt sich unruhig, aber weich (kein Flackern).
- [ ] **67.** Phasenwechsel ist ein **fließender** Übergang, kein Sprung.
- [ ] **68.** Kein sichtbares Ruckeln. Falls doch: `face_glow` in `assist-satellit.yaml` senken bzw. auf 0.
- [ ] **69.** Messwert, Haken, Fehler, Stumm und Hinweis erscheinen **nicht** im Gesicht, sondern weiterhin auf der normalen Seite.

## I. Timer

- [ ] **70.** „Stelle einen Timer auf 2 Minuten" → orangener Ring am Displayrand erscheint.
- [ ] **71.** Der Countdown steht groß in der Mitte, Doppelpunkt sitzt fest — die Ziffern **wandern nicht** von Sekunde zu Sekunde.
- [ ] **72.** Timer über einer Stunde („1:23:45") passt vollständig ins runde Display. **Über zehn Stunden ist der dokumentierte Grenzfall** — der Countdown steht dann sichtbar aus der Mitte gerückt. Der zweite Versatz dagegen hat es schlimmer gemacht und ist zurückgebaut; der Vermerk steht im README.
- [ ] **73.** Der Ring leert sich im Sekundentakt und ist auf **jeder** Seite sichtbar, auch im Standby.
- [ ] **74.** Der Name des Timers steht dort, wo sonst das Datum steht.
- [ ] **75.** Bei laufendem Timer zeigt der Standby immer die Uhrseite — auch wenn Zifferblatt oder Gesicht gewählt sind.
- [ ] **76.** Timer per Sprache abbrechen → der Ring **blendet aus**, statt zu verschwinden.
- [ ] **77.** Zweiter Timer parallel: gezeigt wird der **nächstfällige**, also der kürzere. *(So gewollt — `on_timer_tick` sucht ihn jede Sekunde neu.)*
- [ ] **78.** Timer läuft ab → Klingelton ist hörbar und **wiederholt sich** (~alle 3,2 s).
- [ ] **79.** Während des Klingelns: orangene Glocke in der Mitte, pulsierend.
- [ ] **80.** Tippen beendet das Klingeln. Ein **laufender** Timer lässt sich am Gerät bewusst nicht abbrechen: ESPHome kennt dafür keine Aktion (nur `voice_assistant.start`/`stop`), der Timer lebt in Home Assistant. Lokales Ausblenden würde ihn nicht anhalten — er klingelte trotzdem. Abbrechen geht per Sprache („Timer abbrechen").
- [ ] **81.** Nach dem Klingeln (oder nach dem Tippen) ist das Wake Word wieder scharf.
- [ ] **82.** Ohne Eingriff hört das Klingeln nach 2 Minuten von selbst auf.
- [ ] **83.** Ein Timer weckt einen ausgeschalteten Bildschirm **nicht** — nur der Ring bzw. der Ton meldet sich, wenn der Schirm ohnehin an ist.
- [ ] **84.** Die Uhr überschreibt den laufenden Countdown nicht zur vollen Minute.

## J. Mikrofon stumm

- [ ] **85.** Entity „Mikrofon stumm" einschalten → durchgestrichenes Mikrofon in Grau.
- [ ] **86.** Im stummen Zustand reagiert das Gerät **nicht** auf das Wake Word.
- [ ] **87.** Ausschalten → das Wake Word ist wieder scharf.
- [ ] **88.** Der Zustand überlebt einen Neustart nicht bzw. startet wie erwartet auf „aus".

## K. Wake-Word-Engine umschalten

- [ ] **89.** Select „Wake-Word-Engine" = **Auf dem Gerät**: lokale Erkennung funktioniert.
- [ ] **90.** Umschalten auf **In Home Assistant**: openWakeWord in HA übernimmt, Erkennung funktioniert weiter.
- [ ] **91.** Beim Umschalten mitten im Betrieb bleibt nichts hängen (nach spätestens ~30 s ist die neue Engine aktiv).
- [ ] **92.** Zurückschalten funktioniert ebenso.
- [ ] **93.** Die Auswahl überlebt einen Neustart.

## L. Ausrichtung

- [ ] **94.** Select „Ausrichtung" = 90° → Bild dreht sich.
- [ ] **95.** 180° und 270° ebenso.
- [ ] **96.** Der Touch stimmt nach dem Drehen noch mit dem Bild überein.
- [ ] **97.** Die Ausrichtung wird nach einem Neustart wiederhergestellt (und nicht erst nach dem ersten Tippen).

## M. Optionaler Hinweis aus Home Assistant

Aufruf per Aktion `esphome.assist_satellit_zeige_hinweis` mit `icon`,
`nachricht`, `sekunden`. **`mdi:...` funktioniert nicht** — Material Design
Icons gibt es auf dem Gerät nicht. `icon` ist einer von sieben Namen:
`mikrofon`, `stumm`, `warnung`, `offline`, `frage`, `haken`, `glocke`.

- [ ] **98.** Aufruf mit `icon: glocke` zeigt Glocke und Text.
- [ ] **99.** Der Hinweis verschwindet nach der angegebenen Zeit (ohne Angabe: 10 s).
- [ ] **100.** Ein Sprachvorgang während eines Hinweises gewinnt — der Hinweis wird verdrängt.
- [ ] **101.** Unbekannter Iconname (`mdi:bell`, Tippfehler) zeigt **nur den Text** — kein leeres Kästchen mehr. *(Geändert.)*
- [ ] **101a.** Roher Codepoint (`icon: "\U0000E7F7"`) funktioniert weiterhin.

## N. Audio-Hardware

- [ ] **102.** Ton ist bei normaler Lautstärke unverzerrt. Falls nicht: Lautsprecher in `packages/hardware.yaml` von 48000 auf 16000 setzen.
- [ ] **103.** Entity „Lautsprecherverstärker" schaltet den Verstärker.
- [ ] **104.** Kein wiederholtes `Parent bus is busy` im Log. Das Log kommt **nicht** aus Home Assistant, sondern vom Mac aus dem Projektverzeichnis: `esphome logs assist-satellit.yaml --device assist-satellit.local` (läuft bis Strg-C). Per USB stattdessen `--device /dev/cu.usbmodem101`.
- [ ] **105.** Announcement aus HA (`tts.speak` oder `assist_satellite.announce`) ist **hörbar**, während das Gerät im Leerlauf steht. *(Derselbe Fehler wie Punkt 21 — vorher blieb es stumm.)*
- [ ] **106.** Nach einem Announcement hört das Gerät wieder auf das Wake Word.

## O. Dauerlauf

- [ ] **106a.** Im Log steht **keine** Zeile `Wake Word stand still im Leerlauf`. Wenn doch: notieren, was davor passiert ist — dann hat der Wachhund einen weiteren Bus-Fehler aufgefangen, und die Einzelstelle fehlt noch.
- [ ] **107.** Nach mehreren Stunden: freier Heap/PSRAM stabil, kein Neustart im Log.
- [ ] **108.** Nach einem WLAN-Abriss verbindet sich das Gerät von selbst wieder.
- [ ] **109.** Nach einem HA-Neustart findet das Gerät von selbst zurück und ist wieder ansprechbar.
