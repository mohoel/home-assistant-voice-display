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
- **Updates laufen ebenfalls über Home Assistant.** Neue Firmware-Versionen
  erscheinen dort im Update-Dashboard und werden mit einem Klick installiert —
  kein Rechner, kein Terminal, kein erneutes Flashen per USB.
- **Farben und Timings sind Compile-Zeit-Werte.** Es gibt keine
  Laufzeit-Einstellung dafür — wer die Optik ändern will, ändert die
  Substitutions in `common-substitutions.yaml` und baut neu.

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
`lumi.yaml` bindet über `packages:` ausschließlich lokale Dateien aus diesem
Repo ein, keine externe Paket-Abhängigkeit — wer Änderungen von dort
übernehmen will, muss sie von Hand nachbauen. Bei neuen
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
  und gelegentlich die Zunge herausstrecken. Dreizehn verschiedene Marotten
  (darunter Grinsen und Lachen) wechseln sich zufällig ab, jede genau einmal,
  bevor sich der Zyklus wiederholt

**Das Gesicht ist mehr als eine Standby-Seite.** Ist es gewählt, übernimmt es
auch Zuhören, Verarbeiten und Antworten: die Augen richten sich auf, blicken
beim Nachdenken schräg nach oben, und beim Sprechen bewegt sich der Mund. Beim
Zuhören und beim Verarbeiten färben sich Augen und Mund selbst um — blau beim
Zuhören, orange beim Verarbeiten. Die Bewegung läuft dabei durch, bei jedem
Phasenwechsel biegen die Augen ab, statt zu springen. Bei Uhr und Zifferblatt
bleibt es unverändert bei Mikrofon, Punkten und Balken.

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

### Firmware-Updates
Aktualisiert wird genau wie bei jeder anderen Home-Assistant-Integration:
unter Einstellungen → Geräte → Updates erscheint ein „Firmware"-Eintrag mit
„Installieren"-Knopf, sobald eine neuere Version veröffentlicht ist. Ein
Klick genügt — das Gerät lädt sich die neue Firmware selbst herunter und
startet neu, ohne Rechner und ohne ESPHome-Kenntnisse. Möglich ist das, weil
die Firmware nie WLAN-Zugangsdaten einkompiliert hat (siehe *Einrichtung*) —
im heruntergeladenen Image steckt also kein Geheimnis, das dabei verloren
gehen könnte; das WLAN liegt getrennt davon im Flash-Speicher des Geräts und
überlebt jedes Update. Es gibt dafür kein Bedienelement am Gerät selbst,
alles läuft über Home Assistants eigenes Update-Dashboard.

### Wetter auf Nachfrage (optional)

Home Assistant kann gezielte Wetterfragen ("Wie wird das Wetter morgen um
14 Uhr?") beantworten und dazu auf dem Gerät ein passendes Icon plus die
Temperatur anzeigen — genau wie eine gewöhnliche Messwertanzeige: sie
erscheint mit der gesprochenen Antwort und bleibt danach die eingestellte
Standzeit stehen. Sieben vereinfachte Icon-Zustände decken alle vierzehn
Home-Assistant-Wetterzustände ab (sonnig, klar-nacht, bewölkt, regnerisch,
gewittrig, schneeig, windig); unbekannte oder künftige Zustände fallen auf
"bewölkt" zurück.

Anders als der Rest dieser Firmware kommt diese Funktion **nicht** ohne eine
einmalige Einrichtung in Home Assistant aus — die sonst geltende Regel "keine
Automation nötig" gilt hier bewusst nicht. Der Grund ist derselbe wie beim
optionalen Haken `zeige_hinweis` (siehe [`packages/core.yaml`](packages/core.yaml)):
ohne einen eigenen Intent, der die Vorhersage per `weather.get_forecasts`
abruft und ans Gerät zurückschickt, hat die Firmware keinen Weg an
Wetterdaten heranzukommen — sie erfährt sonst nie mehr als den gesprochenen
Antworttext (siehe oben, *"Das Gerät weiß nie, was ein Befehl bewirkt hat"*).
Wer die Funktion nicht braucht, lässt die beiden Blöcke unten einfach weg —
am übrigen Betrieb ändert sich nichts.

Einzurichten sind zwei Dinge: ein Skript, das die Vorhersage holt und die
Custom Action `zeige_wetter` aufruft, und ein Satzauslöser, der das Skript
mit Tag und Stunde aus dem gesprochenen Satz füttert. In der Skript-Variable
`wetter_entity` unten die eigene `weather.*`-Entity eintragen (Einstellungen
→ Geräte & Dienste → Entitäten, Domain `weather`) — das ist zugleich der Weg,
wie man in Home Assistant eine Wetter-Entität für diese Funktion auswählt,
ein zusätzlicher Helfer ist dafür nicht nötig.

Einzufügen unter *Einstellungen → Automationen & Szenen → Skripte*, im
YAML-Modus (Drei-Punkte-Menü → "In YAML bearbeiten"):

```yaml
alias: "Wetter auf Nachfrage"
fields:
  tag:
    description: "Erkannter Tag ('heute', 'morgen', ...)"
    example: "morgen"
  stunde:
    description: "Erkannte Stunde (0-23)"
    example: 14
variables:
  wetter_entity: weather.home   # <-- hier die eigene weather.*-Entity eintragen
sequence:
  - action: weather.get_forecasts
    target:
      entity_id: "{{ wetter_entity }}"
    data:
      type: hourly
    response_variable: vorhersage
  - variables:
      eintraege: "{{ vorhersage[wetter_entity].forecast }}"
      ziel_tag: >-
        {{ (now() + timedelta(days=1)).strftime('%Y-%m-%d') if tag == 'morgen'
           else now().strftime('%Y-%m-%d') }}
      treffer: >-
        {{ (eintraege | selectattr('datetime', 'match',
             '^' + ziel_tag + 'T' + '%02d' | format(stunde | int)) | list
             | first) or eintraege[0] }}
  - action: esphome.lumi_zeige_wetter   # Servicename ggf. abweichend, siehe unten
    data:
      zustand: "{{ treffer.condition }}"
      temperatur: "{{ treffer.temperature }}"
      einheit: "{{ state_attr(wetter_entity, 'temperature_unit') or '°C' }}"
  - set_conversation_response: >-
      {{ treffer.temperature }} Grad und {{ treffer.condition }},
      {{ tag }} um {{ stunde }} Uhr.
```

Einzufügen unter *Einstellungen → Automationen & Szenen → Automationen*,
ebenfalls im YAML-Modus, als neue Automation:

```yaml
alias: "Wetter auf Nachfrage - Satzauslöser"
triggers:
  - trigger: conversation
    command:
      - "wie wird das wetter [am] {tag} um {stunde} uhr"
      - "wie ist das wetter [am] {tag} um {stunde} uhr"
      - "wetter {tag} um {stunde} uhr"
actions:
  - action: script.wetter_auf_nachfrage
    data:
      tag: "{{ trigger.slots.tag }}"
      stunde: "{{ trigger.slots.stunde }}"
```

Der Servicename der Custom Action hängt vom kompilierten Gerätenamen ab
(`esphome.<gerätename>_zeige_wetter`) und weicht durch `name_add_mac_suffix`
(siehe [CLAUDE.md](CLAUDE.md)) pro physischem Gerät leicht ab, z. B.
`esphome.lumi_a0d0a8_zeige_wetter` statt `esphome.lumi_zeige_wetter`. Den
tatsächlichen Namen findet man in Home Assistant unter *Entwicklerwerkzeuge
→ Dienste* (Suche nach "zeige_wetter").

## Einbindung in Automationen

Lumi braucht für den normalen Betrieb keine einzige Automation (siehe
*Konzept* oben) — wer aber gezielt etwas auf dem Display oder über den
Lautsprecher auslösen will, hat von Home Assistant aus mehrere Wege. Wie beim
Wetter-Beispiel oben gilt für alle Servicenamen: sie hängen vom kompilierten
Gerätenamen ab (`esphome.<gerätename>_<aktion>`) und weichen durch
`name_add_mac_suffix` pro physischem Gerät leicht ab, z. B.
`esphome.lumi_a0d0a8_zeige_hinweis` statt `esphome.lumi_zeige_hinweis`. Den
tatsächlichen Namen findet man in Home Assistant unter *Entwicklerwerkzeuge →
Dienste* bzw. *→ Entitäten*.

### Hinweis anzeigen (`zeige_hinweis`)

Zeigt für eine wählbare Dauer ein Icon mit Text in der Bildschirmmitte —
unabhängig davon, was das Gerät gerade tut. Praktisch für alles, wovon die
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

`icon` versteht echte `mdi:`-Namen wie im Home-Assistant-Icon-Picker — aber
nur eine feste, in die Firmware eingebettete Auswahl. Ein nicht gelisteter
Name zeigt nur den Text, kein Icon:

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

Die sieben ursprünglichen deutschen Namen (`mikrofon`, `stumm`, `warnung`,
`offline`, `frage`, `haken`, `glocke`) funktionieren weiterhin und zeigen
dieselben Icons wie ihr mdi-Gegenstück in der Tabelle. Fehlt ein Icon: es
lässt sich ergänzen (Details in [`packages/ui.yaml`](packages/ui.yaml), Font
`font_hint_icon`) — kostet aber einen Neubau der Firmware.

### Ansage abspielen (`assist_satellite.announce` / `ask_question`)

Kein eigener Haken von Lumi, sondern eine eingebaute Home-Assistant-Aktion,
die auf jedem `assist_satellite`-Gerät funktioniert (auch auf Nabu Casas
Voice PE). Sie spielt einen beliebigen Text als gesprochene Ansage über den
Lautsprecher ab — ohne Wake Word, auch während das Gerät gerade lauscht:

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
Fragezeichen-Icon, ganz ohne eigenes Zutun der Automation (siehe
*Sprachsteuerung* oben, „Rückfrage").

### Wetter auf Nachfrage

Ein dritter, umfangreicherer Weg — eine Vorhersage für einen bestimmten Tag
per Sprachbefehl abfragen — steht weiter unten in einem eigenen Abschnitt:
[*Wetter auf Nachfrage*](#wetter-auf-nachfrage-optional).

## Einrichtung

### 1. Firmware flashen

Geflasht wird im Browser — kein `esphome`, kein Terminal, keine Installation:
[mohoel.github.io/home-assistant-voice-lumi](https://mohoel.github.io/home-assistant-voice-lumi/)
flasht per [ESP Web Tools](https://esphome.github.io/esp-web-tools/) über Web
Serial in Chrome/Edge — Board per USB anschließen, Button klicken, fertig.
Gebaut wird die Firmware automatisch bei jedem Git-Tag durch
[`.github/workflows/release.yml`](.github/workflows/release.yml).

Direkt im Anschluss fragt ESP Web Tools per
[Improv Wi-Fi](https://www.improv-wifi.com/) über dieselbe USB-Verbindung nach
dem eigenen WLAN — kein Hotspot, kein Captive Portal, kein Gerätewechsel
nötig. Wird dieser Schritt übersprungen, öffnet das Gerät ersatzweise einen
Fallback-Hotspot mit Captive Portal zum Eintragen der Zugangsdaten. Die
Zugangsdaten landen dabei im Flash-Speicher des Geräts, nicht im
Firmware-Image — deshalb überstehen sie jedes spätere Update.

Meldet sich das Board nicht, hilft der Download-Modus: **BOOT** halten,
**RESET** kurz drücken, **BOOT** loslassen.

### 2. In Home Assistant einbinden

Das Gerät meldet sich per mDNS als `lumi`. Unter *Einstellungen → Geräte &
Dienste* taucht es als ESPHome-Gerät auf. Beim Hinzufügen fragt Home
Assistant nach einem Verschlüsselungscode — das ist ein fester, nicht
geheimer Platzhalter aus [`secrets.public.yaml`](secrets.public.yaml), der
auch auf der Flash-Seite selbst im Akkordeon „Nach dem Flashen" steht:

```
Bw1nT2P6zfBP++xn1gTvfloJweHwPrXXRj0I01RdKZk=
```

Home Assistant schlägt den Code nicht automatisch vor — einfach von Hand
eintragen.

Danach unter *Einstellungen → Sprachassistenten* eine Assist-Pipeline mit
deutschem STT/TTS zuweisen.

### 3. Updates kommen über Home Assistant

Ab hier braucht es weder diese Seite noch einen Rechner: Sobald eine neue
Firmware-Version veröffentlicht ist, erscheint sie unter *Einstellungen →
Geräte → Updates* als „Firmware"-Eintrag mit „Installieren"-Knopf — genau wie
bei jeder anderen Home-Assistant-Integration. Das Gerät lädt sich die neue
Version selbst herunter und startet neu; das eingetragene WLAN bleibt dabei
erhalten. Details siehe *Firmware-Updates* oben.

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
| **Standby-Zeit** | Wie lange der Bildschirm nach der letzten Berührung anbleibt, bevor er ganz ausgeht (Sekunden, 5–300). |
| **Standby-Helligkeit** | Helligkeit von Uhr, Zifferblatt, Gesicht, Verarbeitung, Antwort usw. — alles außer dem Zuhören, das fest auf 100 % läuft (Prozent, 10–100). |
| **Display** | Helligkeit; Einschalten aus HA weckt den Bildschirm für die Standby-Zeit. |
| **Mikrofon stumm**, **Wake-Word-Engine**, **Wake-Word-Empfindlichkeit** | Sprachbetrieb. |
| **Erkannter Text**, **Antwort** | Frage und Antwort des letzten Vorgangs. |
| **Displayberührung** (Event) | `single_press` bei einem Tipp, `double_press` bei einem Doppeltipp — nur im Wartezustand, während eines Sprachvorgangs bricht Tippen stattdessen ab. |

Alle Einstellungen überstehen einen Neustart. Die Symbolfarben sind fest in
`common-substitutions.yaml` hinterlegt — eine Änderung braucht einen Neubau
der Firmware.

## Lizenz

Der Code steht unter der [MIT-Lizenz](LICENSE). Die eingebetteten Klänge in
`sounds/` haben eine eigene Lizenz (CC BY 4.0) — siehe
[`sounds/README.md`](sounds/README.md).
