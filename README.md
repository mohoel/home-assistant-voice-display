# Lumi 🎙️

**Ein Home Assistant Voice Satellite mit Gesicht.**

ESPHome-Firmware für den **Waveshare ESP32-S3-Touch-AMOLED-1.75**: ein
rundes 466×466-AMOLED mit Touchscreen und Lautsprecher. Statt eines
blinkenden LED-Rings zeigt Lumi auf dem Display, was gerade passiert —
zuhören, nachdenken, antworten —, wahlweise mit einem kleinen animierten
Gesicht.

## Inhaltsverzeichnis

- [Kennenlernen](#kennenlernen)
- [Features](#features)
  - [Sprachsteuerung](#sprachsteuerung)
  - [Statusanzeige](#statusanzeige)
  - [Standby-Seiten](#standby-seiten)
  - [Timer](#timer)
  - [Display-Verhalten](#display-verhalten)
  - [Firmware-Updates](#firmware-updates)
- [Einrichtung](#einrichtung)
- [Bedienung](#bedienung)
- [Blueprints](#blueprints)
  - [Hinweis bei Ereignis](#hinweis-bei-ereignis)
  - [Ansage bei Ereignis](#ansage-bei-ereignis)
  - [Wetter auf Nachfrage (optional)](#wetter-auf-nachfrage-optional)
  - [Freie Wetterfragen (optional, nicht lokal)](#freie-wetterfragen-optional-nicht-lokal)
  - [Verzögerte Aktionen (optional, nicht lokal)](#verzögerte-aktionen-optional-nicht-lokal)
- [Hintergrund](#hintergrund)
- [Lizenz](#lizenz)

## Kennenlernen

Lumi wacht beim Wake Word auf: ein blaues Mikrofon-Icon atmet. Beim
Nachdenken laufen drei Punkte als Welle, bei der Antwort schlägt ein grüner
Äqualizer aus. Fragt Lumi zurück ("Welches Licht meinst du?"), erscheint
statt des Mikrofons ein Fragezeichen — sofort klar, ob das Gerät zuhört oder
auf eine Antwort wartet.

Wer mag, gibt Lumi ein Gesicht: zwei Augen und ein Mund, die im Leerlauf
umherblicken, blinzeln und gelegentlich die Zunge herausstrecken — und
dieselbe Mimik auch beim Zuhören, Denken und Antworten tragen. Wer es
schlicht mag, bekommt eine große Standby-Uhr oder ein zeigerloses
Zifferblatt. Läuft ein Timer, zählt ein Ring am Bildschirmrand die Restzeit
ab, sichtbar auf jeder Seite.

Bedient wird Lumi ausschließlich über Home Assistant — keine eigene
Bedienseite, keine Cloud, keine App. Der Touchscreen kennt nur eine Geste:
Antippen weckt das Display oder bricht einen laufenden Sprachvorgang ab;
Tipp und Doppeltipp lassen sich zusätzlich als Events für eigene
Automationen nutzen. Ausrichtung, Standby-Seite, Wake-Word-Engine,
Stummschaltung und Helligkeit sind ganz normale Home-Assistant-Entities.

Wie eine Anfrage verarbeitet wird — vollständig lokal (Whisper, Piper) oder
über ein Sprachmodell wie Claude als Konversationsagent — entscheidet allein
die [Assist-Pipeline](https://www.home-assistant.io/voice_control/) in Home
Assistant und braucht keine Anpassung an der Firmware.

## Features

### Sprachsteuerung
- Wake Word lokal (`micro_wake_word`) oder über Home Assistant — per Entity umschaltbar, ohne Neustart
- Erkannter Text und Antwort erscheinen als Text-Sensoren in Home Assistant
- Akustische Bestätigung immer: normalerweise die gesprochene Antwort, bei stummer Ausführung ein kurzer Ton
- Rückfragen zeigen ein Fragezeichen statt des Mikrofons
- Fehler sind optisch unterscheidbar: nicht verstanden, Home Assistant nicht erreichbar, echter Fehler
- Antippen bricht einen laufenden Sprachvorgang ab
- Keine Automation nötig — läuft direkt aus der Firmware

### Statusanzeige
- Jede Phase ein farbcodiertes Element in der Bildschirmmitte: atmendes Mikrofon (Zuhören), Punktwelle (Verarbeitung), Äqualizer (Antwort), Icon (Fehler/Stumm/nicht bereit)
- Messwerte ("Wie warm ist es im Bad?") erscheinen als große Zahl mit Einheit, kurze Bestätigungen ("Eingeschaltet") als Haken — erkannt per Heuristik über den Antworttext, setzt die eingebaute Intent-Erkennung voraus (bei einem LLM-Konversationsagenten bleibt es beim Äqualizer)

### Standby-Seiten
Drei Ansichten, umschaltbar über eine Select-Entity, wirkt sofort:

- **Uhr** — Uhrzeit mit Datum
- **Zifferblatt** — Strichkranz ohne Zeiger, Stunde und Minute farbig hervorgehoben
- **Gesicht** — wartend umherblickende Augen, dreizehn zufällige Marotten

Ist das Gesicht gewählt, übernimmt es auch Zuhören, Verarbeiten und
Antworten (Augen richten sich auf, Mund bewegt sich, Farbwechsel je Phase);
bei Uhr und Zifferblatt bleibt es bei Mikrofon, Punkten und Balken.

### Timer
- Ring am Bildschirmrand, sichtbar auf jeder Seite — im Standby tritt der Countdown an die Stelle der Uhr
- Sticht die gewählte Standby-Seite aus, solange er läuft; während eines Sprachvorgangs bleibt es beim Gesicht
- Am Ende klingelt es und eine Glocke erscheint; Antippen beendet beides
- Abbrechen per Sprache ("Timer abbrechen") — kein Bedienelement am Gerät

### Display-Verhalten
- Standby heißt aus: nach einstellbarer Zeit ohne Berührung schaltet sich der Bildschirm komplett ab
- Volle Helligkeit nur beim Zuhören (100 % statt der Standby-Helligkeit) — der Sprung ist selbst das Zeichen
- Tipp und Doppeltipp lösen ein Event in Home Assistant aus
- Ausrichtung, Standby-Seite, Stummschaltung, Wake-Word und Helligkeit als Entities

### Firmware-Updates
Erscheinen unter *Einstellungen → Geräte → Updates* wie bei jeder anderen
Home-Assistant-Integration — ein Klick installiert, kein Rechner nötig. Das
WLAN bleibt dabei erhalten, weil es nie Teil des Firmware-Images war.

## Einrichtung

### 1. Firmware flashen

Geflasht wird im Browser, ganz ohne Terminal:
[mohoel.github.io/home-assistant-voice-lumi](https://mohoel.github.io/home-assistant-voice-lumi/)
per [ESP Web Tools](https://esphome.github.io/esp-web-tools/) über Web
Serial in Chrome/Edge — Board per USB anschließen, Button klicken, fertig.

Direkt danach fragt [Improv Wi-Fi](https://www.improv-wifi.com/) über
dieselbe USB-Verbindung nach dem eigenen WLAN. Wird das übersprungen, öffnet
das Gerät ersatzweise einen Hotspot mit Captive Portal zum Eintragen der
Zugangsdaten. Diese landen im Flash-Speicher des Geräts, nicht im
Firmware-Image, und überstehen deshalb jedes spätere Update.

Meldet sich das Board nicht: **BOOT** halten, **RESET** kurz drücken,
**BOOT** loslassen (Download-Modus).

### 2. In Home Assistant einbinden

Das Gerät meldet sich per mDNS als `lumi` und taucht unter *Einstellungen →
Geräte & Dienste* als ESPHome-Gerät auf. Beim Hinzufügen fragt Home
Assistant nach einem Verschlüsselungscode — ein fester, nicht geheimer
Platzhalter (steht auch auf der Flash-Seite im Akkordeon „Nach dem
Flashen"), von Hand einzutragen:

```
Bw1nT2P6zfBP++xn1gTvfloJweHwPrXXRj0I01RdKZk=
```

Danach unter *Einstellungen → Sprachassistenten* eine Assist-Pipeline mit
deutschem STT/TTS zuweisen.

### 3. Updates

Ab hier reicht Home Assistant: Neue Firmware-Versionen erscheinen unter
*Einstellungen → Geräte → Updates* mit „Installieren"-Knopf, das Gerät lädt
sie selbst herunter und startet neu — kein Rechner mehr nötig.

## Bedienung

Bedient wird ausschließlich über Home Assistant. Der Touchscreen kennt nur
eine Geste: Antippen weckt das Display oder bricht einen laufenden
Sprachvorgang ab.

| Entity | Wirkung |
|---|---|
| **Ausrichtung** | Dreht das Bild in 90-Grad-Schritten (0/90/180/270), Touch-Koordinaten drehen mit. |
| **Standby-Seite** | Uhr, Zifferblatt oder Gesicht. Läuft ein Timer, zeigt der Standby unabhängig davon den Countdown. |
| **Standby-Zeit** | Wie lange der Bildschirm nach der letzten Berührung anbleibt, bevor er ausgeht (Sekunden, 5–300). |
| **Standby-Helligkeit** | Helligkeit von Uhr, Zifferblatt, Gesicht, Verarbeitung, Antwort usw. — alles außer dem Zuhören, das fest auf 100 % läuft (Prozent, 10–100). |
| **Display** | Helligkeit; Einschalten aus HA weckt den Bildschirm für die Standby-Zeit. |
| **Mikrofon stumm**, **Wake-Word-Engine**, **Wake-Word-Empfindlichkeit** | Sprachbetrieb. |
| **Erkannter Text**, **Antwort** | Frage und Antwort des letzten Vorgangs. |
| **Displayberührung** (Event) | `single_press` bei einem Tipp, `double_press` bei einem Doppeltipp — nur im Wartezustand, während eines Sprachvorgangs bricht Tippen stattdessen ab. |

Alle Einstellungen überstehen einen Neustart.

## Blueprints

Lumi braucht für den normalen Betrieb keine einzige Automation — wer aber
gezielt etwas auf dem Display oder über den Lautsprecher auslösen will oder
Wetter/Timer-Funktionen per Sprache ergänzen möchte, findet hier alle dafür
vorbereiteten Blueprints an einem Ort, im Ordner
[`blueprints/`](blueprints/): importieren, Eingaben ausfüllen, fertig,
statt eigenes YAML zu schreiben. Servicenamen der Lumi-eigenen Aktionen
hängen vom kompilierten Gerätenamen ab (`esphome.<gerätename>_<aktion>`,
z. B. `esphome.lumi_a0d0a8_zeige_hinweis`). Ausgewählt wird die passende
Aktion direkt im Aktions-Editor der Automation, beim Ausfüllen des
jeweiligen Blueprint-Eingabefelds — dort landet sie auch dauerhaft.
*Entwicklerwerkzeuge → Aktionen* bzw. *→ Entitäten* eignen sich nur zum
vorherigen Nachschlagen des genauen Namens oder für einen einmaligen
Testaufruf; was dort eingetragen wird, ist nach dem Ausführen nicht
gespeichert und nicht Teil einer Automation.

### Hinweis bei Ereignis

Zeigt für eine wählbare Dauer ein Icon mit Text in der Bildschirmmitte,
unabhängig davon, was das Gerät gerade tut — praktisch für alles, wovon die
Firmware selbst nichts wissen kann: eine Türklingel, ein Paket, ein
Leck-Sensor. Dafür gibt es das Blueprint
[„Lumi: Hinweis bei Ereignis"](blueprints/automation/lumi/hinweis_bei_ereignis.yaml):

[![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-lumi%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fhinweis_bei_ereignis.yaml)

Importieren, daraus eine Automation anlegen und darin auslösende Entity
und Zielzustand wählen (z. B. `binary_sensor.haustuer` → `on`). Als
**Hinweis-Aktion** die eigene `zeige_hinweis`-Aktion suchen (Servicename
hängt vom kompilierten Gerätenamen ab, z. B.
`esphome.lumi_a0d0a8_zeige_hinweis`) und darin Icon, Text und Anzeigedauer
eintragen, z. B. `icon: mdi:door-open`, `nachricht: Haustür offen`,
`sekunden: 15`.

`icon` versteht echte `mdi:`-Namen wie im Home-Assistant-Icon-Picker, aber
nur eine feste, eingebettete Auswahl. Ein nicht gelisteter Name zeigt nur
den Text, kein Icon:

| mdi-Name | Bedeutung |
|---|---|
| `mdi:bell` | Glocke |
| `mdi:door`, `mdi:door-open` | Tür zu, Tür offen |
| `mdi:motion-sensor` | Bewegung erkannt |
| `mdi:water`, `mdi:water-alert` | Wasser, Leck/Wasseralarm |
| `mdi:fire` | Feuer |
| `mdi:thermometer` | Temperatur |
| `mdi:package-variant` | Paket |
| `mdi:lock`, `mdi:lock-open` | Schloss zu, Schloss offen |
| `mdi:battery-alert` | Akku niedrig |
| `mdi:email` | Post |
| `mdi:alert`, `mdi:alert-circle` | Warnung |
| `mdi:wifi-off` | Verbindung getrennt |
| `mdi:help` | Frage |
| `mdi:check` | Erledigt |
| `mdi:microphone`, `mdi:microphone-off` | Mikrofon an, Mikrofon aus |

Fehlt ein Icon, lässt es sich ergänzen (Details in
[`packages/ui.yaml`](packages/ui.yaml), Font `font_hint_icon`) — kostet
aber einen Neubau der Firmware.

### Ansage bei Ereignis

Keine eigene Funktion von Lumi, sondern die eingebaute Home-Assistant-Aktion
`assist_satellite.announce` — funktioniert auf jedem `assist_satellite`-Gerät
(auch Nabu Casas Voice PE) und spielt Text als Ansage ab, ohne Wake Word,
auch während das Gerät gerade lauscht. Dafür gibt es das Blueprint
[„Lumi: Ansage bei Ereignis"](blueprints/automation/lumi/ansage_bei_ereignis.yaml):

[![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-lumi%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fansage_bei_ereignis.yaml)

Importieren, daraus eine Automation anlegen und darin auslösende Entity,
Zielzustand, das Assist-Satellite-Gerät (z. B. Lumi) und den Text wählen —
etwa `sensor.waschmaschine_status` → `fertig`, „Die Waschmaschine ist
fertig."

Das Blueprint kennt zusätzlich eine Option „Als Rückfrage stellen": nutzt
`ask_question` statt `announce`, erwartet danach eine gesprochene Antwort
und zeigt dabei automatisch das Fragezeichen-Icon. Die optionale
Zusatzaktion lässt sich z. B. mit `zeige_hinweis` kombinieren, etwa bei
einer Video-Türklingel.

Umgekehrt melden sich Tipp und Doppeltipp auf den Bildschirm als Event
(`single_press`/`double_press`) bei Home Assistant, auswertbar in einer
eigenen Automation — siehe Entity **Displayberührung** unter
[Bedienung](#bedienung).

### Wetter auf Nachfrage (optional)

Beantwortet gezielte Wetterfragen ("Wie wird das Wetter morgen um 14 Uhr?")
mit Icon und Temperatur auf dem Display. Anders als der Rest der Firmware
braucht das eine einmalige Automation in Home Assistant, weil die Firmware
sonst nie mehr als den gesprochenen Antworttext erfährt — dafür gibt es das
Blueprint [„Lumi: Wetter auf Nachfrage"](blueprints/automation/lumi/wetter_auf_nachfrage.yaml):

[![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-lumi%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fwetter_auf_nachfrage.yaml)

Importieren, daraus eine Automation anlegen und darin die eigene
`weather.*`-Entity auswählen (Domain `weather`). Als **Wetter-Aktion**
optional im Aktions-Editor der Automation die eigene `zeige_wetter`-Aktion
des Geräts suchen und darin folgende drei Vorlagen eintragen. Der
Servicename hängt vom kompilierten Gerätenamen ab
(`esphome.<gerätename>_zeige_wetter`, z. B. `esphome.lumi_a0d0a8_zeige_wetter`)
— unbekannt lässt er sich vorab unter *Entwicklerwerkzeuge → Aktionen*
nachschlagen (Suche nach "zeige_wetter"), dort Eingegebenes wird aber
nicht gespeichert:

```
zustand: {{ zustand }}
temperatur: {{ temperatur }}
einheit: {{ einheit }}
```

Ergibt z. B. "Morgen um 14 Uhr ist es bewölkt mit 24 Grad." Funktioniert
unabhängig vom gewählten Konversationsagenten, auch bei einem LLM wie Claude.

### Freie Wetterfragen (optional, nicht lokal)

Beantwortet offene Fragen ohne festen Satz, z. B. "Wird es morgen regnen?"
oder "Wie wird das Wetter übermorgen?". Braucht eine KI/LLM-Pipeline als
Konversationsagent — mit der eingebauten lokalen Intent-Erkennung
funktioniert das nicht.

Dafür gibt es das Skript-Blueprint
[„Lumi: Freie Wetterfragen"](blueprints/script/lumi/freie_wetterfragen.yaml):

[![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-lumi%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Ffreie_wetterfragen.yaml)

Importieren, daraus ein Skript anlegen und darin die eigene `weather.*`-Entity
auswählen sowie — wie bei „Wetter auf Nachfrage" oben — optional die eigene
`zeige_wetter`-Aktion mit denselben drei Vorlagen. Anschließend das Skript
für Sprachassistenten freigeben (Entität-Einstellungen → „Für
Sprachassistenten verfügbar machen") — kein Satzauslöser nötig, der
Konversationsagent ruft das Skript selbst als Werkzeug auf.

### Verzögerte Aktionen (optional, nicht lokal)

Führt eine Aktion nach einer Wartezeit aus, z. B. "Schalte das Licht in 5
Minuten aus", "Schließe das Rollo in 10 Minuten" oder "Fahr das Rollo in 20
Minuten auf 30 Prozent". Wie bei den freien Wetterfragen ruft der
Konversationsagent das Skript als Werkzeug auf, kein Satzauslöser nötig —
das braucht eine KI/LLM-Pipeline, die eingebaute lokale Intent-Erkennung
kann keine Werkzeuge mit Freitext-Parametern aufrufen. Anders als die
Wetterfunktion ist das kein Lumi-spezifisches Feature: es löst keine
Display-Aktion des Geräts aus und funktioniert mit jedem Assist-fähigen
Eingabeweg (Lumi, App, andere Satellites, …) und mit beliebigen eigenen
Entities — der Name eines Geräts genügt, keine `entity_id` muss von Hand
eingetragen werden.

Zwei Skript-Blueprints anlegen, in dieser Reihenfolge:

**1. [„Lumi: Verzögerte Aktion"](blueprints/script/lumi/verzoegerte_aktion.yaml)**
— das Gegenstück, das nach der Wartezeit wirklich etwas tut. Löst
Gerätenamen erst unmittelbar vor dem Warten zu echten `entity_id`s auf und
meldet nicht eindeutig zuordenbare Geräte sofort per
`persistent_notification`, statt erst nach Ablauf der Wartezeit stumm zu
scheitern. Bleibt intern, wird nicht für Assist freigegeben.

[![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-lumi%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fverzoegerte_aktion.yaml)

**2. [„Lumi: Timer Aktion starten"](blueprints/script/lumi/timer_aktion_starten.yaml)**
— das Werkzeug, das für Assist freigegeben wird. Startet Skript 1 im
Hintergrund und wartet nicht auf dessen Ende, damit Assist sofort antworten
kann. Beim Anlegen die aus Skript 1 erstellte Skript-Instanz als Eingabe
auswählen.

[![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-lumi%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Ftimer_aktion_starten.yaml)

Danach nur Skript 2 für Assist freigeben (Entität-Einstellungen → „Für
Sprachassistenten verfügbar machen"); Skript 1 bleibt intern. Der Grund für
die Namensauflösung in Skript 1: Der Konversationsagent bekommt zu einem
Gerät nur Name, Domain und Bereich mitgeteilt, nie die tatsächliche
`entity_id` — eine geratene ID schlägt zuverlässig fehl (Home Assistant
protokolliert das nur als stille `WARNING`, der Aufruf selbst meldet
trotzdem Erfolg).

## Hintergrund

Lumi ist **kein Fork** von Nabu Casas offizieller Firmware, sondern eine
eigenständige Neuentwicklung für andere Hardware (rundes AMOLED statt
LED-Ring bzw. rechteckigem Display). Übernommen ist nur das *Muster*, wie
Wake Word, Sprachsitzungen und Timer als ESPHome-Skripte modelliert werden,
orientiert an:

- [`esphome/home-assistant-voice-pe`](https://github.com/esphome/home-assistant-voice-pe) — Nabu Casas Home Assistant Voice Preview Edition
- [`esphome/wake-word-voice-assistants`](https://github.com/esphome/wake-word-voice-assistants) — Referenzkonfiguration für den ESP32-S3-Box-3

Da `lumi.yaml` keine externe Paket-Abhängigkeit einbindet, sondern nur
lokale Dateien aus diesem Repo, kommen Änderungen an den offiziellen Repos
nicht automatisch hier an.

## Lizenz

Der Code steht unter der [MIT-Lizenz](LICENSE). Die eingebetteten Klänge in
`sounds/` haben eine eigene Lizenz (CC BY 4.0) — siehe
[`sounds/README.md`](sounds/README.md).
