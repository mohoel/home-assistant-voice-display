# Wake Word „Hey Lumi“

Ein eigenes, deutsches Wake-Word-Modell für `micro_wake_word`. Es läuft
komplett auf dem Gerät, genau wie Okay Nabu, Hey Jarvis und Hey Mycroft.

| Datei | Inhalt |
|---|---|
| `hey_lumi.tflite` | das Modell (rund 135 KB) |
| `hey_lumi.json` | Manifest für ESPHome: Schwelle, Fenster, Speicherbedarf |

Eingebunden ist es in [`packages/voice.yaml`](../packages/voice.yaml), und
zwar bewusst als **letzter** Eintrag der Modellliste: ESPHome aktiviert ab
Werk nur den ersten Eintrag. Neue Geräte starten deshalb weiter mit
Okay Nabu, und auf bestehenden Geräten ändert sich nichts, bis jemand
„Hey Lumi“ in Home Assistant auswählt.

Die Empfindlichkeit folgt der Entity **Wake Word Sensitivity**: Low = 242,
Medium = 215, High = 176 (Wahrscheinlichkeit als Wert von 0 bis 255).
Empfohlen ist Low — die Erkennung war dort im Test genauso gut, die
höheren Stufen bringen nur mehr Fehlauslöser.

## Herkunft

Trainiert am 04./05.11.2026 mit
[`TaterTotterson/microWakeWord-Trainer-AppleSilicon`](https://github.com/TaterTotterson/microWakeWord-Trainer-AppleSilicon)
auf einem Mac. Der Trainer trägt seinen Namen als `author` ins Manifest ein;
das ist der Name des Werkzeugs, nicht des Modells.

- **Positivbeispiele:** 20.000 synthetisch erzeugte Clips „Hey Lumi“ aus
  Qwen3-TTS, OmniVoice und MOSS-TTS-Nano, Sprache Deutsch.
- **Negativbeispiele:** die vorberechneten Merkmale aus
  [`kahrendt/microwakeword`](https://huggingface.co/datasets/kahrendt/microwakeword)
  plus 2.048 erzeugte, ähnlich klingende Phrasen („Hey Luna“, „Hallo Lumi“ …).

## Wie gut es ist

Getestet auf einem Gerät, im Wesentlichen mit einer Stimme:

- Am Gerätemikrofon aufgenommen erkannte es „Hey Lumi“ 28 von 29 Mal und
  mit direkt angehängtem Befehl („Hey Lumi mach das Licht an“) 10 von 10 Mal,
  bei allen drei Empfindlichkeiten.
- Im Alltag (rund 82 Stunden, Fernseher lief) gab es 20 Aktivierungen:
  17 echte Befehle, ein klarer Fehlauslöser während eines Meetings und
  zwei ohne erkannten Text.

Schwach ist es bei fortlaufend gesprochenem Deutsch: In Gesprächen kann es
gelegentlich fälschlich auslösen. Dann hört Lumi einige Sekunden zu und
schickt das Gehörte an die eingestellte Assist-Pipeline — wie bei jeder
Aktivierung. Wer telefoniert oder in Meetings sitzt, schaltet Lumi dafür am
besten über **Microphone Muted** stumm.

## Lizenz

Das Modell steht **nicht** unter der MIT-Lizenz des übrigen Codes, sondern
unter [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) —
nicht-kommerzielle Nutzung mit Namensnennung.

Der Grund sind die Trainingsdaten: Die Negativmerkmale aus
`kahrendt/microwakeword` stehen unter CC BY-NC 4.0, die Gewichte von
OmniVoice unter CC-BY-NC. Ob ein trainiertes Modell rechtlich überhaupt als
Bearbeitung seiner Trainingsdaten gilt, ist nicht geklärt; die NC-Lizenz ist
die vorsichtige Wahl. Wer Lumi kommerziell einsetzen will, nutzt eines der
mitgelieferten Modelle von ESPHome (Apache 2.0) statt „Hey Lumi“.

> Hey Lumi wake word model © 2026 mohoel, lizenziert unter
> [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).
> Trainiert mit Negativmerkmalen aus
> [kahrendt/microwakeword](https://huggingface.co/datasets/kahrendt/microwakeword)
> (CC BY-NC 4.0) und synthetischer Sprache aus
> [k2-fsa/OmniVoice](https://huggingface.co/k2-fsa/OmniVoice) (CC-BY-NC),
> [Qwen3-TTS](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base)
> (Apache 2.0) und
> [MOSS-TTS-Nano](https://huggingface.co/OpenMOSS-Team/MOSS-TTS-Nano-100M).

Der Lizenzhinweis liegt zusätzlich in [`LICENSE.md`](LICENSE.md). Wer das
Modell austauscht, muss diesen Abschnitt mit austauschen.
