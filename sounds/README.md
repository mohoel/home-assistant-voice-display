# Töne

Zwei Klänge, die als FLAC direkt in die Firmware eingebettet werden
(`files:` am Media Player in [`packages/hardware.yaml`](../packages/hardware.yaml)).
Sie liegen bewusst im Repo und werden nicht beim Bauen heruntergeladen — so
lässt sich die Firmware auch ohne Internetzugang und ohne fremde URL bauen.

| Datei | Wofür | Länge |
|---|---|---|
| `timer_finished.flac` | Klingeln, wenn ein Timer abläuft; wird bis zum Abbrechen wiederholt | 2,73 s |
| `center_button_press.flac` | kurze Bestätigung, wenn Home Assistant einen Befehl ohne gesprochene Antwort ausführt | 1,37 s |

Beide sind 48 kHz, mono, 16 Bit — genau das Format der `announcement_pipeline`,
es wird also nichts umgerechnet.

## Herkunft und Lizenz

Übernommen aus [`esphome/home-assistant-voice-pe`](https://github.com/esphome/home-assistant-voice-pe/tree/dev/sounds).

> Home Assistant Voice Preview Edition Sounds © 2024 by
> [Clayton Charles Tapp](https://www.cctaudio.com/), lizenziert unter
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

Der Lizenztext liegt unverändert in [`LICENSE.md`](LICENSE.md). Wer die Töne
austauscht, muss diese Zeilen mit austauschen — und darauf achten, dass die
neuen Dateien wieder 48 kHz mono sind, sonst resampelt das Gerät zur Laufzeit.
