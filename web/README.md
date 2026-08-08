# Weboberfläche

`app.js` und `app.css` sind die Bedienseite unter
<http://assist-satellit.local/>. Sie ist **eigener Code** und ersetzt das
ESPHome-Standard-Frontend vollständig.

Der Entwurf stammt aus dem Claude-Design-Projekt „Konfigurationsseite"
(`uploads/file-1786186211037-nedf.html`).

## Wie die Seite eingehängt ist

ESPHome baut die Index-Seite selbst und legt sie als

```html
<link rel=stylesheet href=/0.css><script type=module src=/0.js></script>
<esp-app></esp-app>
```

ab (`build_index_html` in `components/web_server/__init__.py`). `/0.css` und
`/0.js` sind genau die beiden Dateien hier, eingebunden über `css_include` und
`js_include` in `packages/web.yaml`. Lädt man das Standard-Bundle nicht, bleibt
`<esp-app>` ein undefiniertes, leeres Element — `app.js` baut die Seite an
seiner Stelle auf.

Drei Dinge sind dabei nicht offensichtlich:

- **`local: true` muss weg.** Damit liefert das Gerät für `/` das eingebaute
  Standard-Frontend aus (`web_server.cpp:431`) und ignoriert die generierte
  Index-Seite — `/0.js` würde nie geladen.
- **`js_url: ""`** unterdrückt die Voreinstellung
  `https://oi.esphome.io/v3/www.js`, sonst lädt das Standard-Bundle zusätzlich
  nach und definiert `<esp-app>` doch noch.
- Die Pfade sind relativ zu `assist-satellit.yaml`, nicht zu dieser Datei —
  `CORE.relative_config_path` löst immer gegen das Konfigurationsverzeichnis
  auf.

## Warum nicht das Standard-Frontend umstylen

Weil es nicht geht. Alle Stile des Standard-Frontends stecken im Shadow DOM
seiner lit-Komponenten, und als Variable ist genau **eine** Eigenschaft
vorgesehen: `--primary-color`. Radien (`border-radius:12px 12px 0 0`),
Tab-Köpfe (`rgba(127,127,127,.3)`), Kopfzeile und Zeilenraster sind hart
verdrahtet. Ein Stylesheet von außen erreicht Schriftart und Akzentfarbe, mehr
nicht.

Die zweite Möglichkeit wäre ein Fork des Bundles gewesen — der Entwurf ist
genau das, ein angepasster Build von
[esphome/esphome-webserver](https://github.com/esphome/esphome-webserver). 232 kB
minifiziert, von Hand nicht pflegbar und mit jedem ESPHome-Update neu zu bauen.
Dagegen hängt diese Seite nur an der REST-Schnittstelle des Geräts:

| Endpunkt | Zweck |
|---|---|
| `GET /events` | Server-Sent Events, alle Zustände |
| `POST /select/<entity>/set?option=…` | Auswahlfeld setzen |
| `POST /text/<entity>/set?value=…` | Textfeld setzen |

Ein ESPHome-Update kann sie nicht brechen, solange diese drei bleiben.

## Was die Seite zeigt

Genau die Entities, die in `packages/web.yaml` einer `sorting_group` zugeordnet
sind — also **Anzeige** und **Farben**. Alles andere trägt
`disabled_by_default: true` und gehört nach Home Assistant; darauf weist eine
Fußzeile hin. Eine neue Einstellung in `web.yaml` erscheint hier von selbst,
`app.js` kennt keine Entity beim Namen.

Zwei Dinge sind gegenüber dem reinen Ablesen von Entities hinzugekommen:

- **Farben** werden als solche erkannt und bekommen einen Farbwähler mit acht
  Presets. Die Erkennung geht über die Form (`text`-Entity, genau sechs
  Zeichen, Wert sieht aus wie Hex), nicht über den Namen — eine neue Farbe
  braucht hier also nichts.
- **Auswahlfelder** bekommen die Vorschaukachel, die der Entwurf als
  Platzhalter („Vorschau folgt") vorsieht: eine Miniatur des runden Displays,
  die die Marke mit der Ausrichtung dreht bzw. Uhr gegen Zifferblatt zeigt.

Die Icons sind eigene SVG-Pfade. Das Standard-Frontend lädt seine Icons vom
Iconify-Dienst nach; die Seite soll ohne Internetzugang vollständig sein.

Nicht übernommen sind **Logansicht** und **OTA-Formular**. Die Logs laufen über
`esphome logs`, und das OTA-Formular war ohnehin aus: es erscheint nur mit
`ota: - platform: web_server`, und dieses Gerät hat nur `platform: esphome`.

## Schriften

`app.css` importiert Barlow und Barlow Condensed von Google Fonts. Ohne
Internetzugang lädt der Import nicht, und alles fällt auf `system-ui` zurück —
Farben, Raster und Eckmarken bleiben, nur der kondensierte Schnitt der
Überschriften fehlt. Beide Familien einzubetten wären rund 200 kB Flash für
eine selten geöffnete Seite.

## Zurück zum Standard-Frontend

`css_include`, `js_include` und `js_url` aus `packages/web.yaml` entfernen und
`local: true` zurücksetzen.
