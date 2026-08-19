🇬🇧 English · [🇩🇪 Deutsch](README.de.md)

# Lumi 🎙️

**A Home Assistant Voice Satellite with a face.**

ESPHome firmware for the **Waveshare ESP32-S3-Touch-AMOLED-1.75**: a round
466×466 AMOLED with touchscreen and speaker. Instead of a blinking LED ring,
Lumi shows what's happening right on the display — listening, thinking,
replying — optionally with a small animated face.

<img width="4032" height="3024" alt="IMG_6913" src="https://github.com/user-attachments/assets/01953505-16d6-4f89-a1f1-64327d13944e" />

## Table of Contents

- [Getting to Know Lumi](#getting-to-know-lumi)
- [Features](#features)
  - [Voice Control](#voice-control)
  - [Status Display](#status-display)
  - [Standby Pages](#standby-pages)
  - [Timer](#timer)
  - [Display Behavior](#display-behavior)
  - [Firmware Updates](#firmware-updates)
- [Setup](#setup)
- [Usage](#usage)
- [Blueprints](#blueprints)
  - [Hint on Event](#hint-on-event)
  - [Announcement on Event](#announcement-on-event)
  - [Weather on Request (local)](#weather-on-request-local)
  - [Play Music (local)](#play-music-local)
  - [Free-Form Weather Questions (not local)](#free-form-weather-questions-not-local)
  - [Delayed Actions (not local)](#delayed-actions-not-local)
- [Background](#background)
- [License](#license)

## Getting to Know Lumi

Lumi wakes up on the wake word: a blue microphone icon breathes. While
thinking, three dots ripple in a wave, and a green equalizer kicks in for
the reply. When Lumi asks a follow-up question ("Welches Licht meinst du?"
— "Which light do you mean?"), a question mark appears instead of the
microphone — instantly clear whether the device is listening or waiting
for an answer.

Anyone who wants can give Lumi a face: two eyes and a mouth that look
around, blink, and occasionally stick out their tongue while idle — and
carry the same expression while listening, thinking, and replying. Anyone
who prefers it plain gets a large standby clock or a hand-less dial. While
a timer runs, a ring around the screen edge counts down the remaining
time, visible on every page.

Lumi is controlled entirely through Home Assistant — no web UI of its own,
no cloud, no app. The touchscreen knows exactly one gesture: tapping wakes
the display or cancels an ongoing voice interaction; a single tap and a
double tap can additionally be used as events for your own automations.
**Orientation**, **Standby Page**, **Wake Word Engine**, **Microphone
Muted**, and brightness are all ordinary Home Assistant entities (the
entity names themselves are English, independent of Home Assistant's
language setting — see [Usage](#usage)).

How a request is processed — fully local (Whisper, Piper) or via a
language model like Claude as the conversation agent — is decided entirely
by the [Assist pipeline](https://www.home-assistant.io/voice_control/) in
Home Assistant and needs no adjustment to the firmware.

I built this tool with Claude Code for my own use and my own needs. I'd be
glad if others enjoy it and put it to use. If someone with more coding
experience has notes, criticism, or additions, I'd love to hear them. Have
fun with Lumi!

## Features

### Voice Control
- Wake word locally (`micro_wake_word`) or via Home Assistant — switchable per entity, no restart needed
- Recognized text and response appear as text sensors in Home Assistant
- Always an acoustic confirmation: normally the spoken reply, a short tone for silently executed commands
- Follow-up questions show a question mark instead of the microphone
- Errors are visually distinguishable: not understood, Home Assistant unreachable, genuine error
- Tapping cancels an ongoing voice interaction
- No automation required — runs straight out of the firmware

### Status Display
- Every phase is one color-coded element in the center of the screen: breathing microphone (listening), wave of dots (processing), equalizer (reply), icon (error/muted/not ready)
- Measured values ("Wie warm ist es im Bad?" — "How warm is it in the bathroom?") appear as a large number with a unit, short confirmations ("Eingeschaltet" — "Turned on") as a checkmark — detected heuristically from the reply text, requires the built-in intent recognition (with an LLM conversation agent it stays at the equalizer)
- If the reply contains the German word „Nacht" ("night", e.g. from your own "Gute Nacht"/"Good Night" script), a sleepy cap appears on the Face page instead of the green checkmark — otherwise treated like any other confirmation. **This detection (the word „Nacht" as well as the German confirmation words „eingeschaltet"/„gestellt"/… and the German measurement units „Grad"/„Prozent"/…) only matches German words in the reply text** — it depends on the language of your own Assist pipeline, not on the display language of the entities. If your pipeline runs in English, measured values and confirmations stay at the equalizer, because the English reply text doesn't contain these German words. Bringing this heuristic up to English replies is a separate, larger piece of work not covered by this release — see [Background](#background) if you want to help.

### Standby Pages
Three views, switchable via a select entity, takes effect immediately:

- **Clock** — time of day with date
- **Dial** — ring of tick marks without hands, hour and minute highlighted in color
- **Face** — idly wandering eyes, thirteen random quirks

If **Face** is selected, it also takes over listening, processing, and
replying (eyes focus, mouth moves, color changes per phase); with
**Clock** and **Dial** it stays with the microphone, dots, and bars.

### Timer
- Ring around the screen edge, visible on every page — in standby, the countdown takes the clock's place
- Overrides the selected standby page while it runs; during a voice interaction it stays with **Face**
- Rings at the end and shows a bell; tapping stops both
- Cancel by voice ("Timer abbrechen" — "Cancel timer") — no control on the device itself

### Display Behavior
- Standby means off: after a configurable time without a touch, the screen switches off completely
- Full brightness only while listening (100% instead of **Standby Brightness**) — the jump itself is the signal
- Single and double tap trigger an event in Home Assistant
- Orientation, standby page, mute, wake word, and brightness as entities

### Firmware Updates
Appear under *Settings → Devices → Updates* like with any other Home
Assistant integration — one click installs, no computer needed. Wi-Fi
stays intact, because it was never part of the firmware image.

## Setup

### 1. Flash the Firmware

Flashing happens right in the browser, no terminal required:
[mohoel.github.io/home-assistant-voice-display](https://mohoel.github.io/home-assistant-voice-display/)
via [ESP Web Tools](https://esphome.github.io/esp-web-tools/) over Web
Serial in Chrome/Edge — connect the board via USB, click the button, done.

Right afterward, [Improv Wi-Fi](https://www.improv-wifi.com/) asks for your
Wi-Fi over the same USB connection. If that's skipped, the device instead
opens a hotspot with a captive portal for entering the credentials. These
end up in the device's own flash storage, not in the firmware image, and
therefore survive every later update.

If the board doesn't show up: hold **BOOT**, briefly press **RESET**,
release **BOOT** (download mode).

### 2. Add to Home Assistant

The device announces itself via mDNS as `lumi` and shows up under
*Settings → Devices & Services* as an ESPHome device. When adding it, Home
Assistant asks for an encryption key — a fixed, non-secret placeholder
(also shown on the flashing page in the "After Flashing" accordion), enter
it by hand:

```
Bw1nT2P6zfBP++xn1gTvfloJweHwPrXXRj0I01RdKZk=
```

Afterward, assign an Assist pipeline with STT/TTS in your language under
*Settings → Voice assistants*.

### 3. Updates

From here on, Home Assistant is all you need: new firmware versions appear
under *Settings → Devices → Updates* with an "Install" button, the device
downloads it itself and restarts — no computer needed anymore.

## Usage

Lumi is controlled entirely through Home Assistant. The touchscreen knows
exactly one gesture: tapping wakes the display or cancels an ongoing voice
interaction.

| Entity (name in Home Assistant) | Effect |
|---|---|
| **Orientation** | Rotates the image in 90-degree steps (0/90/180/270), touch coordinates rotate along with it. |
| **Standby Page** | Clock, Dial, or Face. While a timer runs, standby shows the countdown regardless of this setting. |
| **Standby Timeout** | How long the screen stays on after the last touch before it turns off (seconds, 5–300). |
| **Standby Brightness** | Brightness of Clock, Dial, Face, processing, reply, etc. — everything except listening, which stays fixed at 100% (percent, 10–100). |
| **Display** | Brightness; turning it on from HA wakes the screen for the standby timeout. |
| **Microphone Muted**, **Wake Word Engine**, **Wake Word Sensitivity** | Voice operation. |
| **Recognized Text**, **Response** | Question and answer of the last interaction. |
| **Display Touch** (event) | `single_press` on a tap, `double_press` on a double tap — only while idle; during a voice interaction, tapping cancels instead. |

All settings survive a restart.

## Blueprints

Lumi needs no automation at all for normal operation — but anyone who
wants to trigger something specific on the display or through the
speaker, or add weather/timer functions by voice, finds every ready-made
blueprint for that in one place, in the
[`blueprints/`](blueprints/) folder: import, fill in the inputs, done,
instead of writing your own YAML. Service names of Lumi's own actions
depend on the compiled device name (`esphome.<device-name>_<action>`, e.g.
`esphome.lumi_a0d0a8_zeige_hinweis`).

Each blueprint below comes in **two language versions**: a German one
(with German trigger sentences, for a German-language Assist pipeline) and
an English one (with English trigger sentences, for an English-language
pipeline) — pick the import badge matching your own pipeline's language,
not the language you're reading this in.

### Hint on Event

Shows an icon with text in the center of the screen for a chosen duration,
regardless of what the device is currently doing — useful for anything the
firmware itself can't know about: a doorbell, a package, a leak sensor.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fhinweis_bei_ereignis.yaml)

🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fhinweis_bei_ereignis.yaml)

Import it, create an automation from it, and pick the triggering entity
and target state (e.g. `binary_sensor.front_door` → `on`). As the **Hint
Action**, look up your own `zeige_hinweis` action (service name depends on
the compiled device name, e.g. `esphome.lumi_a0d0a8_zeige_hinweis`) and
fill in icon, text, and duration, e.g. `icon: mdi:door-open`, `nachricht:
Front door open`, `sekunden: 15`.

`icon` understands real `mdi:` names just like Home Assistant's icon
picker, but only a fixed, embedded selection. A name that isn't listed
shows only the text, no icon:

| mdi name | Meaning |
|---|---|
| `mdi:bell` | Bell |
| `mdi:door`, `mdi:door-open` | Door closed, door open |
| `mdi:motion-sensor` | Motion detected |
| `mdi:water`, `mdi:water-alert` | Water, leak/water alarm |
| `mdi:fire` | Fire |
| `mdi:thermometer` | Temperature |
| `mdi:package-variant` | Package |
| `mdi:lock`, `mdi:lock-open` | Lock closed, lock open |
| `mdi:battery-alert` | Battery low |
| `mdi:email` | Mail |
| `mdi:alert`, `mdi:alert-circle` | Warning |
| `mdi:wifi-off` | Connection lost |
| `mdi:help` | Question |
| `mdi:check` | Done |
| `mdi:microphone`, `mdi:microphone-off` | Microphone on, microphone off |

If an icon is missing, it can be added (details in
[`packages/ui.yaml`](packages/ui.yaml), font `font_hint_icon`) — but that
requires rebuilding the firmware.

### Announcement on Event

Not a feature of Lumi's own, but the built-in Home Assistant action
`assist_satellite.announce` — works on any `assist_satellite` device
(including Nabu Casa's Voice PE) and plays text as an announcement,
without a wake word, even while the device is currently listening.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fansage_bei_ereignis.yaml)

🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fansage_bei_ereignis.yaml)

Import it, create an automation from it, and pick the triggering entity,
target state, the Assist Satellite device (e.g. Lumi), and the text — for
example `sensor.washing_machine_status` → `done`, "The washing machine is
done."

The blueprint also has an "Ask as a follow-up question" option: uses
`ask_question` instead of `announce`, then expects a spoken reply and
automatically shows the question-mark icon while waiting. The optional
extra action can, for example, be combined with `zeige_hinweis` — for a
video doorbell.

Conversely, a single tap and a double tap on the screen report themselves
as an event (`single_press`/`double_press`) to Home Assistant, usable in
your own automation — see the **Display Touch** entity under
[Usage](#usage).

### Weather on Request (local)

Answers specific weather questions ("Wie wird das Wetter morgen um 14
Uhr?" — "What will the weather be like tomorrow at 2 pm?") with an icon
and temperature on the display. Unlike the rest of the firmware, this
needs a one-time automation in Home Assistant, because otherwise the
firmware never learns more than the spoken reply text.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fwetter_auf_nachfrage.yaml)

🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fwetter_auf_nachfrage.yaml)

Import it, create an automation from it, and pick your own `weather.*`
entity (domain `weather`). As the optional **Weather Action**, look up
your own `zeige_wetter` action of the device in the automation's action
editor and fill in these three templates. The service name depends on the
compiled device name (`esphome.<device-name>_zeige_wetter`, e.g.
`esphome.lumi_a0d0a8_zeige_wetter`).

```
zustand: {{ zustand }}
temperatur: {{ temperatur }}
einheit: {{ einheit }}
```

Produces e.g. "Morgen um 14 Uhr ist es bewölkt mit 24 Grad." ("Tomorrow at
2 pm it's cloudy with 24 degrees.") Works independently of the chosen
conversation agent, including with an LLM like Claude.

### Play Music (local)

Forwards a spoken music request directly to a
[Music Assistant](https://www.music-assistant.io/) player — Lumi itself
plays nothing, the target device is named in the sentence. Requires a
configured Music Assistant integration with at least one player; works
with the built-in local intent recognition just as well as with an LLM as
the conversation agent, because the Assist pipeline's sentence trigger
runs ahead of it. The automation must be exposed to the voice assistant.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fmusik_abspielen.yaml)

🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Flumi%2Fen%2Fmusik_abspielen.yaml)

Import it, create an automation from it — no further inputs needed. If the
sentence names no room or device, the Music Assistant player in the area
of the addressed Assist device plays automatically, i.e. the same room
the voice command was spoken in. If there's no Music Assistant player
there, the command fails with a spoken error message instead — a
different room is only reached if it's named in the sentence. Six media
types are recognized, each introduced with "Play"/"Listen to"/"Put on":

| Media type | Example sentence (German) | Example sentence (English, with the [English blueprint](#blueprints)) |
|---|---|---|
| Artist/band/group | "Spiele den Künstler Herbert Grönemeyer im Wohnzimmer" | "Play the artist Herbert Grönemeyer in the living room" |
| Song/track | "Spiele den Titel Bochum im Schlafzimmer" | "Play the song Bochum in the bedroom" |
| Album | "Höre das Album Mensch vom Künstler Herbert Grönemeyer in der Küche" | "Play the album Mensch by the artist Herbert Grönemeyer in the kitchen" |
| Playlist | "Höre die Playlist Fokus Musik auf dem Sonos" | "Play the playlist Focus Music on the Sonos" |
| Podcast | "Spiele den Podcast Baywatch Berlin" | "Play the podcast Baywatch Berlin" |
| Radio station | "Höre das Radio Deutschlandfunk in der Küche" | "Play the radio station Deutschlandfunk in the kitchen" |

For song and album, an artist can additionally be named — literally with
the word "artist"/"band"/"group", otherwise the name ends up as part of
the title/album name, which Music Assistant usually still finds, just
less precisely. The optional target room or device at the end of the
sentence is first checked against the names of all Music Assistant
players, then against area names; without a match, the area of the
addressed Assist device counts — if there's no Music Assistant player
there, the command fails with a spoken error message, there's no further
fallback player.

Before playing anything, the blueprint itself searches with
`music_assistant.search` for a unique matching URI (25 candidates,
preferring an exact name match), instead of relying on `play_media`'s
built-in name resolution, which is limited to 8 candidates — for radio
stations with many similarly named entries (e.g. via Radio Browser) that
was otherwise often unsuccessful. If this search also finds nothing, the
raw spoken name is used as a fallback, as before.

For freely phrased music requests without a fixed sentence pattern ("Spiel
mal was zum Entspannen" — "Play something relaxing"), this blueprint isn't
enough — an LLM tool script along the lines of "Free-Form Weather
Questions" below doesn't exist for this yet.

**Pause, resume, next track, and volume already work without this
blueprint** — those are built-in local Home Assistant intents
(`HassMediaPause`, `HassMediaUnpause`, `HassMediaNext`, `HassMediaPrevious`,
`HassSetVolume`/`HassSetVolumeRelative`), not Lumi-specific logic.
Sentences like "Pause", "Weiter", "Nächster Titel" or "Lauter"/"Leiser um
20 Prozent" (English: "Pause", "Resume", "Next track", "Louder"/"Lower the
volume by 20 percent") without a name or room automatically target the
area of the addressed Assist device — for Lumi, the room it's standing in
— exactly like with lights. If there are multiple `media_player` entities
in that area (e.g. an additional TV), it becomes ambiguous; a name or room
in the sentence helps then ("Pause auf dem Sonos", "Lauter im
Wohnzimmer"). This works regardless of the chosen conversation agent and
isn't part of this blueprint — it already works, no import required.

### Free-Form Weather Questions (not local)

Answers open-ended questions without a fixed sentence pattern, e.g. "Wird
es morgen regnen?" ("Will it rain tomorrow?") or "Wie wird das Wetter
übermorgen?" ("What will the weather be like the day after tomorrow?").
Needs an AI/LLM pipeline as the conversation agent — this doesn't work
with the built-in local intent recognition.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Ffreie_wetterfragen.yaml)

🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fen%2Ffreie_wetterfragen.yaml)

Import it, create a script from it, and pick your own `weather.*` entity
— as with "Weather on Request" above, optionally also your own
`zeige_wetter` action with the same three templates. Afterward, expose the
script to voice assistants.

### Delayed Actions (not local)

Executes an action after a delay, e.g. "Schalte das Licht in 5 Minuten
aus" ("Turn off the light in 5 minutes"), "Schließe das Rollo in 10
Minuten" ("Close the blinds in 10 minutes"), or "Fahr das Rollo in 20
Minuten auf 30 Prozent" ("Set the blinds to 30 percent in 20 minutes"). As
with the free-form weather questions, the conversation agent calls the
script as a tool, no sentence trigger needed — this requires an AI/LLM
pipeline, the built-in local intent recognition can't call tools with
free-text parameters. Unlike the weather feature, this isn't a
Lumi-specific feature: it doesn't trigger any display action on the device
and works with any Assist-capable input path (Lumi, the app, other
satellites, …) and with any of your own entities — the name of a device is
enough, no `entity_id` needs to be entered by hand.

Set up two script blueprints, in this order:

**1. Delayed Action**
— the counterpart that actually does something after the wait. Resolves
device names to real `entity_id`s only right before waiting, and reports
devices that can't be uniquely matched immediately via
`persistent_notification`, instead of silently failing only once the wait
is over. Stays internal, isn't exposed to Assist.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fverzoegerte_aktion.yaml)

🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fen%2Fverzoegerte_aktion.yaml)

**2. Start Timed Action**
— the tool that gets exposed to Assist. Starts script 1 in the background
and doesn't wait for it to finish, so Assist can reply immediately. When
setting it up, pick the script instance created from script 1 as the
input.

🇩🇪 [![Blueprint importieren](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Ftimer_aktion_starten.yaml)

🇬🇧 [![Import Blueprint](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2Fmohoel%2Fhome-assistant-voice-display%2Fblob%2Fmain%2Fblueprints%2Fscript%2Flumi%2Fen%2Ftimer_aktion_starten.yaml)

Afterward, expose only script 2 to Assist; script 1 stays internal. The
reason for the name resolution living in script 1: the conversation agent
only receives a device's name, domain, and area, never the actual
`entity_id` — a guessed ID fails reliably (Home Assistant only logs that
as a silent `WARNING`, the call itself still reports success).

## Background

Lumi is **not a fork** of Nabu Casa's official firmware, but an
independent build for different hardware (round AMOLED instead of an LED
ring or rectangular display). Only the *pattern* of how wake word, voice
sessions, and timers are modeled as ESPHome scripts is carried over,
following:

- [`esphome/home-assistant-voice-pe`](https://github.com/esphome/home-assistant-voice-pe) — Nabu Casa's Home Assistant Voice Preview Edition
- [`esphome/wake-word-voice-assistants`](https://github.com/esphome/wake-word-voice-assistants) — reference configuration for the ESP32-S3-Box-3

Since `lumi.yaml` doesn't pull in any external package dependency, only
local files from this repo, changes to the official repos don't
automatically land here.

## License

The code is under the [MIT license](LICENSE). The embedded sounds in
`sounds/` have their own license (CC BY 4.0) — see
[`sounds/README.md`](sounds/README.md).
