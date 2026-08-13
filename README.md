# Lumi 🎙️

**Ein Home Assistant Voice Satellite mit Gesicht.**

Lumi ist eine ESPHome-Firmware für den **Waveshare ESP32-S3-Touch-AMOLED-1.75**
— ein rundes, 1,75″ großes AMOLED-Display (466×466) mit kapazitivem
Touchscreen und angeschlossenem Lautsprecher. Statt einem blinkenden LED-Ring
bekommt Home Assistant hier einen kleinen Bildschirm, der zeigt, was gerade
passiert: zuhören, nachdenken, antworten — und wenn man mag, sogar ein
Gesicht, das einen dabei ansieht.

## Lernt Lumi kennen

Stellt euch einen Sprachassistenten vor, der nicht nur zuhört, sondern euch
das auch *zeigt*. Lumi wacht beim Wake Word auf, ein blaues Mikrofon-Icon
atmet sichtbar mit. Beim Nachdenken laufen drei Punkte als Welle über den
Screen. Antwortet Home Assistant, schlägt ein grüner Äqualizer aus, im Takt
der gesprochenen Antwort. Fragt Lumi zurück ("Welches Licht meinst du?"),
sieht man sofort ein Fragezeichen statt des Mikrofons — kein Rätselraten, ob
das Gerät gerade zuhört oder wartet.

Wer mag, gibt Lumi ein Gesicht: zwei Augen und ein Mund, die im Leerlauf
umherblicken, blinzeln, gelegentlich die Zunge herausstrecken oder skeptisch
schauen — und die beim Zuhören, Denken und Antworten dieselbe Mimik tragen
wie die Statusanimationen. Wer es lieber schlicht mag, bekommt eine große
Standby-Uhr oder ein zeigerloses Zifferblatt. Läuft ein Timer, zählt ein Ring
am Bildschirmrand die Restzeit ab, sichtbar auf jeder Seite — auch mitten in
der Standby-Uhr, die dafür kurzerhand den Countdown übernimmt.

Bedient wird Lumi ausschließlich über Home Assistant — keine eigene
Bedienseite, keine Cloud, keine App. Der Touchscreen selbst kennt nur eine
Geste: antippen weckt das Display oder bricht einen laufenden Sprachvorgang
ab. Zusätzlich meldet er jeden Tipp und Doppeltipp als Event nach Home
Assistant, so wie ein smarter Schalter — für eigene Automationen. Alles
andere — Ausrichtung, Standby-Seite, Wake-Word-Engine, Stummschaltung,
Helligkeit — sind ganz normale Home-Assistant-Entities.

## Konzept

- **Ein Bildschirm für den ganzen Zustand.** Jede Phase (Zuhören,
  Verarbeitung, Sprachausgabe, Fehler, Stumm, …) trägt sich über *ein*
  Element in der Bildschirmmitte, farbcodiert. Kein Text auf dem Display,
  keine Sätze zum Mitlesen — die Animation allein sagt, was gerade Sache ist.
- **Home Assistant ist die einzige Bedienoberfläche.** Es gibt bewusst
  keinen Webserver, kein WLAN-Konfigurationsportal, keine eigene App. Wer
  Lumi einstellen will, tut das über die ESPHome-Integration in Home
  Assistant — dieselbe Stelle, an der auch jedes andere ESPHome-Gerät landet.
- **Wake Word lokal oder in der Cloud/HA-Pipeline — per Schalter.** Eine
  Select-Entity in Home Assistant schaltet zwischen `micro_wake_word` auf dem
  Gerät selbst und der Erkennung in Home Assistant um, ohne Neustart.
- **Das Gerät weiß nie, was ein Befehl bewirkt hat.** Home Assistant schickt
  weder Domain noch Entität noch Ergebniswert zurück — nur den gesprochenen
  Antworttext. Die Ergebnisanzeige (Messwert vs. Bestätigung vs. Fließtext)
  ist deshalb eine Heuristik über diesen Satz, kein echtes Wissen über das
  geschaltete Gerät.
- **Farben und Timings sind Compile-Zeit-Werte.** Es gibt keine
  Laufzeit-Einstellung dafür — wer die Optik ändern will, ändert die
  Substitutions in `assist-satellit.yaml` und baut neu.

## Lokal oder mit einer KI-Pipeline

Lumi ist nur die Hardware-Seite — **wie Home Assistant eine Anfrage
verarbeitet, entscheidet allein die Assist-Pipeline dort**, nicht die
Firmware. Zwei grundverschiedene Wege sind möglich, und beide funktionieren
mit Lumi ohne jede Änderung an der Firmware:

- **Vollständig lokal.** Spracherkennung (z. B. Whisper), Intent-Erkennung
  und Sprachausgabe (z. B. Piper) laufen alle in Home Assistant bzw. auf
  eigener Hardware, ohne Internetverbindung und ohne dass Sprachdaten das
  eigene Netz verlassen.
- **Mit einer KI/LLM-Pipeline.** Statt der eingebauten Intent-Erkennung
  übernimmt ein Sprachmodell als Konversationsagent, zum Beispiel Claude über
  die [Anthropic-Integration](https://www.home-assistant.io/integrations/anthropic/).
  Antworten sind dann freier Fließtext statt knapper Bestätigungen.

Grundlage und Einrichtung dieser Pipelines sind ausführlich in der
offiziellen [Assist-Dokumentation](https://www.home-assistant.io/voice_control/)
von Home Assistant beschrieben — das betrifft die HA-Seite und ist unabhängig
von diesem Projekt.

Für Lumi macht das kaum einen Unterschied: Die Firmware bekommt in beiden
Fällen nur erkannten Text und Antworttext zurück, nie Wissen über die
konkrete Pipeline (siehe oben, *„Das Gerät weiß nie, was ein Befehl bewirkt
hat"*). Ein Effekt bleibt sichtbar: Die Ergebnisanzeige (Messwert oder Haken statt der
fünf Balken) ist eine Heuristik über kurze, formelhafte Antwortsätze wie
„21,5 Grad" oder „Eingeschaltet". Ein LLM-Konversationsagent antwortet meist
in ganzen Sätzen — dann greift die Heuristik seltener und es bleibt beim
Balken-Äqualizer, technisch korrekt, aber ohne die Zusatzanzeige.

## Verhältnis zu den offiziellen ESPHome-Voice-Projekten

Lumi ist **kein Fork** von Nabu Casas offizieller Firmware, sondern eine
eigenständige Neuentwicklung für andere Hardware. Die Logik hinter Wake Word,
Sprachsitzungen, Timern und Phasenwechseln folgt aber bewusst den Mustern aus
zwei offiziellen ESPHome-Beispielprojekten:

- [`esphome/home-assistant-voice-pe`](https://github.com/esphome/home-assistant-voice-pe) — Nabu Casas Home Assistant Voice Preview Edition
- [`esphome/wake-word-voice-assistants`](https://github.com/esphome/wake-word-voice-assistants) — Referenzkonfiguration für den ESP32-S3-Box-3

Warum kein Fork: Die Hardware ist komplett verschieden — beide offiziellen
Projekte steuern einen LED-Ring bzw. ein rechteckiges Display an, Lumi
dagegen ein rundes 466×466-AMOLED über LVGL. Es gibt keine gemeinsame
Codebasis, die sich forken ließe; übernommen ist nur das *Muster*, wie eine
Sprachsitzung, Timer und Fehlerzustände als ESPHome-Skripte modelliert
werden — für dieses Board von Grund auf neu geschrieben.

Das hat eine Konsequenz für Updates: **Neue Features oder Fixes an der
Sprachlogik in den offiziellen Repos kommen nicht automatisch hier an.**
`assist-satellit.yaml` bindet über `packages:` ausschließlich lokale Dateien
aus diesem Repo ein (siehe *Aufbau*), keine externe Paket-Abhängigkeit — wer
Änderungen von dort übernehmen will, muss sie von Hand nachbauen. Bei neuen
Features lohnt sich deshalb immer zuerst ein Blick in die beiden Repos, wie
Nabu Casa bzw. ESPHome das offiziell gelöst haben.

## Features

### Sprachsteuerung
- Wake Word lokal (`micro_wake_word`) **oder** über Home Assistant —
  umschaltbar über eine Select-Entity, ohne Neustart
- Gesprochener Text und Antwort erscheinen als Text-Sensoren in Home
  Assistant (auf dem Display steht nur die Statusanimation)
- **Akustische Bestätigung in jedem Fall**: normalerweise die gesprochene
  Antwort, und wenn Home Assistant stumm ausführt, ein kurzer Ton vom Gerät
- Stellt Home Assistant eine **Rückfrage** ("Welches Licht?"), zeigt das
  Gerät ein Fragezeichen statt des Mikrofons — sichtbar, dass es auf eine
  Antwort wartet und nicht auf ein neues Wake Word
- Fehler sind unterscheidbar: „nicht verstanden" (Fragezeichen), „Home
  Assistant nicht erreichbar" (durchgestrichenes WLAN) und echte Fehler
  (Warndreieck) sehen verschieden aus
- Antippen bricht einen laufenden Sprachvorgang ab (Zuhören, Verarbeitung
  oder Sprachausgabe)
- **Keine Automation in Home Assistant nötig.** Alles oben läuft allein aus
  der Firmware; HA braucht nur die ESPHome-Integration

### Statusanzeige
- Jede Phase trägt sich über ein einziges Element in der Bildschirmmitte,
  farbcodiert: beim Zuhören atmet ein blaues Mikrofon-Icon, beim Verarbeiten
  laufen drei amberfarbene Punkte als Welle, bei der Sprachausgabe schlägt
  ein grüner Äqualizer aus fünf Balken; Fehler, Stumm und „nicht bereit"
  zeigen ein Icon
- **Messwerte** ("Wie warm ist es im Bad?") erscheinen als große Zahl mit
  Einheit daneben und passendem Symbol darüber — Thermometer, Blitz, Lineal
  —, kurze Bestätigungen ("Eingeschaltet") als Haken. Enthält die Antwort ein
  Bestätigungswort, gewinnt der Haken: „Rollo auf 50 Prozent gestellt" ist
  die Rückmeldung zu einem Befehl und kein Messwert. Das setzt die
  eingebaute Intent-Erkennung von Home Assistant voraus — wer ein
  Sprachmodell als Konversationsagenten nutzt, bekommt ausformulierte
  Antworten und damit weiterhin die Balken

### Standby-Seiten
Drei Ansichten stehen zur Wahl, umschaltbar über eine Select-Entity in Home
Assistant — die Umschaltung wirkt sofort, wenn das Gerät gerade im Standby
steht:

- **Uhr** — große Uhrzeit mit Datum ("Dienstag, 4. August")
- **Zifferblatt** — Strichkranz ohne Zeiger, aktuelle Stunde als farbig
  hervorgehobene Ziffer, Minute als längerer, ebenso hervorgehobener Strich
- **Gesicht** — zwei Augen und ein Mund, die wartend umherblicken, blinzeln
  und gelegentlich die Zunge herausstrecken. Zwölf verschiedene Marotten
  wechseln sich zufällig ab, jede genau einmal, bevor sich der Zyklus
  wiederholt

**Das Gesicht ist mehr als eine Standby-Seite.** Ist es gewählt, übernimmt es
auch Zuhören, Verarbeiten und Antworten: die Augen richten sich auf, blicken
beim Nachdenken schräg nach oben — das Fragezeichen steht dabei auf der
Gegenseite, dort, wo die Augen gerade *nicht* hinsehen — und beim Sprechen
bewegt sich der Mund. Die Bewegung läuft dabei durch, bei jedem Phasenwechsel
biegen die Augen ab, statt zu springen. Bei Uhr und Zifferblatt bleibt es
unverändert bei Mikrofon, Punkten und Balken.

### Timer
- Ring am Bildschirmrand, der sich leert und auf jeder Seite sichtbar bleibt
  — auch im Standby, wo der Countdown an die Stelle der Uhr tritt
- Läuft ein Timer, sticht der Countdown die gewählte Standby-Seite aus:
  Zifferblatt und Gesicht treten so lange zurück, weil nur die Standby-Uhr
  die Restzeit in Ziffern zeigen kann. Während eines Sprachvorgangs bleibt es
  beim Gesicht — der Countdown kommt erst, sobald die Sprachausgabe durch ist
- Am Ende klingelt es und eine Glocke erscheint; Antippen beendet beides
- Sauber dargestellt wird der Countdown bis zehn Stunden — darüber steht er
  sichtbar aus der Mitte gerückt, weil die Ziffern links über den runden Rand
  hinauswachsen
- Abbrechen geht per Sprache ("Timer abbrechen"), nicht am Gerät: ESPHome hat
  dafür keine Aktion, der Timer selbst lebt in Home Assistant

### Display-Verhalten
- **Standby heißt aus:** 30 Sekunden ohne Berührung, dann schaltet sich der
  Bildschirm komplett ab — leere schwarze Seite und Helligkeit 0. Eine
  gedimmte Zwischenstufe gibt es nicht
- **Volle Helligkeit nur beim Zuhören:** ein sichtbarer Bildschirm läuft
  normalerweise auf 80 %, das Wake Word hebt auf 100 % — der Sprung ist
  selbst das Zeichen, dass das Gerät jetzt zuhört
- Tipp und Doppeltipp auf den Bildschirm melden sich als Event in Home
  Assistant (wie bei einem smarten Schalter), auswertbar per Automation
- Bedient wird über Home Assistant: Ausrichtung, Standby-Seite,
  Stummschaltung, Wake-Word-Optionen und Displayhelligkeit sind Entities

## Warum nicht das ESPHome-Add-on in Home Assistant?

Voice-Assistant-Konfigurationen sind zu groß, um auf einem Raspberry Pi
zuverlässig zu kompilieren. Deshalb ist der **Mac der Build-Host**: ESPHome
kompiliert lokal und schickt das Update per OTA direkt ans Gerät. Home
Assistant braucht nur die **ESPHome-Integration**, nicht das Builder-Add-on.

## Einrichtung

### 1. Firmware flashen

**Der einfachste Weg ist die Browser-Flash-Seite** — kein `esphome`, kein
Terminal, keine Installation:
[mohoel.github.io/home-assistant-voice-lumi](https://mohoel.github.io/home-assistant-voice-lumi/)
(`docs/index.html`) flasht per [ESP Web Tools](https://esphome.github.io/esp-web-tools/)
über Web Serial in Chrome/Edge — Board per USB anschließen, Button klicken,
fertig. Installiert wird dabei ein **anonymer Standard-Build ohne
persönliche Daten**, kompiliert automatisch bei jedem Git-Tag durch
[`.github/workflows/release.yml`](.github/workflows/release.yml) aus
[`secrets.public.yaml`](secrets.public.yaml) statt aus dem eigenen, nie
committeten `secrets.yaml`. Direkt im Anschluss fragt ESP Web Tools per
[Improv Wi-Fi](https://www.improv-wifi.com/) über dieselbe USB-Verbindung nach
dem eigenen WLAN — kein Hotspot, kein Captive Portal, kein Gerätewechsel
nötig. Wird dieser Schritt übersprungen, öffnet das Gerät ersatzweise einen
Fallback-Hotspot mit Captive Portal zum Eintragen der Zugangsdaten. Für den
dauerhaften Betrieb mit eigenem Verschlüsselungsschlüssel folgt danach am
besten einmal der manuelle Weg unten, mit eigenem `secrets.yaml`.

Diese Seite läuft über **GitHub Pages** und braucht dafür ein **öffentliches
Repository** — solange das Repo privat bleibt, ist sie nicht erreichbar (dafür
gibt es GitHub Pages aus einem privaten Repo nur mit bezahltem Account-Plan).

<details>
<summary>Manuell flashen (eigener Build, eigenes <code>secrets.yaml</code>)</summary>

#### Voraussetzungen

```bash
brew install esphome
```

ESPHome muss mindestens **2026.7.0** sein — erst ab dieser Version ist der
CST9217-Touchcontroller im Core enthalten.

#### Secrets anlegen

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

#### Flashen per USB

Board per USB-C an den Mac anschließen. Port suchen:

```bash
ls /dev/cu.usbmodem*
```

Flashen (Port ggf. anpassen):

```bash
esphome run assist-satellit.yaml --device /dev/cu.usbmodem101
```

Meldet sich kein Port, das Board in den Download-Modus bringen: **BOOT**
halten, **RESET** kurz drücken, **BOOT** loslassen.

**Alternative: ESPHome Desktop.** Seit August 2026 gibt es unter
[desktop.esphome.io](https://desktop.esphome.io) ein natives macOS-DMG, das
Python und ESPHome mitbringt (kein `brew install esphome` nötig) und im
Browser das ESPHome-Device-Builder-Dashboard startet. Für den USB-Erstflash
übernimmt die Dashboard-UI die Port-Erkennung und führt visuell durch den
BOOT/RESET-Download-Modus — praktisch für den fummeligsten Teil des
Ersteinrichtens. Im Dashboard als Konfigurationsverzeichnis den Projektordner
wählen, nicht das Default-`~/esphome/`.

⚠️ Das Dashboard committet bei jeder YAML-Änderung automatisch ins lokale
Git-Repo. Für den einmaligen Erstflash unkritisch, für den laufenden
Update-Workflow mit getaggten Versionen (siehe unten) sollte weiterhin die
CLI (`esphome run … --device assist-satellit.local`) genutzt werden, damit
Commits bewusst gesetzt werden.

</details>

### 2. In Home Assistant einbinden

Das Gerät meldet sich per mDNS. Unter *Einstellungen → Geräte & Dienste*
taucht `assist-satellit` als ESPHome-Gerät auf. Beim Hinzufügen fragt Home
Assistant nach einem Verschlüsselungscode — welcher das ist, hängt davon ab,
wie geflasht wurde:

- **Manueller Build:** der `api_encryption_key` aus dem eigenen `secrets.yaml`.
- **Browser-Flash (anonymer Build):** ein fester, nicht geheimer Platzhalter
  aus [`secrets.public.yaml`](secrets.public.yaml) — steht auch auf der
  Flash-Seite selbst im Akkordeon "Nach dem Flashen":
  ```
  Bw1nT2P6zfBP++xn1gTvfloJweHwPrXXRj0I01RdKZk=
  ```
  Home Assistant schlägt den Code nicht automatisch vor, ein Import über das
  ESPHome-Dashboard/Builder-Add-on ist dafür nicht nötig — einfach von Hand
  eintragen.

Danach unter *Einstellungen → Sprachassistenten* eine Assist-Pipeline mit
deutschem STT/TTS zuweisen.

## Bedienung

Bedient wird ausschließlich über **Home Assistant**. Auf dem Touchscreen gibt
es bewusst keine Bedienelemente: Tippen weckt bzw. bricht ab — mehr nicht.
Tipp und Doppeltipp meldet das Gerät zusätzlich als Event nach Home
Assistant.

Eine eigene Bedienseite unter der Geräte-IP gab es einmal; sie ist ersatzlos
entfallen, zusammen mit dem Webserver. Der Grund: Farben sind
Compile-Zeit-Werte und damit ohnehin nicht zur Laufzeit einstellbar — übrig
blieben zwei Auswahlfelder, die als HA-Entities schon existieren. Das Gerät
beantwortet jetzt keine HTTP-Anfragen mehr (außer dem Fallback-Hotspot, wenn
das WLAN fehlt).

| Entity | Wirkung |
|---|---|
| **Ausrichtung** | Dreht das Bild in 90-Grad-Schritten (0/90/180/270). Die Touch-Koordinaten dreht LVGL mit. 45 Grad gibt die Grafikbibliothek nicht her. |
| **Standby-Seite** | Welche Seite im Standby erscheint: **Uhr**, **Zifferblatt** oder **Gesicht**. Läuft ein Timer, zeigt der Standby unabhängig davon den Countdown. |
| **Display** | Helligkeit; Einschalten aus HA weckt den Bildschirm für die Standby-Zeit. |
| **Mikrofon stumm**, **Wake-Word-Engine**, **Wake-Word-Empfindlichkeit** | Sprachbetrieb. |
| **Erkannter Text**, **Antwort** | Frage und Antwort des letzten Vorgangs. |
| **Displayberührung** (Event) | `single_press` bei einem Tipp, `double_press` bei einem Doppeltipp — nur im Wartezustand, während eines Sprachvorgangs bricht Tippen stattdessen ab. |

Alle Einstellungen überstehen einen Neustart. Die Symbolfarben sind fest in
`assist-satellit.yaml` hinterlegt — eine Änderung braucht einen Neubau der
Firmware.

Die Geräteadresse für `esphome run` oder `esphome logs` zeigt Home Assistant
am Geräteeintrag der ESPHome-Integration an.

## Updates

```bash
git pull && esphome run assist-satellit.yaml --device assist-satellit.local
```

Kompiliert auf dem Mac, überträgt per OTA über WLAN. Home Assistant ist
daran nicht beteiligt.

Rollback auf eine getaggte Version:

```bash
git checkout v0.1.0 && esphome run assist-satellit.yaml --device assist-satellit.local
```

Ein gepushter Tag `v*.*.*` löst zusätzlich
[`.github/workflows/release.yml`](.github/workflows/release.yml) aus: baut die
Firmware mit `secrets.public.yaml` neu und hängt sie als Release-Asset an —
davon lädt die gehostete Browser-Flash-Seite (siehe *Einrichtung*). Der eigene
Build oben ist davon unabhängig und bleibt der Weg für den laufenden Betrieb.

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
| `docs/` | Gehostete Browser-Flash-Seite (GitHub Pages), siehe *Einrichtung* |
| `secrets.public.yaml` | Platzhalter-Secrets für den Release-Build hinter `docs/` — keine echten Zugangsdaten, wird committet |
| `.github/workflows/release.yml` | Baut bei jedem Git-Tag `v*.*.*` die Firmware für `docs/` und veröffentlicht sie als Release-Asset |

Farben, Phasen-IDs und Standby-Zeiten stehen als Substitutions in
`assist-satellit.yaml` — dort anpassen, nicht in den Packages. Wie lange der
Bildschirm nach der letzten Berührung anbleibt, ist `standby_timeout` (30 s);
danach ist er aus. Farben sind reine Compile-Zeit-Werte, eine Änderung
braucht also einen Neubau der Firmware.

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

GPIO45 und GPIO46 sind Strapping-Pins. Die Warnung beim Kompilieren ist
bekannt und unkritisch.

## Fehlersuche

**Ton verzerrt oder rauscht.** Mikrofon (16 kHz) und Lautsprecher (48 kHz)
teilen sich einen I2S-Bus. Falls es Probleme gibt, in
`packages/hardware.yaml` beide auf `16000` setzen.

**Boot-Loop oder LVGL-Speicherfehler.** In `packages/ui.yaml` `buffer_size`
von `25%` auf `12%` senken. Die Sensoren „Freier Heap" und „Freier PSRAM" in
HA zeigen den Speicherdruck.

**Umlaute fehlen auf dem Display.** Im `font:`-Block muss
`glyphsets: [GF_Latin_Core]` stehen.

**Wake Word reagiert nicht.** Die mitgelieferten Modelle sind englisch
("Okay Nabu", "Hey Jarvis", "Hey Mycroft"). Deutsch sprechen funktioniert
erst ab dem Befehl — Sprache und Antwort laufen über die HA-Pipeline.
Empfindlichkeit über die Select-Entity erhöhen.

## Lizenz

Der Code steht unter der [MIT-Lizenz](LICENSE). Die eingebetteten Klänge in
`sounds/` haben eine eigene Lizenz (CC BY 4.0) — siehe
[`sounds/README.md`](sounds/README.md).
