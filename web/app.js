// Bedienseite des Geraets - Verhalten.
//
// Diese Datei ersetzt das ESPHome-Standard-Frontend vollstaendig. ESPHome baut
// die Index-Seite selbst und legt sie als
//
//     <script type=module src=/0.js></script><esp-app></esp-app>
//
// ab (build_index_html in components/web_server/__init__.py). Laedt man das
// Standard-Bundle nicht (js_url: "" in packages/web.yaml), bleibt <esp-app> ein
// undefiniertes, leeres Element - und dieses Modul baut die Seite an seiner
// Stelle auf. Wir haengen damit nur an der REST-Schnittstelle des Geraets, nicht
// an der Frontend-Version; ein ESPHome-Update kann diese Seite nicht brechen,
// solange die drei benutzten Endpunkte bleiben:
//
//     GET  /events                     Server-Sent Events, Zustaende
//     POST /select/<entity>/set?option=...
//     POST /text/<entity>/set?value=...
//
// Aussehen: web/app.css. Herkunft und Pflege: web/README.md.

// Alles unterhalb des aktuellen Pfades, damit die Seite auch hinter einem
// Reverse Proxy mit Unterverzeichnis funktioniert.
const BASE = window.location.pathname.replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Zustand
// ---------------------------------------------------------------------------

// Alle bekannten Entities, Schluessel ist die eindeutige ID (name_id oder id).
const entities = new Map();
// Sortiergruppen aus web_server.sorting_groups, Name -> Gewicht.
const groups = new Map();

let title = "";
let comment = "";
let lastEvent = 0;
let connected = false;
// Sammelt Aenderungen an der Struktur, damit ein Schwall von Ereignissen beim
// Verbinden nur einen Neuaufbau ausloest.
let rebuildPending = false;

// ---------------------------------------------------------------------------
// Hilfsmittel
// ---------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svg(paths, size) {
  const ns = "http://www.w3.org/2000/svg";
  const node = document.createElementNS(ns, "svg");
  node.setAttribute("viewBox", "0 0 24 24");
  node.setAttribute("width", size || 20);
  node.setAttribute("height", size || 20);
  node.setAttribute("fill", "none");
  node.setAttribute("stroke", "currentColor");
  node.setAttribute("stroke-width", "1.5");
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  for (const d of paths) {
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    node.appendChild(p);
  }
  return node;
}

// Eigene Glyphen statt iconify: das Standard-Frontend laedt seine Icons vom
// Iconify-Dienst nach, und die Seite soll ohne Internetzugang vollstaendig
// sein. Es sind ohnehin nur drei.
const ICONS = {
  rotation: ["M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z", "M10 6h4"],
  standby: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
  color: ["M12 3l6 7a6 6 0 1 1-12 0l6-7z"],
};

// URL einer Entity-Aktion. Uebernimmt die Logik des Standard-Frontends: liegt
// die neue ID-Form (name_id, mit Schraegstrichen) vor, wird ueber den Namen
// adressiert, sonst ueber die alte object_id-Form hinter dem ersten Bindestrich.
function entityUrl(entity, action) {
  if (entity.uid.includes("/")) {
    const device = entity.device ? encodeURIComponent(entity.device) + "/" : "";
    return `${BASE}/${entity.domain}/${device}${encodeURIComponent(entity.name)}/${action}`;
  }
  const objectId = entity.uid.split("-").slice(1).join("-");
  return `${BASE}/${entity.domain}/${objectId}/${action}`;
}

function post(entity, action, query) {
  fetch(`${entityUrl(entity, action)}?${query}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).catch((err) => console.error("Aktion fehlgeschlagen:", err));
}

// Eine Farb-Entity ist ein Textfeld mit genau sechs Zeichen, dessen Wert wie
// ein Hexwert aussieht. Bewusst ueber die Form statt ueber den Namen, damit
// eine neue Farbe in packages/web.yaml hier nichts nachzutragen braucht.
function isColor(entity) {
  return (
    entity.domain === "text" &&
    entity.max_length === 6 &&
    /^[0-9a-f]{6}$/i.test(String(entity.value ?? ""))
  );
}

// ---------------------------------------------------------------------------
// Kopfband
// ---------------------------------------------------------------------------

const beat = el("div", "beat");

function buildHeader() {
  const header = el("header");

  // Dasselbe Haus wie im Standard-Frontend, aber als gefuellte Flaeche statt
  // als Strich - deshalb nicht ueber svg() oben.
  const logo = el("a", "logo");
  logo.href = "https://esphome.io/web-api";
  logo.title = "ESPHome";
  const ns = "http://www.w3.org/2000/svg";
  const mark = document.createElementNS(ns, "svg");
  mark.setAttribute("viewBox", "0 0 32 32");
  mark.setAttribute("width", "30");
  mark.setAttribute("height", "30");
  const house = document.createElementNS(ns, "path");
  house.setAttribute("d", "M1.3 18H5v10h21.8V18h3.7l-3.7-3.7V7.8h-2.4V12l-8.7-8.7L1.3 18Z");
  house.setAttribute("fill", "currentColor");
  mark.appendChild(house);
  logo.appendChild(mark);
  header.appendChild(logo);

  const wrap = el("div", "title-wrap");
  wrap.appendChild(el("h1", null, ""));
  wrap.appendChild(el("div", "subtitle", ""));
  header.appendChild(wrap);

  const controls = el("div", "controls");
  controls.appendChild(beat);
  header.appendChild(controls);

  return header;
}

function updateHeader() {
  const h1 = document.querySelector("header h1");
  const sub = document.querySelector("header .subtitle");
  if (!h1) return;
  h1.textContent = title || window.location.hostname;
  sub.textContent = [comment, connected ? "verbunden" : "keine Verbindung"]
    .filter(Boolean)
    .join(" · ");
  beat.classList.toggle("connected", connected);
}

// ---------------------------------------------------------------------------
// Vorschaukachel
//
// Jede Kachel ist eine Miniatur des runden Displays: fuer die Ausrichtung eine
// Marke, die mit dem Winkel wandert, fuer die Standby-Seite Uhr gegen
// Zifferblatt. Gezeichnet wird immer der *uebergebene* Wert, nicht der aktuelle
// Zustand - dieselbe Funktion malt damit die Vorschau je Option.
// ---------------------------------------------------------------------------

const NS = "http://www.w3.org/2000/svg";

function shape(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

// Beschriftung der Kachel, gleichzeitig der title-Text.
function previewTitle(value) {
  if (/^\d+°$/.test(value)) return `Ausrichtung ${value}`;
  return `Standby: ${value}`;
}

function drawPreview(node, value) {
  node.textContent = "";
  node.appendChild(
    shape("circle", { cx: 12, cy: 12, r: 10, fill: "none", stroke: "currentColor", "stroke-width": 1 })
  );

  const angle = { "0°": 0, "90°": 90, "180°": 180, "270°": 270 }[value];
  if (angle !== undefined) {
    // Ausrichtung: eine Marke am oberen Rand, mitgedreht.
    node.appendChild(
      shape("rect", {
        x: 9, y: 3, width: 6, height: 2,
        fill: "currentColor",
        transform: `rotate(${angle} 12 12)`,
      })
    );
    return;
  }

  if (value === "Zifferblatt") {
    // Zwoelf Striche auf dem Kranz, wie page_dial. Bewusst ohne Zeiger: die
    // Seite auf dem Geraet hat keine, und eine Vorschau soll nicht mehr
    // versprechen als das Geraet zeigt.
    for (let i = 0; i < 12; i++) {
      node.appendChild(
        shape("line", {
          x1: 12, y1: 3.5, x2: 12, y2: 5.5,
          stroke: "currentColor",
          "stroke-width": 1,
          transform: `rotate(${i * 30} 12 12)`,
        })
      );
    }
    return;
  }

  // Uhr: grosse Uhrzeit mit Datum darunter, angedeutet als zwei Balken.
  node.appendChild(shape("rect", { x: 6, y: 9.5, width: 12, height: 3, fill: "currentColor" }));
  node.appendChild(
    shape("rect", { x: 8.5, y: 14, width: 7, height: 1.5, fill: "currentColor", opacity: 0.5 })
  );
}

// Eine Option als klickbare Kachel mit Miniatur und Beschriftung.
function buildOptionTile(option) {
  const tile = el("button", "preview preview--option");
  tile.type = "button";
  tile.dataset.value = option;
  tile.title = previewTitle(option);
  const node = shape("svg", { viewBox: "0 0 24 24", width: 28, height: 28 });
  drawPreview(node, option);
  tile.appendChild(node);
  tile.appendChild(el("span", null, option));
  return tile;
}

// ---------------------------------------------------------------------------
// Zeilen
// ---------------------------------------------------------------------------

const PRESETS = [
  "#ffffff",
  "#ffd9a0",
  "#5980a6",
  "#e04c3f",
  "#e8a13a",
  "#3f9153",
  "#3f7ab0",
  "#8b4fc9",
];

// Auswahl als Kachelreihe. Ein Dropdown gibt es hier nicht mehr: beide
// Auswahlfelder des Geraets zeigen etwas Sichtbares, und die Vorschau gehoert
// dann an die Option, nicht daneben. Aus dem Klick wird direkt das POST - eine
// verborgene <select> als Zwischenstation braucht es nicht, weil die Seite ihre
// Werte ohnehin nur ueber die REST-Schnittstelle setzt.
function buildSelectRow(entity, row) {
  const wrap = el("div", "select-wrap select-wrap--tiles");
  const tiles = [];
  for (const option of entity.option || []) {
    const tile = buildOptionTile(option);
    tile.addEventListener("click", () => {
      mark(option);
      post(entity, "set", `option=${encodeURIComponent(option)}`);
    });
    tiles.push(tile);
    wrap.appendChild(tile);
  }
  row.querySelector(".value").appendChild(wrap);

  function mark(value) {
    for (const tile of tiles) {
      tile.classList.toggle("selected", tile.dataset.value === value);
    }
  }

  mark(entity.value);
  row.sync = mark;
}

function buildColorRow(entity, row) {
  const wrap = el("div", "colorpicker");

  const swatches = el("div", "color-swatches");
  for (const preset of PRESETS) {
    const swatch = el("button", "color-swatch");
    swatch.type = "button";
    swatch.style.background = preset;
    swatch.title = preset.slice(1).toUpperCase();
    swatch.addEventListener("click", () => send(preset.slice(1)));
    swatches.appendChild(swatch);
  }
  wrap.appendChild(swatches);

  const picker = el("input");
  picker.type = "color";
  picker.value = "#" + entity.value;
  picker.addEventListener("change", () => send(picker.value.slice(1)));
  wrap.appendChild(picker);

  const hex = el("input", "hex");
  hex.type = "text";
  hex.value = String(entity.value).toUpperCase();
  hex.maxLength = 6;
  hex.pattern = "[0-9a-fA-F]{6}";
  hex.spellcheck = false;
  hex.addEventListener("change", () => send(hex.value));
  hex.addEventListener("keydown", (event) => {
    if (event.key === "Enter") hex.blur();
  });
  wrap.appendChild(hex);

  // Das Icon der Zeile ist der aktuelle Farbwert selbst. Maße und Rahmen
  // stehen in app.css unter .icon > .chip, hier nur der Wert.
  const dot = row.querySelector(".icon");
  dot.textContent = "";
  const chip = el("div", "chip");
  chip.style.background = "#" + entity.value;
  dot.appendChild(chip);

  // Unter der Überschrift „Farben" ist das Wort im Namen jeder Zeile doppelt.
  // Das ist eine Regel über die Form des Namens, keine Liste von Entities:
  // eine neue Farbe in packages/web.yaml braucht hier nichts nachzutragen.
  const label = row.querySelector(".label");
  label.textContent = label.textContent.replace(/^Farbe\s+/, "");

  function send(value) {
    if (!/^[0-9a-f]{6}$/i.test(value)) {
      // Ungueltig: zurueck auf den zuletzt bestaetigten Wert des Geraets.
      row.sync(entity.value);
      return;
    }
    post(entity, "set", `value=${value.toUpperCase()}`);
  }

  row.sync = (value) => {
    const clean = /^[0-9a-f]{6}$/i.test(String(value)) ? String(value) : "000000";
    chip.style.background = "#" + clean;
    picker.value = "#" + clean;
    if (document.activeElement !== hex) hex.value = clean.toUpperCase();
  };

  row.querySelector(".value").appendChild(wrap);
}

function buildRow(entity) {
  const row = el("div", "entity-row");

  const icon = el("div", "icon");
  if (entity.domain === "select") {
    icon.appendChild(svg(ICONS[entity.value && entity.value.endsWith("°") ? "rotation" : "standby"]));
  } else {
    icon.appendChild(svg(ICONS.color));
  }
  row.appendChild(icon);

  row.appendChild(el("div", "label", entity.name));
  row.appendChild(el("div", "value"));
  row.sync = () => {};

  if (entity.domain === "select") {
    buildSelectRow(entity, row);
  } else if (isColor(entity)) {
    buildColorRow(entity, row);
  } else {
    // Unbekannte Art: Wert nur anzeigen. Damit bleibt die Seite brauchbar,
    // wenn in packages/web.yaml eine Entity anderer Domain dazukommt.
    const text = el("div", null, String(entity.state ?? entity.value ?? ""));
    row.querySelector(".value").appendChild(text);
    row.sync = (value) => {
      text.textContent = String(value ?? "");
    };
  }

  return row;
}

// ---------------------------------------------------------------------------
// Aufbau
// ---------------------------------------------------------------------------

const main = el("main");
// Zeilen-Knoten je Entity, damit ein Zustandsereignis nicht die ganze Seite
// neu baut - das wuerde beim Tippen den Fokus verlieren.
const rows = new Map();

function corners(container) {
  for (const position of ["tl", "tr", "bl", "br"]) {
    container.appendChild(el("i", "corner " + position));
  }
}

function rebuild() {
  rebuildPending = false;
  main.textContent = "";
  rows.clear();

  // Nur was einer Sortiergruppe zugeordnet ist. Alles andere gehoert nach
  // Home Assistant - siehe disabled_by_default in packages/core.yaml.
  const shown = [...entities.values()].filter((e) => e.sorting_group);
  const names = [...groups.keys()].sort(
    (a, b) => (groups.get(a) ?? 50) - (groups.get(b) ?? 50)
  );

  let any = false;
  for (const name of names) {
    const members = shown
      .filter((e) => e.sorting_group === name)
      .sort(
        (a, b) =>
          (a.sorting_weight ?? 50) - (b.sorting_weight ?? 50) || a.seen - b.seen
      );
    if (!members.length) continue;
    any = true;

    main.appendChild(el("div", "tab-header", name));
    const container = el("div", "tab-container");
    corners(container);
    for (const entity of members) {
      const row = buildRow(entity);
      rows.set(entity.uid, row);
      container.appendChild(row);
    }
    main.appendChild(container);
  }

  if (!any) {
    main.appendChild(el("div", "footnote", "Warte auf das Gerät …"));
    return;
  }

  main.appendChild(
    el(
      "div",
      "footnote",
      "Helligkeit, Stummschaltung, Wake-Word-Optionen, Diagnose und Neustart " +
        "stehen in Home Assistant."
    )
  );
}

function scheduleRebuild() {
  if (rebuildPending) return;
  rebuildPending = true;
  // Der Verbindungsaufbau schickt alle Entities einzeln hintereinander.
  // Ein Timeout buendelt sie zu einem Neuaufbau.
  setTimeout(rebuild, 50);
}

// ---------------------------------------------------------------------------
// Ereignisse
// ---------------------------------------------------------------------------

function onState(event) {
  let data;
  try {
    data = JSON.parse(event.data);
  } catch {
    return;
  }
  const uid = data.name_id || data.id;
  if (!uid) return;

  const known = entities.get(uid);
  if (!known) {
    // Erst mit name und domain ist die Entity vollstaendig beschrieben; die
    // knappen Folgeereignisse allein reichen nicht zum Aufbauen.
    if (!data.name || !data.domain) return;
    // seen haelt die Reihenfolge fest, in der das Geraet die Entities meldet -
    // das ist die Reihenfolge im YAML. Sie entscheidet bei gleichem
    // sorting_weight, und das ist hier der Normalfall: die acht Farben stehen
    // damit in der Reihenfolge der Phasen statt alphabetisch.
    entities.set(uid, Object.assign({ uid, seen: entities.size }, data));
    scheduleRebuild();
    return;
  }

  Object.assign(known, data);
  const row = rows.get(uid);
  if (row) row.sync(known.value ?? known.state);
}

function onSortingGroup(event) {
  try {
    const data = JSON.parse(event.data);
    if (!data.name) return;
    groups.set(data.name, data.sorting_weight ?? 50);
    scheduleRebuild();
  } catch {
    /* nichts zu tun */
  }
}

function onPing(event) {
  if (event.data && event.data.length) {
    try {
      const data = JSON.parse(event.data);
      if (data.title !== undefined) {
        title = data.title;
        document.title = data.title;
      }
      if (data.comment !== undefined) comment = data.comment;
    } catch {
      /* nichts zu tun */
    }
  }
  touch();
  updateHeader();
}

function touch() {
  lastEvent = Date.now();
  if (!connected) {
    connected = true;
    updateHeader();
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

function start() {
  document.head.appendChild(
    Object.assign(document.createElement("meta"), {
      name: "viewport",
      content: "width=device-width, initial-scale=1",
    })
  );
  document.documentElement.lang = "de";

  document.body.textContent = "";
  document.body.appendChild(buildHeader());
  document.body.appendChild(main);
  updateHeader();
  rebuild();

  const source = new EventSource(BASE + "/events");
  source.addEventListener("state", (event) => {
    touch();
    onState(event);
  });
  source.addEventListener("sorting_group", onSortingGroup);
  source.addEventListener("ping", onPing);
  source.addEventListener("error", () => {
    connected = false;
    updateHeader();
  });

  // Der Browser meldet einen Abbruch nicht immer. Bleiben Ereignisse aus,
  // gilt die Verbindung nach 15 Sekunden als weg.
  setInterval(() => {
    const alive = Date.now() - lastEvent < 15000;
    if (alive !== connected) {
      connected = alive;
      updateHeader();
    }
  }, 5000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
