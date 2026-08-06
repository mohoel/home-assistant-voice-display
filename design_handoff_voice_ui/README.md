# Handoff: Voice Assistant Display UI (466×466 round AMOLED)

## Overview
Visual reference for the 4 LVGL screens of the Assist Satellite firmware (`packages/ui.yaml`): Standby, Listening, Verarbeitung (thinking), Ausgeführt (replying). Built to match the existing `assist-satellit` ESPHome project 1:1.

## About the design file
`voice-ui-mockup.html` is an **HTML/CSS design reference**, not code to run on the device. The target implementation is LVGL/ESPHome YAML — pages, widgets and the `update_ui` script all live in `packages/ui.yaml`; recreate the look there using LVGL widgets, not by embedding HTML.

## Fidelity
High-fidelity for colors, typography, and layout — these values already match the project's YAML substitutions. The **glow/blur on the ring is an approximation**: LVGL has no native blur/drop-shadow filter, see "Known gap" below.

## Screens

### 1. Standby
- Full black background (`0x000000` — true pixel-off on AMOLED)
- Clock: "14:32" style, Figtree 700, ~108–120px, white, centered, slightly above center
- Date below: Figtree 600, ~24–26px, `#707070`
- Whole block appears dimmed via display brightness (~8%), not opacity
- Matches existing `page_standby` in `ui.yaml` (`lbl_clock`, `lbl_date`, pixel-shift interval already implemented)

### 2. Listening
- Track: full circle, stroke `#1A1A1A`, width 14px, 430×430 centered (18px margin in 466 canvas)
- Indicator: 70° arc, color `#03A9F4`, rotating clockwise, 1.4s per revolution
- Phase label: "Ich höre" (no trailing dots), Figtree 700, 34px, white, centered

### 3. Verarbeitung (thinking)
- Same ring construction, color `#FFC107`, 0.8s per revolution (faster)
- Phase label: "Einen Moment", Figtree 700, 34px, white
- Below it, transcript text (STT result) in Figtree 500, 22px, `#707070`

### 4. Ausgeführt (replying)
- Ring: full circle (not rotating), color `#4CAF50`, width 14px
- Transcript (grey, 22px) above the response
- Response text: Figtree 600, 30px, white, wrapped, centered

## Design tokens
| Token | Value |
|---|---|
| Background | `#000000` |
| Ring track | `#1A1A1A` |
| Listening | `#03A9F4` |
| Thinking | `#FFC107` |
| Replying | `#4CAF50` |
| Phase label | white, Figtree 700, 34px |
| Secondary/transcript text | `#707070`, Figtree 500, 22px |
| Response text | white, Figtree 600, 30px |
| Clock | white, Figtree 700, ~108–120px |
| Date | `#707070`, Figtree 600, 24–26px |
| Ring diameter / stroke | 430px / 14px, 18px margin in 466px canvas |
| Font | Figtree (500/600/700), `glyphsets: [GF_Latin_Core]` for ä/ö/ü/ß |

## Known gap: ring glow on real hardware
The mockup fakes the glow with a CSS `drop-shadow` filter, which LVGL does not have. Options were:
- Pre-render a soft glow ring as a PNG (per phase color) and place it as an `image` widget behind the arc, or
- Layer a second, larger, low-opacity arc behind the main one (partial approximation, no true blur), or
- Use an LVGL `canvas` widget and draw the arc with manual per-pixel alpha falloff.

**Implemented: the second option.** Each ring in `ui.yaml` has a `*_glow` twin — same colour, 26px instead of 14px, 40% opacity, bounding box 12px larger so the two strokes stay concentric. It reads as a soft edge, not as a true bloom; the falloff is a hard step rather than a gradient. If that is not close enough, the pre-rendered PNG route is the next step up.

## Files
- `voice-ui-mockup.html` — the design reference, open in any browser
