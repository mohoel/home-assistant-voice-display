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
- [ ] **16.** Nach dem Ende der Antwort spielt der Bestätigungston (kurzer Ton, nach der Sprachausgabe).
- [ ] **17.** Direkt danach ist das Wake Word wieder scharf (zweiter Befehl funktioniert ohne Wartezeit).
- [ ] **18.** In HA: Sensor „Erkannter Text" zeigt die letzte Frage.
- [ ] **19.** In HA: Sensor „Antwort" zeigt die letzte Antwort.
- [ ] **20.** Im Log steht je Antwort eine Zeile `ergebnis: Antwort='…' -> art=… wert='…' einheit='…'`.

## C. Rückfragen, Fehler, Sonderfälle

- [ ] **21.** Rückfrage von HA (Assistent fragt zurück): beim erneuten Zuhören zeigt das Display ein **Fragezeichen** statt des Mikrofons, ebenfalls blau und atmend.
- [ ] **22.** Unverständlicher Satz: Fragezeichen in Gelb („nicht verstanden").
- [ ] **23.** HA nicht erreichbar während eines Vorgangs: `wifi_off`-Icon in Grau.
- [ ] **24.** Sonstiger Fehler: rotes Warndreieck.
- [ ] **25.** Nach jeder Fehleranzeige kehrt das Gerät von selbst in den Ruhezustand zurück und hört wieder auf das Wake Word.
- [ ] **26.** Befehl ohne Sprachausgabe (TTS aus / leere Antwort): das Gerät hängt nicht, sondern fällt in den Ruhezustand.

## D. Ergebnisanzeige (Messwert / Bestätigung)

Test jeweils per Sprachbefehl; die Klassifikation greift nur bei kurzen
Antworten (≤ 80 Zeichen).

- [ ] **27.** „Wie warm ist es im Wohnzimmer?" → Zahl + Einheit groß in der Mitte, darüber das Thermometer-Icon.
- [ ] **28.** Prozentwert (z. B. Batterie- oder Helligkeitsstand) → Prozent-Icon.
- [ ] **29.** Uhrzeit („Wie spät ist es?") → Uhr-Icon, Wert wie „17:45 Uhr" ohne Zeilenumbruch.
- [ ] **30.** Leistungs-/Energiewert (W, kW, kWh, V, A) → Blitz-Icon.
- [ ] **31.** Längenwert (m, km, cm, mm) → Lineal-Icon.
- [ ] **32.** Unbekannte Einheit → Thermometer-Icon als Rückfall (kein leeres Feld).
- [ ] **33.** Zahl **im Gerätenamen** stört nicht (z. B. „Sensor 2 zeigt 21 Grad" → 21 Grad wird angezeigt).
- [ ] **34.** Schaltbefehl („Schalte das Licht ein") → grüner Haken statt Balken.
- [ ] **35.** Ergebnis bzw. Haken bleiben nach dem Ton noch ~5 s stehen und verschwinden dann.
- [ ] **36.** Langer Fließtext (z. B. LLM-Agent als Konversationsagent) → weiterhin die fünf Balken, keine Fehlanzeige. *(Erwartetes Verhalten, kein Fehler.)*
- [ ] **37.** Lange Einheit oder langer Wert stößt nicht über den runden Displayrand.

## E. Bedienung am Gerät

- [ ] **38.** Tippen im Ruhezustand weckt das Display und zeigt die gewählte Standby-Seite.
- [ ] **39.** Tippen **während des Zuhörens** bricht den Vorgang ab.
- [ ] **40.** Tippen **während der Verarbeitung** bricht ab.
- [ ] **41.** Tippen **während der Sprachausgabe** stoppt die Ausgabe sofort.
- [ ] **42.** Nach jedem Abbruch hört das Gerät wieder auf das Wake Word (wichtigster Nebeneffekt — bitte gegenprüfen).
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
- [ ] **72.** Timer über einer Stunde („1:23:45") passt vollständig ins runde Display.
- [ ] **73.** Der Ring leert sich im Sekundentakt und ist auf **jeder** Seite sichtbar, auch im Standby.
- [ ] **74.** Der Name des Timers steht dort, wo sonst das Datum steht.
- [ ] **75.** Bei laufendem Timer zeigt der Standby immer die Uhrseite — auch wenn Zifferblatt oder Gesicht gewählt sind.
- [ ] **76.** Timer per Sprache abbrechen → der Ring **blendet aus**, statt zu verschwinden.
- [ ] **77.** Zweiter Timer parallel: Ring und Countdown zeigen einen sinnvollen Wert (kurzes Blinken beim Wechsel ist bekannt).
- [ ] **78.** Timer läuft ab → Klingelton ist hörbar und **wiederholt sich** (~alle 3,2 s).
- [ ] **79.** Während des Klingelns: orangene Glocke in der Mitte, pulsierend.
- [ ] **80.** Tippen beendet das Klingeln.
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
`nachricht`, `sekunden`.

- [ ] **98.** Aufruf zeigt Icon und Text auf dem Display.
- [ ] **99.** Der Hinweis verschwindet nach der angegebenen Zeit (ohne Angabe: 10 s).
- [ ] **100.** Ein Sprachvorgang während eines Hinweises gewinnt — der Hinweis wird verdrängt.
- [ ] **101.** Ein Icon, dessen Glyph nicht eingebettet ist, bleibt leer. *(Bekannte Grenze, kein Fehler.)*

## N. Audio-Hardware

- [ ] **102.** Ton ist bei normaler Lautstärke unverzerrt. Falls nicht: Lautsprecher in `packages/hardware.yaml` von 48000 auf 16000 setzen.
- [ ] **103.** Entity „Lautsprecherverstärker" schaltet den Verstärker.
- [ ] **104.** Kein wiederholtes `Parent bus is busy` im Log (Hinweis auf einen Ton zur falschen Zeit).
- [ ] **105.** Announcement aus HA an den Media Player wird abgespielt.
- [ ] **106.** Nach einem Announcement hört das Gerät wieder auf das Wake Word.

## O. Dauerlauf

- [ ] **107.** Nach mehreren Stunden: freier Heap/PSRAM stabil, kein Neustart im Log.
- [ ] **108.** Nach einem WLAN-Abriss verbindet sich das Gerät von selbst wieder.
- [ ] **109.** Nach einem HA-Neustart findet das Gerät von selbst zurück und ist wieder ansprechbar.
