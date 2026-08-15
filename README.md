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
  - [Wetter auf Nachfrage (optional)](#wetter-auf-nachfrage-optional)
- [Einrichtung](#einrichtung)
- [Bedienung](#bedienung)
- [Automationen](#automationen)
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

### Wetter auf Nachfrage (optional)

Beantwortet gezielte Wetterfragen ("Wie wird das Wetter morgen um 14 Uhr?")
mit Icon und Temperatur auf dem Display. Anders als der Rest der Firmware
braucht das eine einmalige Automation in Home Assistant, weil die Firmware
sonst nie mehr als den gesprochenen Antworttext erfährt.

In der Variable `wetter_entity` die eigene `weather.*`-Entity eintragen
(Einstellungen → Geräte & Dienste → Entitäten, Domain `weather`) und als
neue Automation einfügen (*Einstellungen → Automationen & Szenen →
Automationen*, YAML-Modus):

```yaml
alias: "Wetter auf Nachfrage - Satzauslöser"
triggers:
  - trigger: conversation
    command:
      - "wie wird das wetter [am] {tag} um {stunde} uhr"
      - "wie ist das wetter [am] {tag} um {stunde} uhr"
      - "wetter {tag} um {stunde} uhr"
variables:
  wetter_entity: weather.home   # <-- hier die eigene weather.*-Entity eintragen
actions:
  - action: weather.get_forecasts
    target:
      entity_id: "{{ wetter_entity }}"
    data:
      type: hourly
    response_variable: vorhersage
  - variables:
      eintraege: "{{ vorhersage[wetter_entity].forecast }}"
      ziel_tag: >-
        {{ (now() + timedelta(days=1)).strftime('%Y-%m-%d') if trigger.slots.tag == 'morgen'
           else now().strftime('%Y-%m-%d') }}
      stunde_zahl: "{{ trigger.slots.stunde | string | regex_replace('[^0-9].*', '') | int(0) }}"
      treffer: >-
        {{ (eintraege | selectattr('datetime', 'match',
             '^' + ziel_tag + 'T' + '%02d' | format(stunde_zahl)) | list
             | first) or eintraege[0] }}
      zustand_text: >-
        {{ {'clear-night': 'klar', 'cloudy': 'bewölkt', 'exceptional': 'außergewöhnlich',
            'fog': 'neblig', 'hail': 'hagelig', 'lightning': 'gewittrig',
            'lightning-rainy': 'gewittrig mit Regen', 'partlycloudy': 'teilweise bewölkt',
            'pouring': 'stark regnerisch', 'rainy': 'regnerisch', 'snowy': 'schneeig',
            'snowy-rainy': 'schneeregnerisch', 'sunny': 'sonnig', 'windy': 'windig',
            'windy-variant': 'windig'}.get(treffer.condition, treffer.condition) }}
      tag_text: "{{ 'Morgen' if trigger.slots.tag == 'morgen' else 'Heute' }}"
  - action: esphome.lumi_zeige_wetter   # Servicename ggf. abweichend, siehe unten
    data:
      zustand: "{{ treffer.condition }}"
      temperatur: "{{ treffer.temperature }}"
      einheit: "{{ state_attr(wetter_entity, 'temperature_unit') or '°C' }}"
  - set_conversation_response: >-
      {{ tag_text }} um {{ stunde_zahl }} Uhr ist es {{ zustand_text }} mit
      {{ treffer.temperature | round(0) | int }} Grad.
```

Ergibt z. B. "Morgen um 14 Uhr ist es bewölkt mit 24 Grad." Der Servicename
hängt vom kompilierten Gerätenamen ab (`esphome.<gerätename>_zeige_wetter`,
z. B. `esphome.lumi_a0d0a8_zeige_wetter`) — zu finden unter
*Entwicklerwerkzeuge → Dienste* (Suche nach "zeige_wetter"). Funktioniert
unabhängig vom gewählten Konversationsagenten, auch bei einem LLM wie Claude.

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

Alle Einstellungen überstehen einen Neustart. Symbolfarben sind fest in
`common-substitutions.yaml` hinterlegt — eine Änderung braucht einen Neubau
der Firmware.

## Automationen

Lumi braucht für den normalen Betrieb keine einzige Automation — wer aber
gezielt etwas auf dem Display oder über den Lautsprecher auslösen will, hat
mehrere Wege. Servicenamen hängen vom kompilierten Gerätenamen ab
(`esphome.<gerätename>_<aktion>`, z. B. `esphome.lumi_a0d0a8_zeige_hinweis`)
— zu finden unter *Entwicklerwerkzeuge → Dienste* bzw. *→ Entitäten*.

### Hinweis anzeigen (`zeige_hinweis`)

Zeigt für eine wählbare Dauer ein Icon mit Text in der Bildschirmmitte,
unabhängig davon, was das Gerät gerade tut — praktisch für alles, wovon die
Firmware selbst nichts wissen kann: eine Türklingel, ein Paket, ein
Leck-Sensor.

```yaml
alias: "Hinweis bei offener Haustür"
triggers:
  - trigger: state
    entity_id: binary_sensor.haustuer
    to: "on"
actions:
  - action: esphome.lumi_zeige_hinweis   # Servicename ggf. abweichend, siehe oben
    data:
      icon: "mdi:door-open"
      nachricht: "Haustür offen"
      sekunden: 15
```

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

### Ansage abspielen

Kein eigener Haken von Lumi, sondern die eingebaute Home-Assistant-Aktion
`assist_satellite.announce` — funktioniert auf jedem `assist_satellite`-Gerät
(auch Nabu Casas Voice PE) und spielt Text als Ansage ab, ohne Wake Word,
auch während das Gerät gerade lauscht:

```yaml
alias: "Ansage: Waschmaschine fertig"
triggers:
  - trigger: state
    entity_id: sensor.waschmaschine_status
    to: "fertig"
actions:
  - action: assist_satellite.announce
    target:
      entity_id: assist_satellite.lumi   # Entity-ID ggf. abweichend, siehe oben
    data:
      message: "Die Waschmaschine ist fertig."
```

`assist_satellite.ask_question` funktioniert genauso, erwartet danach aber
eine gesprochene Antwort — das Gerät zeigt dabei automatisch das
Fragezeichen-Icon. Beide Aktionen lassen sich mit `zeige_hinweis` in
derselben Automation kombinieren, etwa bei einer Video-Türklingel.

Umgekehrt melden sich Tipp und Doppeltipp auf den Bildschirm als Event
(`single_press`/`double_press`) bei Home Assistant, auswertbar in einer
eigenen Automation — siehe Entity **Displayberührung** unter
[Bedienung](#bedienung).

Ein dritter, umfangreicherer Weg — eine Vorhersage per Sprachbefehl abfragen
— steht unter [Wetter auf Nachfrage](#wetter-auf-nachfrage-optional).

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
