/* ---------------------------------------------------------------
   ETAGE 17 — Weltgenerator
   Baut eine Etage: BSP-Räume, Gänge, Einrichtung und Bewohner.
   Alles deterministisch aus einem Seed.
   --------------------------------------------------------------- */
window.E17 = window.E17 || {};
(function (F) {
'use strict';

/* ---------- Konstanten ---------- */
const TILE_W = 64, TILE_H = 32;
const HW = TILE_W / 2, HH = TILE_H / 2;
const MAP = 148;                      // Kantenlänge des Kachelrasters

const VOID = 0, ROOM = 1, HALL = 2, WATER = 3, GRASS = 4;

F.TILE_W = TILE_W; F.TILE_H = TILE_H; F.MAP = MAP;
F.VOID = VOID; F.ROOM = ROOM; F.HALL = HALL; F.WATER = WATER; F.GRASS = GRASS;

/* Kachelkoordinate -> Bildschirmkoordinate (vor Kamera) */
F.iso = function (x, y) { return [(x - y) * HW, (x + y) * HH]; };
/* und zurück */
F.unIso = function (px, py) { return [(px / HW + py / HH) / 2, (py / HH - px / HW) / 2]; };

/* ---------- Zufall ---------- */
function makeRng(seed) {
  let a = seed >>> 0;
  const next = function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next: next,
    f: function (lo, hi) { return lo + next() * (hi - lo); },
    i: function (lo, hi) { return Math.floor(lo + next() * (hi - lo + 1)); },
    pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
    chance: function (p) { return next() < p; }
  };
}
F.makeRng = makeRng;

/* ---------- Themen ---------- */
/* Jedes Thema liefert Farben, Namen und eine Möblierungsfunktion. */
const THEMES = {
  server: {
    label: 'Serverraum', icon: '▥',
    names: ['Serverraum', 'Rechenzentrum', 'Node-Cluster', 'Kühlhalle', 'Backup-Silo'],
    floorA: '#1b2433', floorB: '#202a3b', accent: '#4cd7c0',
    build: furnishServer
  },
  canteen: {
    label: 'Kantine', icon: '▤',
    names: ['Kantine', 'Mensa', 'Kaffeeküche', 'Speisesaal', 'Nachtbüfett'],
    floorA: '#3a2f28', floorB: '#423630', accent: '#ffb86b',
    build: furnishCanteen
  },
  lab: {
    label: 'Labor', icon: '◈',
    names: ['Labor', 'Testkammer', 'Analytik', 'Reinraum', 'Prüfstand'],
    floorA: '#20303a', floorB: '#263843', accent: '#6ec7ff',
    build: furnishLab
  },
  pool: {
    label: 'Pool', icon: '≋',
    names: ['Schwimmhalle', 'Pool-Deck', 'Therme', 'Wasserbecken'],
    floorA: '#2b3a45', floorB: '#32424e', accent: '#41b8e8',
    build: furnishPool
  },
  cinema: {
    label: 'Kino', icon: '▦',
    names: ['Kinosaal', 'Vorführraum', 'Lichtspielhaus', 'Projektion 4'],
    floorA: '#241f2e', floorB: '#2a2436', accent: '#c58bff',
    build: furnishCinema
  },
  arcade: {
    label: 'Arcade', icon: '◘',
    names: ['Spielhalle', 'Arcade', 'Flipperkeller', 'Münzhalle'],
    floorA: '#2a1f33', floorB: '#31253c', accent: '#ff5fa2',
    build: furnishArcade
  },
  library: {
    label: 'Bibliothek', icon: '▌',
    names: ['Bibliothek', 'Archiv', 'Lesesaal', 'Aktenlager'],
    floorA: '#33291f', floorB: '#3a2f24', accent: '#e0b25c',
    build: furnishLibrary
  },
  garden: {
    label: 'Gewächshaus', icon: '❋',
    names: ['Gewächshaus', 'Hydroponik', 'Botanik-Deck', 'Grünzone', 'Pilzfarm'],
    floorA: '#22331f', floorB: '#283b24', accent: '#7ddc6a',
    build: furnishGarden
  },
  workshop: {
    label: 'Werkstatt', icon: '⚙',
    names: ['Werkstatt', 'Montagehalle', 'Fertigung', 'Roboterbau', 'Lager 12'],
    floorA: '#332b26', floorB: '#3a322b', accent: '#ff9448',
    build: furnishWorkshop
  },
  office: {
    label: 'Büro', icon: '▣',
    names: ['Großraumbüro', 'Verwaltung', 'Planungsbüro', 'Schichtleitung'],
    floorA: '#282f3d', floorB: '#2e3645', accent: '#8fa8ff',
    build: furnishOffice
  },
  gym: {
    label: 'Sporthalle', icon: '◉',
    names: ['Sporthalle', 'Fitnessdeck', 'Trainingsraum', 'Dojo'],
    floorA: '#35262a', floorB: '#3c2c31', accent: '#ff6b6b',
    build: furnishGym
  },
  launch: {
    label: 'Startrampe', icon: '▲',
    names: ['Startrampe', 'Hangar', 'Dockbucht', 'Frachtschleuse'],
    floorA: '#242a33', floorB: '#2a313b', accent: '#ffd166',
    build: furnishLaunch
  }
};
F.THEMES = THEMES;

const THEME_KEYS = Object.keys(THEMES);

/* Namen für die Figuren — bewusst generisch. */
const FIRST = ['Ada','Bo','Cem','Dana','Edo','Fee','Gil','Hana','Ivo','Jun','Kaya','Lio',
               'Mira','Nox','Ole','Pia','Quin','Rex','Sami','Tuva','Uma','Vik','Wren','Yara','Zoe',
               'Ari','Ben','Cleo','Dario','Elin','Fibi','Gero','Hedda','Ilva','Joris','Kit','Lenn',
               'Moss','Nima','Oda','Pelle','Ronja','Silas','Tamo','Urs','Vesna','Wim','Xeno','Yuki'];
const LAST  = ['Abt','Brandl','Cordes','Dorn','Ebner','Falk','Gruber','Hasse','Iven','Jost','Kern',
               'Loos','Maier','Neuner','Orth','Pfaff','Quandt','Reisz','Steg','Thurn','Urban','Voss',
               'Welt','Zander'];
const ROLE  = ['Technik','Küche','Wartung','Forschung','Logistik','Sicherheit','Gärtnerei',
               'Archiv','Nachtschicht','Praktikum','Leitung','Reinigung','Netzbetrieb','Kältetechnik',
               'Qualitätsprüfung','Vermessung','Materialausgabe','Betriebsarzt'];
/* Text, wenn gerade keine Aufgabe läuft */
const DOING = ['wartet auf den nächsten Auftrag','macht kurz Pause','sieht sich um','streckt sich'];
/* Gegenstände, die Aufgaben in die Hand geben */
const ACC_DE = { cup: 'Becher', clipboard: 'Klemmbrett', box: 'Kiste', tool: 'Werkzeug', plant: 'Gießkanne' };
/* Arbeitsplätze: welches Möbelstück wofür taugt */
const JOB_BY_KIND = {
  rack:     ['wartung', 'inventur'],
  machine:  ['wartung'],
  tank:     ['wartung'],
  conveyor: ['wartung', 'abgabe'],
  shelf:    ['inventur', 'quelle', 'abgabe'],
  locker:   ['inventur'],
  crate:    ['quelle', 'abgabe'],
  pad:      ['abgabe'],
  counter:  ['ausgabe'],
  desk:     ['schreibtisch'],
  plant:    ['pflege'],
  tree:     ['pflege'],
  arcade:   ['freizeit'],
  lounger:  ['freizeit'],
  rig:      ['sport']
};
/* wie dicht ein Möbeltyp als Arbeitsplatz eingetragen wird (häufige nur stichprobenweise) */
const JOB_DENSITY = { rack: 0.3, shelf: 0.3, crate: 0.6, plant: 0.4, tree: 0.35, arcade: 0.5, lounger: 0.8 };
/* Anzeige auf der Infokarte */
const STATION_DE = {
  rack: 'Serverschrank', machine: 'Maschine', tank: 'Tank', conveyor: 'Förderband',
  shelf: 'Regal', locker: 'Spind', crate: 'Kiste', pad: 'Startfeld', counter: 'Ausgabe',
  desk: 'Schreibtisch', plant: 'Pflanze', tree: 'Baum', arcade: 'Automat', rig: 'Trainingsgerät',
  lounger: 'Liege'
};
F.ACC_DE = ACC_DE;
F.STATION_DE = STATION_DE;
let _agentNo = 0;
const HAIRCOL = ['#2a2118','#4a3524','#6b4a2c','#8d6a3f','#1d1f24','#5a5f6b','#a8422e','#d8c08a','#e9eef7'];


/* ---------- Hilfen für die Möblierung ---------- */
function Ctx(W, room, rng) {
  this.W = W; this.room = room; this.rng = rng; this.t = THEMES[room.theme];
}
/* Objekt setzen; belegt optional Kacheln (Figuren laufen dann drumherum). */
Ctx.prototype.put = function (kind, x, y, opt) {
  const p = Object.assign({ kind: kind, x: x, y: y, w: 1, d: 1, h: 16, col: '#5a6478',
                            room: this.room.id, ph: this.rng.f(0, 6.28) }, opt || {});
  this.W.props.push(p);
  if (p.solid !== false) {
    for (let yy = Math.floor(p.y); yy < Math.ceil(p.y + p.d); yy++)
      for (let xx = Math.floor(p.x); xx < Math.ceil(p.x + p.w); xx++)
        if (xx >= 0 && yy >= 0 && xx < MAP && yy < MAP) this.W.blocked[yy * MAP + xx] = 1;
  }
  return p;
};
Ctx.prototype.floor = function (x, y, type) {
  if (x < 0 || y < 0 || x >= MAP || y >= MAP) return;
  this.W.tiles[y * MAP + x] = type;
};
/* Sitzplatz merken, damit sich später jemand hinsetzt. */
Ctx.prototype.seat = function (x, y, face) {
  this.W.seats.push({ idx: this.W.seats.length, x: x, y: y, face: face, room: this.room.id, taken: false });
};

/* ---------- Möblierung je Thema ---------- */
function furnishServer(c) {
  const r = c.room, rng = c.rng;
  for (let col = r.x + 1; col < r.x + r.w - 1; col += 3) {
    if (rng.chance(0.15)) continue;
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) {
      if (y === r.y + Math.floor(r.h / 2)) continue;       // Quergang
      c.put('rack', col, y, { w: 0.85, d: 0.9, h: rng.i(44, 58), col: '#161c28',
                              leds: rng.i(4, 7), accent: c.t.accent });
    }
  }
  for (let i = 0; i < 3; i++)
    c.put('lamp', r.x + rng.i(1, r.w - 2), r.y + rng.i(1, r.h - 2),
          { w: 0.3, d: 0.3, h: 52, col: '#2a3346', glow: c.t.accent });
}

function furnishCanteen(c) {
  const r = c.room, rng = c.rng;
  c.put('counter', r.x + 1, r.y + 1, { w: r.w - 2, d: 1, h: 28, col: '#6b4c36', accent: c.t.accent });
  for (let y = r.y + 4; y < r.y + r.h - 2; y += 3) {
    for (let x = r.x + 2; x < r.x + r.w - 2; x += 3) {
      c.put('table', x, y, { w: 1.1, d: 1.1, h: 20, col: '#8a6141' });
      const spots = [[x - 0.8, y + 0.1, 1], [x + 1.2, y + 0.1, 3], [x + 0.1, y - 0.8, 0], [x + 0.1, y + 1.2, 2]];
      for (const s of spots) {
        if (!rng.chance(0.7)) continue;
        c.put('chair', s[0], s[1], { w: 0.6, d: 0.6, h: 14, col: '#5d4430', solid: false });
        c.seat(s[0] + 0.3, s[1] + 0.3, s[2]);
      }
    }
  }
  for (let i = 0; i < 4; i++)
    c.put('plant', r.x + rng.i(1, r.w - 2), r.y + rng.i(3, r.h - 2), { w: 0.7, d: 0.7, h: 14, col: '#4a3a2c' });
}

function furnishLab(c) {
  const r = c.room, rng = c.rng;
  for (let x = r.x + 1; x < r.x + r.w - 2; x += 2) {
    c.put('desk', x, r.y + 1, { w: 1.8, d: 0.9, h: 19, col: '#3f4e5c', screen: c.t.accent });
    c.seat(x + 0.5, r.y + 2.4, 0);
  }
  for (let i = 0; i < rng.i(3, 6); i++)
    c.put('tank', r.x + rng.i(1, r.w - 2), r.y + rng.i(3, r.h - 2),
          { w: 0.8, d: 0.8, h: rng.i(30, 46), col: '#283a46', glow: rng.pick(['#6ec7ff', '#7ddc6a', '#c58bff']) });
  for (let i = 0; i < 2; i++)
    c.put('machine', r.x + rng.i(1, r.w - 3), r.y + rng.i(3, r.h - 3),
          { w: 1.6, d: 1.2, h: 28, col: '#47586a', accent: c.t.accent });
}

function furnishPool(c) {
  const r = c.room, rng = c.rng;
  const pw = Math.min(14, r.w - 4), ph = Math.min(10, r.h - 5);
  const px = r.x + Math.floor((r.w - pw) / 2), py = r.y + Math.floor((r.h - ph) / 2);
  for (let y = py; y < py + ph; y++)
    for (let x = px; x < px + pw; x++) { c.floor(x, y, WATER); c.W.blocked[y * MAP + x] = 1; }
  c.put('ladder', px + 1, py - 0.4, { w: 0.5, d: 0.5, h: 14, col: '#b9c6d6', solid: false });
  c.put('ladder', px + pw - 2, py + ph - 0.6, { w: 0.5, d: 0.5, h: 14, col: '#b9c6d6', solid: false });
  for (let i = 0; i < 8; i++) {
    const lx = r.x + rng.i(1, r.w - 3);
    const ly = rng.chance(0.5) ? rng.i(r.y + 1, py - 2) : rng.i(py + ph + 1, r.y + r.h - 2);
    if (ly <= r.y || ly >= r.y + r.h - 1) continue;
    c.put('lounger', lx, ly, { w: 1.4, d: 0.8, h: 11, col: '#d9e2ec', accent: c.t.accent });
  }
  for (let i = 0; i < 4; i++)
    c.put('plant', r.x + (i % 2 ? r.w - 2 : 1), r.y + 1 + i * 2, { w: 0.8, d: 0.8, h: 16, col: '#3d4a44' });
  const nSwim = Math.max(3, Math.min(10, Math.round(pw * ph / 16)));
  for (let i = 0; i < nSwim; i++)
    c.W.swimmers.push({ x: px + rng.f(0.5, pw - 1), y: py + rng.f(0.5, ph - 1),
                        a: rng.f(0, 6.28), s: rng.f(0.12, 0.26), room: r.id, col: pickSkin(rng) });
}

function furnishCinema(c) {
  const r = c.room;
  c.put('bigscreen', r.x + 2, r.y + 1, { w: r.w - 4, d: 0.4, h: 62, col: '#101520', accent: c.t.accent });
  const aisle = r.x + Math.floor(r.w / 2);
  for (let y = r.y + 4; y < r.y + r.h - 1; y += 2) {
    for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      if (x === aisle) continue;
      c.put('seat', x, y, { w: 0.8, d: 0.8, h: 16, col: '#57304a', solid: false });
      c.seat(x + 0.4, y + 0.4, 0);
    }
  }
}

function furnishArcade(c) {
  const r = c.room, rng = c.rng;
  const neon = ['#ff5fa2', '#6ec7ff', '#ffd166', '#7ddc6a', '#c58bff'];
  for (let y = r.y + 1; y < r.y + r.h - 1; y += 3) {
    for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      if (rng.chance(0.2)) continue;
      c.put('arcade', x, y, { w: 0.85, d: 0.85, h: 34, col: '#2b2138', accent: rng.pick(neon) });
      c.seat(x + 0.4, y + 1.4, 0);
    }
  }
  for (let i = 0; i < 3; i++)
    c.put('lamp', r.x + rng.i(1, r.w - 2), r.y + rng.i(1, r.h - 2),
          { w: 0.25, d: 0.25, h: 46, col: '#241b2e', glow: rng.pick(neon) });
}

function furnishLibrary(c) {
  const r = c.room, rng = c.rng;
  for (let y = r.y + 1; y < r.y + r.h - 3; y += 3) {
    for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
      if (rng.chance(0.12)) continue;
      c.put('shelf', x, y, { w: 0.95, d: 0.8, h: rng.i(38, 46), col: '#4a3726', seed: rng.i(0, 999) });
    }
  }
  const by = r.y + r.h - 2;
  for (let x = r.x + 2; x < r.x + r.w - 2; x += 4) {
    c.put('table', x, by - 1, { w: 1.6, d: 1.2, h: 20, col: '#6a4e33' });
    c.seat(x + 0.5, by + 0.5, 0);
  }
}

function furnishGarden(c) {
  const r = c.room, rng = c.rng;
  for (let y = r.y; y < r.y + r.h; y++)
    for (let x = r.x; x < r.x + r.w; x++) if (rng.chance(0.75)) c.floor(x, y, GRASS);
  for (let y = r.y + 1; y < r.y + r.h - 1; y += 2) {
    for (let x = r.x + 1; x < r.x + r.w - 1; x += 2) {
      if (rng.chance(0.35)) continue;
      if (rng.chance(0.35))
        c.put('tree', x, y, { w: 0.9, d: 0.9, h: rng.i(34, 52), col: '#4a3a2a', leaf: rng.pick(['#4f9c46','#5fb356','#69c46a']) });
      else
        c.put('plant', x, y, { w: 0.8, d: 0.8, h: rng.i(12, 20), col: '#40352a', leaf: '#6fc45e' });
    }
  }
  for (let i = 0; i < 2; i++)
    c.put('lamp', r.x + rng.i(1, r.w - 2), r.y + rng.i(1, r.h - 2),
          { w: 0.25, d: 0.25, h: 44, col: '#2c3a2a', glow: '#cfeacb' });
}

function furnishWorkshop(c) {
  const r = c.room, rng = c.rng;
  const cy = r.y + Math.floor(r.h / 2);
  c.put('conveyor', r.x + 1, cy, { w: r.w - 2, d: 1, h: 13, col: '#3b4350', accent: c.t.accent, solid: true });
  for (let i = 0; i < rng.i(6, 12); i++) {
    const x = r.x + rng.i(1, r.w - 2), y = rng.chance(0.5) ? rng.i(r.y + 1, cy - 1) : rng.i(cy + 2, r.y + r.h - 2);
    if (rng.chance(0.6)) c.put('crate', x, y, { w: 0.9, d: 0.9, h: rng.i(16, 30), col: '#7a5a36', accent: c.t.accent });
    else c.put('barrel', x, y, { w: 0.7, d: 0.7, h: 22, col: rng.pick(['#5a6b7a', '#7a4a3a', '#4a6b52']) });
  }
  for (let i = 0; i < 2; i++)
    c.put('machine', r.x + rng.i(1, r.w - 3), rng.chance(0.5) ? r.y + 1 : r.y + r.h - 3,
          { w: 1.6, d: 1.2, h: 30, col: '#4e5a66', accent: c.t.accent, fan: true });
}

function furnishOffice(c) {
  const r = c.room, rng = c.rng;
  for (let y = r.y + 1; y < r.y + r.h - 2; y += 3) {
    for (let x = r.x + 1; x < r.x + r.w - 2; x += 3) {
      c.put('desk', x, y, { w: 1.7, d: 0.9, h: 19, col: '#4b5568', screen: rng.pick(['#8fa8ff', '#4cd7c0', '#ffb86b']) });
      c.put('partition', x, y + 1.1, { w: 1.7, d: 0.2, h: 26, col: '#3a4354', solid: false });
      c.seat(x + 0.6, y + 0.9, 0);
      if (rng.chance(0.3)) c.put('plant', x + 2, y, { w: 0.6, d: 0.6, h: 12, col: '#3f4a3a' });
    }
  }
}

function furnishGym(c) {
  const r = c.room, rng = c.rng;
  for (let x = r.x + 1; x < r.x + r.w - 1; x++)
    c.put('locker', x, r.y + 1, { w: 0.9, d: 0.7, h: 38, col: '#54606e', accent: c.t.accent });
  for (let i = 0; i < rng.i(5, 9); i++) {
    const x = r.x + rng.i(1, r.w - 3), y = r.y + rng.i(3, r.h - 2);
    c.put('rig', x, y, { w: 1.2, d: 0.9, h: 26, col: '#3d4550', accent: c.t.accent });
  }
  for (let i = 0; i < 3; i++) {
    const mx = r.x + rng.i(1, r.w - 4), my = r.y + rng.i(3, r.h - 4);
    c.put('mat', mx, my, { w: 2, d: 2, h: 2, col: '#7a3f4a', solid: false });
  }
}

function furnishLaunch(c) {
  const r = c.room, rng = c.rng;
  const cx = r.x + Math.floor(r.w / 2) - 1, cy = r.y + Math.floor(r.h / 2) - 1;
  c.put('pad', cx - 2, cy - 2, { w: 6, d: 6, h: 3, col: '#3a3f4a', accent: c.t.accent, solid: false });
  c.put('rocket', cx, cy, { w: 2.2, d: 2.2, h: 120, col: '#c8d2de', accent: '#ff6b4a' });
  for (let i = 0; i < 4; i++)
    c.put('lamp', cx - 3 + (i % 2) * 7, cy - 3 + Math.floor(i / 2) * 7,
          { w: 0.3, d: 0.3, h: 54, col: '#2c333d', glow: c.t.accent });
  for (let i = 0; i < rng.i(5, 9); i++)
    c.put('crate', r.x + rng.i(1, r.w - 2), r.y + rng.i(1, r.h - 2),
          { w: 0.9, d: 0.9, h: rng.i(16, 26), col: '#6d6450', accent: c.t.accent });
}

/* ---------- Räume aufteilen (BSP) ---------- */
function split(area, depth, rng, out) {
  const MIN = 10;
  if (depth <= 0 || (area.w < 24 && area.h < 24) || rng.chance(depth > 3 ? 0 : 0.14)) {
    out.push(area); return;
  }
  const horiz = area.w === area.h ? rng.chance(0.5) : area.w > area.h;
  const len = horiz ? area.w : area.h;
  if (len < MIN * 2 + 3) { out.push(area); return; }
  const cut = Math.floor(rng.f(0.38, 0.62) * len);
  if (horiz) {
    split({ x: area.x, y: area.y, w: cut, h: area.h }, depth - 1, rng, out);
    split({ x: area.x + cut, y: area.y, w: area.w - cut, h: area.h }, depth - 1, rng, out);
  } else {
    split({ x: area.x, y: area.y, w: area.w, h: cut }, depth - 1, rng, out);
    split({ x: area.x, y: area.y + cut, w: area.w, h: area.h - cut }, depth - 1, rng, out);
  }
}

/* ---------- Gang graben (nur ins Leere) ---------- */
function carve(W, x0, y0, x1, y1, width) {
  const sx = Math.min(x0, x1), ex = Math.max(x0, x1);
  const sy = Math.min(y0, y1), ey = Math.max(y0, y1);
  for (let y = sy; y <= ey; y++)
    for (let x = sx; x <= ex; x++)
      for (let w = 0; w < width; w++)
        for (let v = 0; v < width; v++) {
          const xx = x + (sy === ey ? 0 : w), yy = y + (sx === ex ? 0 : v);
          if (xx < 1 || yy < 1 || xx >= MAP - 1 || yy >= MAP - 1) continue;
          const i = yy * MAP + xx;
          if (W.tiles[i] === VOID) { W.tiles[i] = HALL; W.room[i] = -1; }
        }
}

/* ---------- Hauptgenerator ---------- */
F.generate = function (seed) {
  const rng = makeRng(seed);
  const W = {
    seed: seed,
    tiles: new Uint8Array(MAP * MAP),
    room: new Int16Array(MAP * MAP).fill(-1),
    blocked: new Uint8Array(MAP * MAP),
    rooms: [], props: [], seats: [], agents: [], swimmers: [], bots: []
  };

  /* 1 — Flächen aufteilen */
  const areas = [];
  split({ x: 4, y: 4, w: MAP - 8, h: MAP - 8 }, 5, rng, areas);

  /* 2 — Räume in die Flächen legen */
  const themeBag = [];
  areas.forEach(function (a, i) {
    if (themeBag.length === 0) { themeBag.push.apply(themeBag, THEME_KEYS.slice()); }
    const ti = rng.i(0, themeBag.length - 1);
    const theme = themeBag.splice(ti, 1)[0];
    const m = 3;
    const w = a.w - m * 2, h = a.h - m * 2;
    if (w < 7 || h < 7) return;
    const room = {
      id: W.rooms.length, theme: theme, x: a.x + m, y: a.y + m, w: w, h: h,
      cx: a.x + m + w / 2, cy: a.y + m + h / 2, name: '', no: 0
    };
    W.rooms.push(room);
  });

  /* 3 — Namen vergeben (je Thema durchnummeriert) */
  const used = {};
  W.rooms.forEach(function (r) {
    const t = THEMES[r.theme];
    used[r.theme] = (used[r.theme] || 0);
    r.name = t.names[used[r.theme] % t.names.length];
    used[r.theme]++;
    r.no = 1700 + r.id * 3 + rng.i(1, 2);
  });

  /* 4 — Böden setzen */
  W.rooms.forEach(function (r) {
    for (let y = r.y; y < r.y + r.h; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const i = y * MAP + x;
        W.tiles[i] = ROOM; W.room[i] = r.id;
      }
  });

  /* 5 — Gänge: jeden Raum mit dem nächsten verbinden (Kette + Extras) */
  const order = W.rooms.slice().sort(function (a, b) { return (a.cx + a.cy) - (b.cx + b.cy); });
  for (let i = 1; i < order.length; i++) {
    const a = order[i - 1], b = order[i];
    const ax = Math.round(a.cx), ay = Math.round(a.cy), bx = Math.round(b.cx), by = Math.round(b.cy);
    if (rng.chance(0.5)) { carve(W, ax, ay, bx, ay, 3); carve(W, bx, ay, bx, by, 3); }
    else { carve(W, ax, ay, ax, by, 3); carve(W, ax, by, bx, by, 3); }
  }
  for (let k = 0; k < 6; k++) {                 // ein paar Querverbindungen
    const a = rng.pick(W.rooms), b = rng.pick(W.rooms);
    if (a === b) continue;
    carve(W, Math.round(a.cx), Math.round(a.cy), Math.round(b.cx), Math.round(a.cy), 3);
    carve(W, Math.round(b.cx), Math.round(a.cy), Math.round(b.cx), Math.round(b.cy), 3);
  }

  /* 6 — Wände an allen Kanten zum Leeren */
  for (let y = 1; y < MAP - 1; y++) {
    for (let x = 1; x < MAP - 1; x++) {
      const i = y * MAP + x;
      if (W.tiles[i] === VOID) continue;
      const rid = W.room[i];
      const col = rid >= 0 ? '#39445a' : '#2f3849';
      if (W.tiles[i - 1] === VOID)       W.props.push(wall(x, y, 0.22, 1, col, rid));
      if (W.tiles[i - MAP] === VOID)     W.props.push(wall(x, y, 1, 0.22, col, rid));
      if (W.tiles[i + 1] === VOID)       W.props.push(wall(x + 0.78, y, 0.22, 1, col, rid));
      if (W.tiles[i + MAP] === VOID)     W.props.push(wall(x, y + 0.78, 1, 0.22, col, rid));
    }
  }

  /* 7 — Einrichtung */
  W.rooms.forEach(function (r) {
    const c = new Ctx(W, r, rng);
    try { THEMES[r.theme].build(c); } catch (e) { /* Raum bleibt leer */ }
  });

  /* 8 — Erreichbarkeit prüfen (von der Mitte des ersten Raums aus) */
  W.walk = new Uint8Array(MAP * MAP);
  for (let i = 0; i < MAP * MAP; i++) {
    const t = W.tiles[i];
    W.walk[i] = (t === ROOM || t === HALL || t === GRASS) && !W.blocked[i] ? 1 : 0;
  }
  const reach = new Uint8Array(MAP * MAP);
  const start = findOpen(W, W.rooms[0]);
  if (start) {
    const q = [start.y * MAP + start.x]; reach[q[0]] = 1;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], x = i % MAP, y = (i / MAP) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < MAP - 1 ? i + 1 : -1, y > 0 ? i - MAP : -1, y < MAP - 1 ? i + MAP : -1];
      for (let k = 0; k < 4; k++) {
        const n = nb[k];
        if (n >= 0 && !reach[n] && W.walk[n]) { reach[n] = 1; q.push(n); }
      }
    }
  }
  W.reach = reach;

  /* 9 — Arbeitsplätze: Möbel, an denen man etwas tun kann, plus Stehplatz davor */
  W.stations = [];
  W.byUse = {};
  for (let i = 0; i < W.props.length; i++) {
    const pr = W.props[i];
    const uses = JOB_BY_KIND[pr.kind];
    if (!uses) continue;
    const dens = JOB_DENSITY[pr.kind];
    if (dens !== undefined && !rng.chance(dens)) continue;
    const stand = standingSpot(W, pr, rng);
    if (!stand) continue;
    const st = {
      idx: W.stations.length,
      kind: pr.kind, uses: uses, prop: pr,
      x: stand.x + 0.5, y: stand.y + 0.5,
      cx: pr.x + pr.w / 2, cy: pr.y + pr.d / 2,
      room: W.room[stand.y * MAP + stand.x], busy: 0
    };
    W.stations.push(st);
    for (let u = 0; u < uses.length; u++) (W.byUse[uses[u]] = W.byUse[uses[u]] || []).push(st);
  }

  /* 9 — Bewohner */
  W.rooms.forEach(function (r) {
    const n = Math.max(4, Math.min(14, Math.round(r.w * r.h / 46)));
    for (let k = 0; k < n; k++) {
      const spot = findOpen(W, r, rng);
      if (!spot) continue;
      W.agents.push(makeAgent(spot.x + 0.5, spot.y + 0.5, r.id, rng));
    }
  });
  /* Zum Start sitzen ein paar wenige schon — der Rest kommt über die Aufgaben.
     Mehr wäre schädlich: sie blockierten die Sitzplätze, die Pausen brauchen. */
  let sitzend = 0;
  W.seats.forEach(function (s) {
    if (sitzend >= 40 || !rng.chance(0.05)) return;
    const a = makeAgent(s.x, s.y, s.room, rng);
    a.state = 'sit'; a.sitting = true; a.dir = s.face; a.timer = rng.f(4, 22); a.seat = s;
    a.doing = 'sitzt noch einen Moment';
    s.taken = true; W.agents.push(a); sitzend++;
  });
  /* Putzroboter auf den Gängen */
  for (let k = 0; k < 8; k++) {
    const x = rng.i(6, MAP - 6), y = rng.i(6, MAP - 6), i = y * MAP + x;
    if (W.tiles[i] !== HALL || !W.reach[i]) { k--; if (k < -40) break; continue; }
    W.bots.push({ x: x + 0.5, y: y + 0.5, a: rng.pick([0, 1.57, 3.14, 4.71]), s: 0.45, ph: rng.f(0, 6) });
  }

  W.propCount = W.props.length;
  return W;
};

function wall(x, y, w, d, col, rid) {
  return { kind: 'wall', x: x, y: y, w: w, d: d, h: 34, col: col, room: rid, ph: 0 };
}

function pickSkin(rng) {
  return rng.pick(['#e8b894', '#c98f6a', '#8d5a3c', '#f2d1b3', '#6b4430', '#d9a77c']);
}

function makeAgent(x, y, room, rng) {
  const hair = rng.i(0, 5);
  return {
    id: ++_agentNo,
    x: x, y: y, room: room, dir: rng.i(0, 3),
    speed: rng.f(0.62, 1.05), gait: rng.f(0, 6.28), path: null, pi: 0, state: 'idle', timer: rng.f(0, 6),
    ph: rng.f(0, 6.28), moving: false, sitting: false, seat: null,
    scale: rng.f(0.92, 1.14),
    skin: pickSkin(rng),
    shirt: rng.pick(['#4cd7c0','#ff7a9c','#8fa8ff','#ffd166','#7ddc6a','#c58bff','#ff9448','#e9eef7',
                     '#5b6a8a','#e05c4a','#3fa9a0','#b9c6d6']),
    pants: rng.pick(['#2f3647','#3c4a63','#4a3a2c','#2b3a45','#553a55','#3b3f46','#5a4636']),
    shoes: rng.pick(['#1a1f28','#2c2118','#3a3f4a','#e9eef7']),
    hair: hair,
    hairCol: rng.pick(HAIRCOL),
    hat: hair === 3 ? rng.pick(['#ff5fa2','#ffd166','#6ec7ff','#e9eef7','#4cd7c0','#e05c4a']) : null,
    badge: rng.chance(0.45) ? rng.pick(['#ffd166','#4cd7c0','#ff5fa2','#e9eef7']) : null,
    acc: null,
    task: null, plan: null, step: 0, dest: null, targetLabel: '—',
    name: rng.pick(FIRST) + ' ' + rng.pick(LAST),
    role: rng.pick(ROLE),
    doing: 'meldet sich zum Dienst',
    since: rng.i(1, 9),
    emote: 0, emoteSym: '·'
  };
}

/* Freier, erreichbarer Stehplatz an der Kante eines Möbelstücks. */
function standingSpot(W, p, rng) {
  const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
  const x1 = Math.ceil(p.x + p.w) - 1, y1 = Math.ceil(p.y + p.d) - 1;
  const cand = [];
  for (let x = x0; x <= x1; x++) { cand.push([x, y0 - 1]); cand.push([x, y1 + 1]); }
  for (let y = y0; y <= y1; y++) { cand.push([x0 - 1, y]); cand.push([x1 + 1, y]); }
  /* zufällige Reihenfolge, damit sich lange Möbel gleichmäßig füllen */
  for (let i = cand.length - 1; i > 0; i--) {
    const j = rng.i(0, i); const t = cand[i]; cand[i] = cand[j]; cand[j] = t;
  }
  for (let i = 0; i < cand.length; i++) {
    const x = cand[i][0], y = cand[i][1];
    if (x < 1 || y < 1 || x >= MAP - 1 || y >= MAP - 1) continue;
    const k = y * MAP + x;
    if (W.walk[k] && W.reach[k]) return { x: x, y: y };
  }
  return null;
}

/* freie, erreichbare Kachel im Raum finden */
function findOpen(W, room, rng) {
  for (let tries = 0; tries < 80; tries++) {
    const x = room.x + (rng ? rng.i(0, room.w - 1) : Math.floor(room.w / 2));
    const y = room.y + (rng ? rng.i(0, room.h - 1) : Math.floor(room.h / 2));
    const i = y * MAP + x;
    if (W.walk ? (W.walk[i] && (!W.reach || W.reach[i])) : (W.tiles[i] !== VOID && !W.blocked[i]))
      return { x: x, y: y };
  }
  /* systematisch */
  for (let y = room.y; y < room.y + room.h; y++)
    for (let x = room.x; x < room.x + room.w; x++) {
      const i = y * MAP + x;
      if (W.walk ? (W.walk[i] && (!W.reach || W.reach[i])) : (W.tiles[i] !== VOID && !W.blocked[i]))
        return { x: x, y: y };
    }
  return null;
}
F.findOpen = findOpen;

/* ---------- Wegsuche (Breitensuche auf dem Raster) ---------- */
const _prev = new Int32Array(MAP * MAP);
const _seen = new Int32Array(MAP * MAP);
let _stamp = 0;
const _queue = new Int32Array(MAP * MAP);

F.findPath = function (W, sx, sy, tx, ty) {
  sx |= 0; sy |= 0; tx |= 0; ty |= 0;
  if (sx < 0 || sy < 0 || tx < 0 || ty < 0 || sx >= MAP || sy >= MAP || tx >= MAP || ty >= MAP) return null;
  const s = sy * MAP + sx, e = ty * MAP + tx;
  if (!W.walk[e] || !W.walk[s]) return null;
  if (s === e) return [];
  _stamp++;
  let head = 0, tail = 0;
  _queue[tail++] = s; _seen[s] = _stamp; _prev[s] = -1;
  while (head < tail) {
    const i = _queue[head++];
    if (i === e) break;
    const x = i % MAP, y = (i / MAP) | 0;
    if (x > 0)       { const n = i - 1;   if (_seen[n] !== _stamp && W.walk[n]) { _seen[n] = _stamp; _prev[n] = i; _queue[tail++] = n; } }
    if (x < MAP - 1) { const n = i + 1;   if (_seen[n] !== _stamp && W.walk[n]) { _seen[n] = _stamp; _prev[n] = i; _queue[tail++] = n; } }
    if (y > 0)       { const n = i - MAP; if (_seen[n] !== _stamp && W.walk[n]) { _seen[n] = _stamp; _prev[n] = i; _queue[tail++] = n; } }
    if (y < MAP - 1) { const n = i + MAP; if (_seen[n] !== _stamp && W.walk[n]) { _seen[n] = _stamp; _prev[n] = i; _queue[tail++] = n; } }
  }
  if (_seen[e] !== _stamp) return null;
  const out = [];
  let cur = e;
  while (cur !== -1 && cur !== s) { out.push([(cur % MAP) + 0.5, ((cur / MAP) | 0) + 0.5]); cur = _prev[cur]; }
  out.reverse();
  return out;
};

})(window.E17);
