🇩🇪 Deutsch · [🇬🇧 English](README.md)

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
  - [Wetter auf Nachfrage (lokal)](#wetter-auf-nachfrage-lokal)
  - [Musik abspielen (lokal)](#musik-abspielen-lokal)
  - [Freie Wetterfragen (nicht lokal)](#freie-wetterfragen-nicht-lokal)
  - [Verzögerte Aktionen (nicht lokal)](#verzögerte-aktionen-nicht-lokal)
- [Hintergrund](#hintergrund)
- [Lizenz](#lizenz)

## Kennenlernen

Lumi wacht beim Wake Word auf: ein blaues Mikrofon-Icon atmet. Beim
Nachdenken laufen drei Punkte als Welle, bei der Antwort schlägt ein grüner
Äqualizer aus. Fragt Lumi zurück ("Welches Licht meinst du?" — engl. "Which
light do you mean?"), erscheint statt des Mikrofons ein Fragezeichen —
sofort klar, ob das Gerät zuhört oder auf eine Antwort wartet.

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
Automationen nutzen. **Orientation**, **Standby Page**, **Wake Word
Engine**, **Microphone Muted** und Helligkeit sind ganz normale
Home-Assistant-Entities (die Entity-Namen selbst sind englisch, unabhängig
von der HA-Spracheinstellung — siehe [Bedienung](#bedienung)).

Wie eine Anfrage verarbeitet wird — vollständig lokal (Whisper, Piper) oder
über ein Sprachmodell wie Claude als Konversationsagent — entscheidet allein
die [Assist-Pipeline](https://www.home-assistant.io/voice_control/) in Home
Assistant und braucht keine Anpassung an der Firmware.

Ich habe dieses Tool für meinen eigenen Gebrauch und meine Bedürfnisse mit Claude Code geschrieben. Ich würde mich freuen, wenn es auch anderen Personen gefällt und Ihr es einsetzt. Wenn jemand mehr Ahnung von Code hat, freue ich mich auf Anmerkungen, Kritik und Ergänzungen. Viel Spaß mit Lumi!

## Features

### Sprachsteuerung
- Wake Word lokal (`micro_wake_word`) oder über Home Assistant — per Entity umschaltbar, ohne Neustart
- **Recognized Text** und **Response** erscheinen als Text-Sensoren in Home Assistant
- Akustische Bestätigung immer: normalerweise die gesprochene Antwort, bei stummer Ausführung ein kurzer Ton
- Rückfragen zeigen ein Fragezeichen statt des Mikrofons
- Fehler sind optisch unterscheidbar: nicht verstanden, Home Assistant nicht erreichbar, echter Fehler
- Antippen bricht einen laufenden Sprachvorgang ab
- Keine Automation nötig — läuft direkt aus der Firmware

### Statusanzeige
- Jede Phase ein farbcodiertes Element in der Bildschirmmitte: atmendes Mikrofon (Zuhören), Punktwelle (Verarbeitung), Äqualizer (Antwort), Icon (Fehler/Stumm/nicht bereit)
- Messwerte ("Wie warm ist es im Bad?" — engl. "How warm is it in the bathroom?") erscheinen als große Zahl mit Einheit, kurze Bestätigungen ("Eingeschaltet" — engl. "Turned on") als Haken — erkannt per Heuristik über den Antworttext, setzt die eingebaute Intent-Erkennung voraus (bei einem LLM-Konversationsagenten bleibt es beim Äqualizer)
- Enthält die Antwort das Wort „Nacht" (z. B. das eigene „Gute Nacht"-Skript), erscheint auf der Gesicht-Seite statt des grünen Hakens eine Schlafmütze — sonst wie jede andere Bestätigung. **Diese Erkennung (das Wort „Nacht" ebenso wie die Bestätigungswörter „eingeschaltet"/„gestellt"/… und die Messwert-Einheiten „Grad"/„Prozent"/…) sucht ausschließlich nach deutschen Wörtern im Antworttext** — sie hängt an der Sprache der eigenen Assist-Pipeline, nicht an der Displaysprache der Entities. Läuft die Pipeline auf Englisch, bleibt es bei Messwerten und Bestätigungen beim Äqualizer, weil die englischen Antworttexte diese deutschen Wörter nicht enthalten.

### Standby-Seiten
Drei Ansichten, umschaltbar über eine Select-Entity, wirkt sofort:

- **Clock** — Uhrzeit mit Datum
- **Dial** — Strichkranz ohne Zeiger, Stunde und Minute farbig hervorgehoben
- **Face** — wartend umherblickende Augen, dreizehn zufällige Marotten

Ist **Face** gewählt, übernimmt es auch Zuhören, Verarbeiten und Antworten
(Augen richten sich auf, Mund bewegt sich, Farbwechsel je Phase); bei
**Clock** und **Dial** bleibt es bei Mikrofon, Punkten und Balken.

### Timer
- Ring am Bildschirmrand, sichtbar auf jeder Seite — im Standby tritt der Countdown an die Stelle der Uhr
- Sticht die gewählte Standby-Seite aus, solange er läuft; während eines Sprachvorgangs bleibt es bei **Face**
- Am Ende klingelt es und eine Glocke erscheint; Antippen beendet beides
- Abbrechen per Sprache ("Timer abbrechen") — kein Bedienelement am Gerät

### Display-Verhalten
- Standby heißt aus: nach einstellbarer Zeit ohne Berührung schaltet sich der Bildschirm komplett ab
- Volle Helligkeit nur beim Zuhören (100 % statt der **Standby Brightness**) — der Sprung ist selbst das Zeichen
- Tipp und Doppeltipp lösen ein Event in Home Assistant aus
- **Orientation**, **Standby Page**, **Microphone Muted**, Wake Word und Helligkeit als Entities

### Firmware-Updates
Erscheinen unter *Einstellungen → Geräte → Updates* wie bei jeder anderen
Home-Assistant-Integration — ein Klick installiert, kein Rechner nötig. Das
WLAN bleibt dabei erhalten, weil es nie Teil des Firmware-Images war.

## Einrichtung

### 1. Firmware flashen

Geflasht wird im Browser, ganz ohne Terminal:
[mohoel.github.io/home-assistant-voice-display](https://mohoel.github.io/home-assistant-voice-display/)
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

| Entity (Name in Home Assistant) | Wirkung |
|---|---|
| **Orientation** | Dreht das Bild in 90-Grad-Schritten (0/90/180/270), Touch-Koordinaten drehen mit. |
| **Standby Page** | Clock, Dial oder Face. Läuft ein Timer, zeigt der Standby unabhängig davon den Countdown. |
| **Standby Timeout** | Wie lange der Bildschirm nach der letzten Berührung anbleibt, bevor er ausgeht (Sekunden, 5–300). |
| **Standby Brightness** | Helligkeit von Clock, Dial, Face, Verarbeitung, Antwort usw. — alles außer dem Zuhören, das fest auf 100 % läuft (Prozent, 10–100). |
| **Display** | Helligkeit; Einschalten aus HA weckt den Bildschirm für die Standby-Zeit. |
| **Microphone Muted**, **Wake Word Engine**, **Wake Word Sensitivity** | Sprachbetrieb. |
| **Recognized Text**, **Response** | Frage und Antwort des letzten Vorgangs. |
| **Display Touch** (Event) | `single_press` bei einem Tipp, `double_press` bei einem Doppeltipp — nur im Wartezustand, während eines Sprachvorgangs bricht Tippen stattdessen ab. |

Alle Einstellungen überstehen einen Neustart.

## Blueprints

Lumi braucht für den normalen Betrieb keine einzige Automation — wer aber
gezielt etwas auf dem Display oder über den Lautsprecher auslösen will oder
Wetter/Timer-Funktionen per Sprache ergänzen möchte, findet hier alle dafür
vorbereiteten Blueprints an einem Ort, im Ordner
[`blueprints/`](blueprints/): importieren, Eingaben ausfüllen, fertig,
statt eigenes YAML zu schreiben. Servicenamen der Lumi-eigenen Aktionen
hängen vom kompilierten Gerätenamen ab (`esphome.<gerätename>_<aktion>`,
z. B. `esphome.lumi_a0d0a8_zeige_hinweis`).

### Hinweis bei Ereignis

Zeigt für eine wählbare Dauer ein Icon mit Text in der Bildschirmmitte,
unabhängig davon, was das Gerät gerade tut — praktisch für alles, wovon die
Firmware selbst nichts wissen kann: eine Türklingel, ein Paket, ein
Leck-Sensor.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fhinweis_bei_ereignis.yaml)
🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fhinweis_bei_ereignis.yaml)

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
auch während das Gerät gerade lauscht.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fansage_bei_ereignis.yaml)
🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fansage_bei_ereignis.yaml)

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
eigenen Automation — siehe Entity **Display Touch** unter
[Bedienung](#bedienung).

### Wetter auf Nachfrage (lokal)

Beantwortet gezielte Wetterfragen ("Wie wird das Wetter morgen um 14 Uhr?" —
engl. "What will the weather be like tomorrow at 2 pm?") mit Icon und
Temperatur auf dem Display. Anders als der Rest der Firmware
braucht das eine einmalige Automation in Home Assistant, weil die Firmware
sonst nie mehr als den gesprochenen Antworttext erfährt.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fwetter_auf_nachfrage.yaml)
🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fwetter_auf_nachfrage.yaml)

Importieren, daraus eine Automation anlegen und darin die eigene
`weather.*`-Entity auswählen (Domain `weather`). Als **Wetter-Aktion**
optional im Aktions-Editor der Automation die eigene `zeige_wetter`-Aktion
des Geräts suchen und darin folgende drei Vorlagen eintragen. Der
Servicename hängt vom kompilierten Gerätenamen ab
(`esphome.<gerätename>_zeige_wetter`, z. B. `esphome.lumi_a0d0a8_zeige_wetter`).

```
zustand: {{ zustand }}
temperatur: {{ temperatur }}
einheit: {{ einheit }}
```

Ergibt z. B. "Morgen um 14 Uhr ist es bewölkt mit 24 Grad." (engl. "Tomorrow
at 2 pm it's cloudy with 24 degrees.") Funktioniert unabhängig vom
gewählten Konversationsagenten, auch bei einem LLM wie Claude.

### Musik abspielen (lokal)

Leitet einen Musikwunsch per Sprache direkt an einen
[Music-Assistant](https://www.music-assistant.io/)-Player weiter — Lumi
selbst spielt dabei nichts, das Zielgerät steckt im Satz. Braucht eine
eingerichtete Music-Assistant-Integration mit mindestens einem Player;
funktioniert mit der eingebauten lokalen Intent-Erkennung genauso wie mit
einem LLM als Konversationsagent, weil der Satzauslöser der Assist-Pipeline
vorgeschaltet ist. Die Automation muss für den Sprachassistenten freigegeben werden.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fmusik_abspielen.yaml)
🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fmusik_abspielen.yaml)

Importieren und daraus eine Automation anlegen — ohne weitere Eingaben nötig.
Nennt der Satz keinen Raum und kein Gerät, spielt automatisch der
Music-Assistant-Player im Bereich des ansprechenden Assist-Geräts, also
derselbe Raum, in dem der Sprachbefehl fiel. Steht dort kein
Music-Assistant-Player, bricht der Befehl mit einer gesprochenen
Fehlermeldung ab — ein anderer Raum wird dann nur erreicht, wenn er im Satz
genannt wird. Erkannt werden sechs Medientypen, jeweils eingeleitet mit
"Spiele"/"Höre"/"Spiel":

| Medientyp | Beispielsatz (Deutsch) | Beispielsatz (Englisch, mit der [englischen Blueprint-Fassung](#blueprints)) |
|---|---|---|
| Künstler/Band/Gruppe | "Spiele den Künstler Herbert Grönemeyer im Wohnzimmer" | "Play the artist Herbert Grönemeyer in the living room" |
| Lied/Titel/Song | "Spiele den Titel Bochum im Schlafzimmer" | "Play the song Bochum in the bedroom" |
| Album | "Höre das Album Mensch vom Künstler Herbert Grönemeyer in der Küche" | "Play the album Mensch by the artist Herbert Grönemeyer in the kitchen" |
| Playlist/Wiedergabeliste | "Höre die Playlist Fokus Musik auf dem Sonos" | "Play the playlist Focus Music on the Sonos" |
| Podcast | "Spiele den Podcast Baywatch Berlin" | "Play the podcast Baywatch Berlin" |
| Radiosender/Radio/Sender | "Höre das Radio Deutschlandfunk in der Küche" | "Play the radio station Deutschlandfunk in the kitchen" |

Bei Lied und Album lässt sich zusätzlich ein Künstler nennen — wörtlich mit
dem Wort "Künstler"/"Band"/"Gruppe" ("… vom Künstler …" / "… von der Band
…"), sonst landet der Name als Teil des Titels/Albumnamens, was Music
Assistant meist trotzdem findet, nur weniger präzise. Der optionale Zielraum bzw.
das Zielgerät am Satzende wird zuerst gegen die Namen aller
Music-Assistant-Player geprüft, dann gegen Bereichsnamen; ohne Treffer
zählt der Bereich des ansprechenden Assist-Geräts — findet sich dort kein
Music-Assistant-Player, bricht der Befehl mit einer gesprochenen
Fehlermeldung ab, es gibt keinen weiteren Ausweich-Player.

Bevor etwas abgespielt wird, sucht das Blueprint selbst mit
`music_assistant.search` nach einer eindeutigen Treffer-URI (25 Kandidaten,
bevorzugt ein exakter Namenstreffer), statt sich auf die eingebaute, auf
8 Kandidaten begrenzte Namensauflösung von `play_media` zu verlassen — bei
Radiosendern mit vielen ähnlich benannten Einträgen (z. B. über
Radio-Browser) blieb die sonst öfter erfolglos. Findet auch diese Suche
nichts, greift ersatzweise der rohe gesprochene Name wie zuvor.

Für frei formulierte Musikwünsche ohne festen Satz ("Spiel mal was zum
Entspannen") reicht dieses Blueprint nicht — dafür fehlt bislang ein
eigenes LLM-Werkzeug-Skript nach dem Muster von „Freie Wetterfragen"
unten.

**Pause, weiter, nächster Titel und Lautstärke laufen bereits ohne dieses
Blueprint** — das sind eingebaute lokale Intents von Home Assistant
(`HassMediaPause`, `HassMediaUnpause`, `HassMediaNext`, `HassMediaPrevious`,
`HassSetVolume`/`HassSetVolumeRelative`), keine Lumi-eigene Logik. Sätze wie
"Pause", "Weiter", "Nächster Titel" oder "Lauter"/"Leiser um 20 Prozent"
zielen ohne Namen oder Raum automatisch auf den Bereich des ansprechenden
Assist-Geräts — bei Lumi also den Raum, in dem es steht — genau wie bei
Lampen. Stehen dort mehrere `media_player`-Entities (z. B. zusätzlich ein
Fernseher), wird's mehrdeutig; dann hilft ein Name oder Raum im Satz
("Pause auf dem Sonos", "Lauter im Wohnzimmer"). Das gilt unabhängig vom
gewählten Konversationsagenten und ist kein Teil dieses Blueprints — es
läuft schon, ganz ohne Import.

### Freie Wetterfragen (nicht lokal)

Beantwortet offene Fragen ohne festen Satz, z. B. "Wird es morgen regnen?"
(engl. "Will it rain tomorrow?") oder "Wie wird das Wetter übermorgen?"
(engl. "What will the weather be like the day after tomorrow?"). Braucht
eine KI/LLM-Pipeline als Konversationsagent — mit der eingebauten lokalen
Intent-Erkennung funktioniert das nicht.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Ffreie_wetterfragen.yaml)
🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fen%2Ffreie_wetterfragen.yaml)

Importieren, daraus ein Skript anlegen und darin die eigene `weather.*`-Entity
auswählen sowie — wie bei „Wetter auf Nachfrage" oben — optional die eigene
`zeige_wetter`-Aktion mit denselben drei Vorlagen. Anschließend das Skript
für Sprachassistenten freigeben.

### Verzögerte Aktionen (nicht lokal)

Führt eine Aktion nach einer Wartezeit aus, z. B. "Schalte das Licht in 5
Minuten aus" (engl. "Turn off the light in 5 minutes"), "Schließe das Rollo
in 10 Minuten" (engl. "Close the blinds in 10 minutes") oder "Fahr das
Rollo in 20 Minuten auf 30 Prozent" (engl. "Set the blinds to 30 percent
in 20 minutes"). Wie bei den freien Wetterfragen ruft der
Konversationsagent das Skript als Werkzeug auf, kein Satzauslöser nötig —
das braucht eine KI/LLM-Pipeline, die eingebaute lokale Intent-Erkennung
kann keine Werkzeuge mit Freitext-Parametern aufrufen. Anders als die
Wetterfunktion ist das kein Lumi-spezifisches Feature: es löst keine
Display-Aktion des Geräts aus und funktioniert mit jedem Assist-fähigen
Eingabeweg (Lumi, App, andere Satellites, …) und mit beliebigen eigenen
Entities — der Name eines Geräts genügt, keine `entity_id` muss von Hand
eingetragen werden.

Zwei Skript-Blueprints anlegen, in dieser Reihenfolge:

**1. Verzögerte Aktion**
— das Gegenstück, das nach der Wartezeit wirklich etwas tut. Löst
Gerätenamen erst unmittelbar vor dem Warten zu echten `entity_id`s auf und
meldet nicht eindeutig zuordenbare Geräte sofort per
`persistent_notification`, statt erst nach Ablauf der Wartezeit stumm zu
scheitern. Bleibt intern, wird nicht für Assist freigegeben.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fverzoegerte_aktion.yaml)
🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fen%2Fverzoegerte_aktion.yaml)

**2. Timer Aktion starten**
— das Werkzeug, das für Assist freigegeben wird. Startet Skript 1 im
Hintergrund und wartet nicht auf dessen Ende, damit Assist sofort antworten
kann. Beim Anlegen die aus Skript 1 erstellte Skript-Instanz als Eingabe
auswählen.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Ftimer_aktion_starten.yaml)
🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fen%2Ftimer_aktion_starten.yaml)

Danach nur Skript 2 für Assist freigeben; Skript 1 bleibt intern. Der Grund für
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
