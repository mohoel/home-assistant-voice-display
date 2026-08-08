"""Erzeugt mockup.html: Standbild der Bedienseite zum Gestalten.

Die Seite entsteht im Betrieb erst zur Laufzeit - app.js baut ihr Markup aus den
Ereignissen des Geraets. Zum Gestalten braucht es aber etwas, das ohne Geraet
rendert, und dafuer schreibt dieses Skript dasselbe Markup mit Beispielwerten
und eingebettetem app.css in eine einzelne Datei.

Damit ist das Standbild eine *Ableitung*, kein zweiter Ort der Wahrheit: nach
jeder Aenderung an app.css oder app.js laeuft es neu. Was ein Entwurf am
Standbild aendert, wandert von Hand zurueck - Aussehen nach app.css, Struktur
nach app.js und dann auch hierher.

    python3 web/mockup.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSS = (ROOT / "web/app.css").read_text()

HEAD_COMMENT = """<!--
  STANDBILD der Bedienseite des Geräts, zum Gestalten.

  Dies ist kein Code fürs Gerät. Im Betrieb baut web/app.js das Markup zur
  Laufzeit aus den Ereignissen des Geräts auf; ohne Gerät ist die Seite leer,
  und ohne dieses Standbild gäbe es nichts zu gestalten. Hier steht dasselbe
  Markup mit Beispielwerten, das CSS aus web/app.css ist eingebettet.

  Erzeugt von web/mockup.py – von Hand geändert wird es nur zum
  Gestalten. Nach jeder Änderung an app.css oder app.js läuft das Skript neu,
  sonst läuft das Standbild vom Gerät weg.

  RÜCKWEG: Was hier geändert wird, wandert von Hand zurück – CSS nach
  web/app.css, Struktur nach web/app.js. Damit das ohne Ratespiel geht, sind
  die folgenden Namen ein Vertrag. Sie dürfen umbenannt werden, aber dann
  müssen beide Seiten mit:

    header .title-wrap h1 / .subtitle / .controls / .beat[.connected]
    main
    .tab-header
    .tab-container  >  i.corner.tl/.tr/.bl/.br        (derzeit display:none)
    .entity-row     >  .icon  .label  .value
    .icon           >  .chip                          (nur bei Farbzeilen)
    .select-wrap.select-wrap--tiles
                    >  button.preview.preview--option[data-value][.selected]
    .colorpicker    >  .color-swatches > button.color-swatch
                       input[type=color]
                       input.hex
    .footnote

  Drei Dinge, die das Gerät vorgibt und die kein Entwurf aufheben kann:

  1. Es gibt genau diese beiden Gruppen, und ihre Namen kommen aus
     packages/web.yaml (sorting_groups). Weitere Gruppen entstehen dort, nicht
     hier.
  2. Farben sind auf dem Gerät sechsstellige Hexwerte ohne Präfix. Der
     Farbwähler ist eine Zutat der Oberfläche, das Hexfeld ist die Wahrheit.
  3. Die Optionen der beiden Auswahlfelder stehen ebenfalls in web.yaml, und
     bei der Standby-Seite zählt ihre *Reihenfolge*: ui.yaml wertet den Index
     aus. Eine Kachel dazu heißt eine Option dazu, und die gehört ans Ende.

  Die Kacheln zeigen, was das Gerät wirklich anzeigt: die Standby-Seite
  „Zifferblatt" hat auf dem Gerät keine Zeiger, also hat sie hier auch keine.
-->"""

ORIENT_ICON = (
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"'
    ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path>'
    '<path d="M10 6h4"></path></svg>'
)
STANDBY_ICON = (
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"'
    ' stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"></path>'
    '<path d="M12 7v5l3 2"></path></svg>'
)

RING = ('<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor"'
        ' stroke-width="1"></circle>')


def tile_svg(value):
    body = RING
    if value.endswith("°"):
        angle = value[:-1]
        body += (f'<rect x="9" y="3" width="6" height="2" fill="currentColor"'
                 f' transform="rotate({angle} 12 12)"></rect>')
    elif value == "Zifferblatt":
        for i in range(12):
            body += (f'<line x1="12" y1="3.5" x2="12" y2="5.5" stroke="currentColor"'
                     f' stroke-width="1" transform="rotate({i * 30} 12 12)"></line>')
    else:
        body += '<rect x="6" y="9.5" width="12" height="3" fill="currentColor"></rect>'
        body += ('<rect x="8.5" y="14" width="7" height="1.5" fill="currentColor"'
                 ' opacity="0.5"></rect>')
    return f'<svg viewBox="0 0 24 24" width="28" height="28">{body}</svg>'


def tile(value, title, selected):
    cls = "preview preview--option selected" if selected else "preview preview--option"
    return (f'          <button class="{cls}" type="button" data-value="{value}"'
            f' title="{title}">{tile_svg(value)}<span>{value}</span></button>')


def select_row(icon, label, options, current, title):
    tiles = "\n".join(tile(o, title(o), o == current) for o in options)
    return f"""    <div class="entity-row">
      <div class="icon">{icon}</div>
      <div class="label">{label}</div>
      <div class="value">
        <div class="select-wrap select-wrap--tiles">
{tiles}
        </div>
      </div>
    </div>"""


PRESETS = ["ffffff", "ffd9a0", "5980a6", "e04c3f", "e8a13a", "3f9153", "3f7ab0", "8b4fc9"]

COLORS = [
    ("Zuhören", "03A9F4"),
    ("Verarbeitung", "FFB300"),
    ("Sprachausgabe", "7E57C2"),
    ("Fehler", "E53935"),
    ("Gedimmt", "6E6E6E"),
    ("Timer", "26A69A"),
    ("Bestätigung", "43A047"),
    ("Zifferblatt", "FFFFFF"),
]


def color_row(label, value):
    swatches = "\n".join(
        f'            <button class="color-swatch" type="button" title="{p.upper()}"'
        f' style="background: #{p};"></button>'
        for p in PRESETS
    )
    return f"""    <div class="entity-row">
      <div class="icon"><div class="chip" style="background: #{value};"></div></div>
      <div class="label">{label}</div>
      <div class="value">
        <div class="colorpicker">
          <div class="color-swatches">
{swatches}
          </div>
          <input type="color" value="#{value.lower()}">
          <input class="hex" type="text" maxlength="6" pattern="[0-9a-fA-F]{{6}}" spellcheck="false" value="{value}">
        </div>
      </div>
    </div>"""


CORNERS = ('    <i class="corner tl"></i><i class="corner tr"></i>'
           '<i class="corner bl"></i><i class="corner br"></i>')

display_rows = "\n\n".join([
    select_row(ORIENT_ICON, "Ausrichtung", ["0°", "90°", "180°", "270°"], "0°",
               lambda o: f"Ausrichtung {o}"),
    select_row(STANDBY_ICON, "Standby-Seite", ["Uhr", "Zifferblatt"], "Uhr",
               lambda o: f"Standby: {o}"),
])
color_rows = "\n".join(color_row(label, value) for label, value in COLORS)

html = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Assist-Satellit — Bedienseite</title>
{HEAD_COMMENT}
<style>
{CSS.strip()}
</style>
</head>
<body>

<header>
  <a class="logo" href="https://esphome.io/web-api" title="ESPHome">
    <svg viewBox="0 0 32 32" width="30" height="30"><path d="M1.3 18H5v10h21.8V18h3.7l-3.7-3.7V7.8h-2.4V12l-8.7-8.7L1.3 18Z" fill="currentColor"></path></svg>
  </a>
  <div class="title-wrap">
    <h1>assist-satellit</h1>
    <div class="subtitle">Voice Satellite · verbunden</div>
  </div>
  <div class="controls">
    <div class="beat connected"></div>
  </div>
</header>

<main>

  <div class="tab-header">Anzeige</div>
  <div class="tab-container">
{CORNERS}

{display_rows}

  </div>

  <div class="tab-header">Farben</div>
  <div class="tab-container">
{CORNERS}

{color_rows}

  </div>

  <div class="footnote">Helligkeit, Stummschaltung, Wake-Word-Optionen, Diagnose und Neustart stehen in Home Assistant.</div>

</main>

<!-- Das Standbild ist ohne Skript. Auf dem Gerät setzt app.js die Klasse
     .selected auf die angeklickte Kachel und schickt den Wert ans Gerät. -->
</body>
</html>
"""

out = ROOT / "web/mockup.html"
out.write_text(html)
print(f"{out}: {len(html)} Zeichen, {html.count('entity-row')} Zeilen, "
      f"{html.count('color-swatch')} Vorgabefelder, {html.count('preview--option')} Kacheln")
