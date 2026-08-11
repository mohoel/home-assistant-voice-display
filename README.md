# Assist Satellit

Home Assistant Voice Satellite auf einem **Waveshare ESP32-S3-Touch-AMOLED-1.75**
(rundes 1,75"-AMOLED, 466×466) mit angeschlossenem Lautsprecher.

Funktionsumfang orientiert sich am offiziellen Nabu-Casa-Projekt
(Home Assistant Voice PE / ESP32-S3-Box-3), nutzt aber das runde Display als
Statusanzeige statt eines LED-Rings.

## Features

- Wake Word lokal auf dem Gerät (`micro_wake_word`) **oder** in Home Assistant —
  umschaltbar über eine Select-Entity, ohne Neustart
- Gesprochener Text und Antwort erscheinen als Text-Sensoren in Home Assistant
  (auf dem Display selbst steht nur die Statusanimation)
- Jede Phase trägt sich über ein einziges Element in der Bildschirmmitte,
  farbcodiert: beim Zuhören atmet ein blaues Mikrofon-Icon, beim Verarbeiten
  laufen drei amberfarbene Punkte als Welle, bei der Sprachausgabe schlägt ein
  grüner Äqualizer aus fünf Balken; Fehler, Stumm und „nicht bereit" zeigen ein
  Icon
- **Timer** mit Ring am Bildschirmrand, der sich leert und auf jeder Seite
  sichtbar bleibt — auch im Standby, wo der Countdown an die Stelle der Uhr
  tritt. Am Ende klingelt es und eine Glocke erscheint; Antippen beendet beides.
  Sauber dargestellt wird der Countdown **bis zehn Stunden** — darüber steht er
  sichtbar aus der Mitte gerückt, weil die Ziffern links über den runden Rand
  hinauswachsen. Abbrechen geht per Sprache („Timer abbrechen"), nicht am
  Gerät: ESPHome hat dafür keine Aktion, der Timer selbst lebt in Home
  Assistant
- **Messwerte** („Wie warm ist es im Bad?") erscheinen als große Zahl mit
  Einheit daneben und einem passenden Symbol darüber — Thermometer, Blitz,
  Lineal —, kurze Bestätigungen („Eingeschaltet") als Haken. Enthält die
  Antwort ein Bestätigungswort, gewinnt der Haken: „Rollo auf 50 Prozent
  gestellt" ist die Rückmeldung zu einem Befehl und kein Messwert.
  Das setzt die eingebaute Intent-Erkennung von Home Assistant voraus — wer ein
  Sprachmodell als Konversationsagenten nutzt, bekommt ausformulierte Antworten
  und damit weiterhin die Balken
- **Akustische Bestätigung in jedem Fall**: normalerweise die gesprochene
  Antwort, und wenn Home Assistant stumm ausführt, ein kurzer Ton vom Gerät
- Fehler sind unterscheidbar: „nicht verstanden" (Fragezeichen), „Home
  Assistant nicht erreichbar" (durchgestrichenes WLAN) und echte Fehler
  (Warndreieck) sehen verschieden aus
- Stellt Home Assistant eine **Rückfrage** („Welches Licht?"), zeigt das Gerät
  ein Fragezeichen statt des Mikrofons — man sieht, dass es auf eine Antwort
  wartet und nicht auf ein neues Wake Word
- **Keine Automation in Home Assistant nötig.** Alles oben läuft allein aus der
  Firmware; HA braucht nur die ESPHome-Integration
- **Standby heißt aus:** 30 Sekunden ohne Berührung, dann schaltet sich der
  Bildschirm komplett ab — leere schwarze Seite und Helligkeit 0. Eine
  gedimmte Zwischenstufe gibt es nicht
- **Volle Helligkeit nur beim Zuhören:** ein sichtbarer Bildschirm läuft
  normalerweise auf 80 %, das Wake Word hebt auf 100 % — der Sprung ist selbst
  das Zeichen, dass das Gerät jetzt zuhört
- Antippen weckt das Display und zeigt wahlweise eine **Uhr** mit Datum
  („Dienstag, 4. August"), ein **Zifferblatt** ohne Zeiger, auf dem die
  aktuelle Stunde als farbig hervorgehobene Ziffer und die Minute als längerer,
  ebenso hervorgehobener Strich im Kranz stehen, oder ein **Gesicht**, das
  wartend umherblickt, blinzelt und gelegentlich die Zunge herausstreckt;
  umschaltbar über eine Select-Entity in Home Assistant.
  Nach 30 Sekunden geht der Bildschirm wieder aus
- **Das Gesicht ist mehr als eine Standby-Seite.** Ist es gewählt, übernimmt es
  auch Zuhören, Verarbeiten und Antworten: die Augen richten sich auf, blicken
  beim Nachdenken schräg nach oben — das Fragezeichen steht dabei auf der
  Gegenseite, dort, wo die Augen gerade *nicht* hinsehen — und beim Sprechen
  bewegt sich der Mund. Die Bewegung läuft dabei durch — bei jedem
  Phasenwechsel biegen die Augen ab, statt zu springen. Bei Uhr und
  Zifferblatt bleibt es unverändert bei Mikrofon, Punkten und Balken
- Antippen bricht außerdem einen laufenden Sprachvorgang ab (Zuhören,
  Verarbeitung oder Sprachausgabe)
- **Läuft ein Timer, sticht der Countdown die gewählte Standby-Seite aus.**
  Zifferblatt und Gesicht treten so lange zurück, weil nur die Standby-Uhr die
  Restzeit in Ziffern zeigen kann. Während eines Sprachvorgangs bleibt es beim
  Gesicht — der Countdown kommt, sobald die Sprachausgabe durch ist
- Drei Sekunden gedrückt halten zeigt Gerätename und IP-Adresse
- Bedient wird über Home Assistant: Ausrichtung, Standby-Seite,
  Stummschaltung, Wake-Word-Optionen und Displayhelligkeit sind Entities

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

Im Projektordner eine Datei `secrets.yaml` mit diesen fünf Einträgen anlegen:

```yaml
wifi_ssid: "MeinWLAN"
wifi_password: "..."
ap_password: "..."            # Fallback-Hotspot, falls das WLAN fehlt
api_encryption_key: "..."     # 32 Byte base64, für Home Assistant
ota_password: "..."
```

Schlüssel und Passwörter erzeugen:

```bash
openssl rand -base64 32
```

Die Datei steht in `.gitignore` und wird nie committet. Es gibt bewusst keine
Beispieldatei im Repo.

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

**Alternative: ESPHome Desktop.** Seit August 2026 gibt es unter
[desktop.esphome.io](https://desktop.esphome.io) ein natives macOS-DMG, das Python
und ESPHome mitbringt (kein `brew install esphome` nötig) und im Browser das
ESPHome-Device-Builder-Dashboard startet. Für den USB-Erstflash übernimmt die
Dashboard-UI die Port-Erkennung und führt visuell durch den BOOT/RESET-Download-
Modus — praktisch für den fummeligsten Teil des Ersteinrichtens. Im Dashboard als
Konfigurationsverzeichnis den Projektordner (`/Users/moritzholzer/Claude/Assist`)
wählen, nicht das Default-`~/esphome/`.

⚠️ Das Dashboard committet bei jeder YAML-Änderung automatisch ins lokale
Git-Repo. Für den einmaligen Erstflash unkritisch, für den laufenden
Update-Workflow mit getaggten Versionen (siehe unten) sollte weiterhin die CLI
(`esphome run … --device assist-satellit.local`) genutzt werden, damit Commits
bewusst gesetzt werden.

**Alternative: Browser-Flash ohne Terminal.** Nach einmal `esphome compile
assist-satellit.yaml` liegt die fertige Firmware unter `.esphome/build/`. Die
Seite [`web-flash/index.html`](web-flash/index.html) flasht sie per
[ESP Web Tools](https://esphome.github.io/esp-web-tools/) über Web Serial in
Chrome/Edge — kein `esphome run` nötig, nur einmalig ein lokaler Webserver
(`python3 -m http.server 8000` im Projektordner, dann
`http://localhost:8000/web-flash/` öffnen). Bei jeder neuen Kompilierung reicht
Neuladen der Seite, da sie direkt auf die Build-Ausgabe zeigt.

### 4. In Home Assistant einbinden

Das Gerät meldet sich per mDNS. Unter *Einstellungen → Geräte & Dienste* taucht
`assist-satellit` als ESPHome-Gerät auf. Beim Hinzufügen den
`api_encryption_key` aus `secrets.yaml` eintragen.

Danach unter *Einstellungen → Sprachassistenten* eine Assist-Pipeline mit
deutschem STT/TTS zuweisen.

## Bedienung

Bedient wird ausschließlich über **Home Assistant**. Auf dem Touchscreen gibt
es bewusst keine Bedienelemente: Tippen weckt bzw. bricht ab, Gedrückthalten
zeigt die Adresse — mehr nicht.

Eine eigene Bedienseite unter der Geräte-IP gab es einmal; sie ist ersatzlos
entfallen, zusammen mit dem Webserver. Der Grund: Farben sind
Compile-Zeit-Werte und damit ohnehin nicht zur Laufzeit einstellbar — übrig
blieben zwei Auswahlfelder, die als HA-Entities schon existieren. Das Gerät
beantwortet jetzt keine HTTP-Anfragen mehr (außer dem Fallback-Hotspot, wenn
das WLAN fehlt).

| Entity | Wirkung |
|---|---|
| **Ausrichtung** | Dreht das Bild in 90-Grad-Schritten (0/90/180/270). Die Touch-Koordinaten dreht LVGL mit. 45 Grad gibt die Grafikbibliothek nicht her. |
| **Standby-Seite** | Welche Seite im Standby erscheint: **Uhr** (große Uhrzeit mit Datum), **Zifferblatt** (Strichkranz mit Ziffern, ohne Zeiger) oder **Gesicht** (zwei Augen und ein Mund). Die Umschaltung wirkt sofort, wenn das Gerät gerade im Standby steht. Das **Gesicht** ersetzt zusätzlich die Phasenanimationen — siehe oben. Läuft ein Timer, zeigt der Standby unabhängig davon den Countdown. |
| **Display** | Helligkeit; Einschalten aus HA weckt den Bildschirm für die Standby-Zeit. |
| **Mikrofon stumm**, **Wake-Word-Engine**, **Wake-Word-Empfindlichkeit** | Sprachbetrieb. |
| **Erkannter Text**, **Antwort** | Frage und Antwort des letzten Vorgangs. |

Alle Einstellungen überstehen einen Neustart. Die Symbolfarben sind fest in
`assist-satellit.yaml` hinterlegt — eine Änderung braucht einen Neubau der
Firmware.

Wer die Adresse für `esphome run` oder `esphome logs` nicht zur Hand hat:
**drei Sekunden auf das Display drücken**. Ein Tippen führt zurück, und nach
der Standby-Zeit verschwindet die Seite von selbst.

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
| `packages/ui.yaml` | Fonts, LVGL-Seiten, Phasen-Animationen, Standby-Uhr, Zifferblatt, Gesicht, Timer-Ring |
| `packages/settings.yaml` | Ausrichtung und Standby-Seite als HA-Entities |
| `sounds/` | Klingel- und Bestätigungston, direkt in die Firmware eingebettet (Herkunft und Lizenz stehen dort) |

Farben, Phasen-IDs und Standby-Zeiten stehen als Substitutions in
`assist-satellit.yaml` — dort anpassen, nicht in den Packages. Wie lange der
Bildschirm nach der letzten Berührung anbleibt, ist `standby_timeout` (30 s);
danach ist er aus. Farben sind reine Compile-Zeit-Werte, eine Änderung braucht
also einen Neubau der Firmware.

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
- **Symbole je nach geschaltetem Gerät** — also eine Glühbirne beim Licht, ein
  Rollo beim Cover. Das geht nicht: Der Voice Assistant bekommt von Home
  Assistant weder Domain noch Entität noch Ergebniswert zurück, der
  entsprechende Trigger hat schlicht keine Parameter. Was das Gerät sieht, ist
  allein der Antwortsatz — und „Eingeschaltet" verrät nicht, was eingeschaltet
  wurde. Deshalb erkennt die Firmware nur *Messwert*, *Bestätigung* und *alles
  Übrige*. Wer mehr will, kann die optionale API-Aktion `zeige_hinweis` aus
  einer eigenen HA-Automation aufrufen (dokumentiert in `packages/core.yaml`);
  für den Normalbetrieb wird sie nicht gebraucht.
- **Deutsches Wake Word.** Bräuchte ein eigenes microWakeWord-Modell.
- **Bedienelemente am Touchscreen.** Bewusst entfernt: Der Touchscreen kennt
  nur Tippen (wecken, Sprachvorgang abbrechen) und Gedrückthalten
  (Adresse anzeigen). Alles Einstellbare liegt in Home Assistant, Lautstärke
  und Stummschaltung inbegriffen.
- **Weitere Standby-Seiten.** Zur Auswahl stehen Uhr, Zifferblatt und
  Gesicht; Seiten mit Sensorwerten aus Home Assistant fehlen noch.
- **Das Gesicht deckt nur die vier Grundzustände ab.** Warten, Zuhören, Denken
  und Reden hat es; Messwerte, Bestätigungen, Fehler, Stummschaltung und der
  klingelnde Timer greifen auch im Gesichtsmodus auf die gewohnte Anzeige mit
  Zahl bzw. Icon zurück — dafür kennt der Entwurf keine Miene, und ein
  Messwert ist als Zahl schlicht nützlicher.
- **Nach dem Antworten verschwindet das Gesicht sofort.** Es geht dann wie
  jede andere Seite in den Standby, der Bildschirm wird also schwarz statt in
  ein wartendes Gesicht zurückzufallen. Das ist dasselbe Verhalten wie bei Uhr
  und Zifferblatt; ein Nachlauf müsste `standby_timeout` für alle drei ändern.
- **Kein Countdown auf Zifferblatt und Gesicht.** Beide können die Restzeit
  nicht in Ziffern zeigen — die Ziffern stünden mitten im Kranz bzw. im
  Gesicht. Statt nur den Ring am Rand zu zeigen, tritt bei einem laufenden
  Timer deshalb die Standby-Uhr an ihre Stelle.
- **Der ausgeschaltete Bildschirm zeigt auch einen laufenden Timer nicht.**
  Nach `standby_timeout` geht alles aus, Ring inbegriffen; ein Tippen holt die
  Anzeige für weitere 30 Sekunden zurück. Klingelt der Timer, weckt das Gerät
  den Bildschirm von selbst.
