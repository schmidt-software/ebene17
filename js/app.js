/* ---------------------------------------------------------------
   ETAGE 17 — Anwendung
   Kamera, Eingabe, Figurenverhalten, Oberfläche.
   --------------------------------------------------------------- */
(function (F) {
'use strict';

const HW = F.TILE_W / 2, HH = F.TILE_H / 2, MAP = F.MAP;
const EMOTES = ['!', '?', '*', '~', '+', 'o', 'z'];

const $ = function (id) { return document.getElementById(id); };
const cv = $('scene'), ctx = cv.getContext('2d', { alpha: false });
const mini = $('minimap'), mctx = mini.getContext('2d');

let W = null;                 // Welt
let stars = [];
let miniBase = null;          // vorgerendertes Kartenbild
let statics = [];             // sortierte, unbewegliche Objekte
let rng = F.makeRng(1);

const cam = { x: 0, y: 0, z: 1, tw: null };   // tw = laufende Kamerafahrt
const view = { w: 0, h: 0, dpr: 1 };
let tourOn = false, tourTimer = 0, tourIdx = 0;
let hover = null, mouse = { x: 0, y: 0, inside: false };
let sel = null, follow = false;
const av = $('card-av'), avctx = av.getContext('2d');
let activeRoom = -1;

/* ---------- Aufbau ---------- */
function boot(seed, gesichert) {
  const fill = $('boot-fill'), msg = $('boot-msg');
  const steps = [
    ['Etage wird vermessen …', 15],
    ['Räume werden möbliert …', 55],
    ['Bewohner ziehen ein …', 85],
    ['Licht an.', 100]
  ];
  let s = 0;
  function step() {
    if (s < steps.length) {
      msg.textContent = steps[s][0];
      fill.style.width = steps[s][1] + '%';
      s++;
      if (s === 2) {
        build(seed);
        if (gesichert && zustandSchreiben(gesichert)) msg.textContent = 'Stand wird fortgesetzt …';
      }
      requestAnimationFrame(function () { setTimeout(step, 130); });
    } else {
      $('boot').classList.add('done');
      setTimeout(function () { $('boot').style.display = 'none'; }, 600);
    }
  }
  step();
}

function build(seed) {
  rng = F.makeRng(seed);
  W = F.generate(seed);
  stars = F.makeStars(320, F.makeRng(seed ^ 0x9e37));

  /* Statische Objekte nach Tiefe sortieren und Bildschirm-Hülle merken */
  statics = W.props.slice();
  for (let i = 0; i < statics.length; i++) {
    const p = statics[i];
    p.key = (p.x + p.w / 2) + (p.y + p.d / 2);
    p.bx0 = (p.x - (p.y + p.d)) * HW - 36;
    p.bx1 = ((p.x + p.w) - p.y) * HW + 36;
    p.by0 = (p.x + p.y) * HH - p.h - 40;
    p.by1 = (p.x + p.w + p.y + p.d) * HH + 20;
  }
  statics.sort(function (a, b) { return a.key - b.key; });

  buildRoomList();
  buildMiniBase();
  updateStats();

  /* Start in einem zufälligen Raum */
  const r = W.rooms[rng.i(0, W.rooms.length - 1)];
  cam.z = 1;
  centerOn(r.cx, r.cy, false);
  tourIdx = r.id;
}

/* ---------- Kamera ---------- */
function centerOn(tx, ty, animate, zoom) {
  const p = F.iso(tx, ty);
  const z = zoom || cam.z;
  const nx = view.w / 2 - p[0] * z;
  const ny = view.h / 2 - p[1] * z;
  if (!animate) { cam.x = nx; cam.y = ny; cam.z = z; cam.tw = null; return; }
  cam.tw = { fx: cam.x, fy: cam.y, fz: cam.z, tx: nx, ty: ny, tz: z, t: 0, d: 1.1 };
}

function zoomAt(sx, sy, factor) {
  const nz = Math.min(2.6, Math.max(0.22, cam.z * factor));
  const k = nz / cam.z;
  cam.x = sx - (sx - cam.x) * k;
  cam.y = sy - (sy - cam.y) * k;
  cam.z = nz;
  cam.tw = null;
}

function screenToTile(sx, sy) {
  return F.unIso((sx - cam.x) / cam.z, (sy - cam.y) / cam.z);
}

/* ---------- Figurenverhalten ---------- */
/* Jede Figur arbeitet eine Aufgabe aus mehreren Schritten ab. Ein Schritt heisst:
   zu einem Arbeitsplatz laufen, dort eine Weile etwas tun, dabei etwas in die Hand
   nehmen oder ablegen. Findet sich kein passender Platz, bricht die Aufgabe sauber ab. */
const TASKS = {
  wartung: { label: 'Wartungsrunde', steps: [
    { use: 'wartung', dur: [10, 22], go: 'geht zur Anlage', doing: 'prüft die Anlage', hold: 'tool' },
    { use: 'wartung', dur: [8, 18], go: 'holt ein Ersatzteil', doing: 'tauscht ein Bauteil', hold: 'tool', then: null } ] },

  inventur: { label: 'Inventur', steps: [
    { use: 'inventur', dur: [8, 16], go: 'geht zum ersten Posten', doing: 'zählt Bestand', hold: 'clipboard' },
    { use: 'inventur', dur: [8, 16], go: 'geht zum nächsten Posten', doing: 'notiert Nummern', hold: 'clipboard' },
    { use: 'schreibtisch', dur: [12, 30], go: 'geht zum Schreibtisch', doing: 'trägt die Zahlen ein', hold: 'clipboard', sit: true, then: null, optional: true } ] },

  transport: { label: 'Transport', steps: [
    { use: 'quelle', dur: [4, 9], go: 'geht ins Lager', doing: 'holt eine Kiste', hold: null, then: 'box' },
    { use: 'abgabe', dur: [4, 9], go: 'bringt die Kiste weg', doing: 'liefert die Kiste ab', then: null } ] },

  pause: { label: 'Pause', steps: [
    { use: 'ausgabe', dur: [4, 9], go: 'geht zur Ausgabe', doing: 'holt sich einen Becher', hold: null, then: 'cup', optional: true },
    { use: 'sitz', dur: [18, 45], go: 'sucht einen Sitzplatz', doing: 'macht Pause', sit: true, then: null } ] },

  pflege: { label: 'Pflanzenpflege', steps: [
    { use: 'pflege', dur: [6, 14], go: 'geht zu den Beeten', doing: 'gießt die Pflanzen', hold: 'plant' },
    { use: 'pflege', dur: [6, 14], go: 'geht zur nächsten Pflanze', doing: 'schneidet Triebe', hold: 'plant', then: null } ] },

  buero: { label: 'Schreibtischarbeit', steps: [
    { use: 'schreibtisch', dur: [35, 90], go: 'geht an den Platz', doing: 'arbeitet am Platz', hold: 'clipboard', sit: true, then: null } ] },

  kueche: { label: 'Ausgabedienst', steps: [
    { use: 'ausgabe', dur: [25, 50], go: 'geht zur Ausgabe', doing: 'steht an der Ausgabe', hold: null },
    { use: 'quelle', dur: [5, 10], go: 'geht ins Lager', doing: 'holt Nachschub', then: 'box' },
    { use: 'ausgabe', dur: [8, 16], go: 'bringt Nachschub', doing: 'räumt ein', then: null } ] },

  rundgang: { label: 'Rundgang', steps: [
    { use: 'rundgang', dur: [3, 9], doing: 'geht die Runde', hold: null },
    { use: 'rundgang', dur: [3, 9], doing: 'sieht nach dem Rechten' },
    { use: 'rundgang', dur: [4, 10], doing: 'macht Notizen', hold: 'clipboard', then: null } ] },

  freizeit: { label: 'Freizeit', steps: [
    { use: 'freizeit', dur: [25, 60], go: 'sucht sich etwas', doing: 'vertreibt sich die Zeit', hold: null, then: null } ] },

  sport: { label: 'Training', steps: [
    { use: 'sport', dur: [20, 45], go: 'geht zum Gerät', doing: 'trainiert', hold: null, then: null } ] }
};

/* Welche Rolle greift zu welcher Aufgabe */
const ROLE_TASKS = {
  'Technik':          ['wartung', 'wartung', 'inventur'],
  'Netzbetrieb':      ['wartung', 'wartung', 'inventur'],
  'Kältetechnik':     ['wartung', 'wartung', 'transport'],
  'Wartung':          ['wartung', 'wartung', 'transport'],
  'Logistik':         ['transport', 'transport', 'inventur'],
  'Materialausgabe':  ['transport', 'inventur', 'kueche'],
  'Küche':            ['kueche', 'kueche', 'transport'],
  'Gärtnerei':        ['pflege', 'pflege', 'transport'],
  'Forschung':        ['buero', 'inventur', 'wartung'],
  'Qualitätsprüfung': ['inventur', 'buero', 'wartung'],
  'Vermessung':       ['rundgang', 'buero', 'inventur'],
  'Archiv':           ['inventur', 'inventur', 'buero'],
  'Leitung':          ['buero', 'rundgang'],
  'Sicherheit':       ['rundgang', 'rundgang', 'wartung'],
  'Reinigung':        ['rundgang', 'rundgang', 'transport'],
  'Nachtschicht':     ['rundgang', 'wartung', 'inventur'],
  'Praktikum':        ['transport', 'inventur', 'freizeit'],
  'Betriebsarzt':     ['buero', 'rundgang']
};
/* dazu kommt für alle etwas Privates */
const ANY_TASKS = ['pause', 'freizeit', 'sport'];

/* --- Ziele suchen --- */

/* Arbeitsplatz für einen Zweck: aus einer Stichprobe den nächstgelegenen freien. */
function stationDest(a, step) {
  const list = W.byUse[step.use];
  if (!list || !list.length) return null;
  let best = null, bestD = 1e9;
  const tries = Math.min(list.length, 14);
  for (let i = 0; i < tries; i++) {
    const st = list[rng.i(0, list.length - 1)];
    if (st.busy) continue;
    /* fremde Räume kosten Zuschlag, damit niemand ständig quer über die Etage läuft */
    const d = Math.abs(st.x - a.x) + Math.abs(st.y - a.y) + (st.room === a.room ? 0 : 30);
    if (d < bestD) { bestD = d; best = st; }
  }
  if (!best) return null;
  best.busy = a.id;
  const dest = { x: best.x, y: best.y, station: best, seat: null, label: stationLabel(best) };
  if (step.sit) dest.seat = seatNear(best, a);
  if (dest.seat) { dest.x = dest.seat.x; dest.y = dest.seat.y; }
  return dest;
}

/* Sitzplatz in der Nähe eines Arbeitsplatzes (Schreibtischstuhl) */
function seatNear(st, a) {
  for (let i = 0; i < W.seats.length; i++) {
    const s = W.seats[i];
    if (s.taken || s.room !== st.room) continue;
    if (Math.abs(s.x - st.x) + Math.abs(s.y - st.y) < 3) { s.taken = true; return s; }
  }
  return null;
}

/* irgendein freier Sitzplatz, bevorzugt in der Nähe */
function seatDest(a) {
  if (!W.seats.length) return null;
  let best = null, bestD = 1e9;
  for (let i = 0; i < 18; i++) {
    const s = W.seats[rng.i(0, W.seats.length - 1)];
    if (s.taken) continue;
    const d = Math.abs(s.x - a.x) + Math.abs(s.y - a.y) + (s.room === a.room ? 0 : 30);
    if (d < bestD) { bestD = d; best = s; }
  }
  if (!best) return null;
  best.taken = true;
  const r = W.rooms[best.room];
  return { x: best.x, y: best.y, station: null, seat: best,
           label: 'Sitzplatz · ' + (r ? r.name + ' #' + r.no : 'Etage') };
}

/* freies Ziel für den Rundgang */
function wanderDest(a) {
  const room = rng.chance(0.55) ? W.rooms[a.room] : W.rooms[rng.i(0, W.rooms.length - 1)];
  if (!room) return null;
  const spot = F.findOpen(W, room, rng);
  if (!spot) return null;
  return { x: spot.x + 0.5, y: spot.y + 0.5, station: null, seat: null,
           label: room.name + ' #' + room.no };
}

function stationLabel(st) {
  const r = W.rooms[st.room];
  return (F.STATION_DE[st.kind] || st.kind) + ' · ' + (r ? r.name + ' #' + r.no : 'Gang');
}

/* --- Aufgaben abarbeiten --- */

function releaseDest(a) {
  if (!a.dest) return;
  if (a.dest.station && a.dest.station.busy === a.id) a.dest.station.busy = 0;
  if (a.dest.seat) a.dest.seat.taken = false;
  a.dest = null;
}

function assignTask(a) {
  const own = ROLE_TASKS[a.role] || ['rundgang'];
  const pool = rng.chance(0.75) ? own : ANY_TASKS;
  const key = rng.pick(pool);
  a.taskKey = key;
  a.task = TASKS[key];
  a.plan = a.task.steps;
  a.step = 0;
  startStep(a);
}

function startStep(a) {
  /* Schleifen ausschliessen: höchstens so viele Anläufe wie Schritte */
  for (let guard = 0; guard < 4; guard++) {
    const st = a.plan && a.plan[a.step];
    if (!st) { finishTask(a); return; }
    if (st.hold !== undefined) a.acc = st.hold;
    a.doing = st.go || st.doing;

    const dest = st.use === 'rundgang' ? wanderDest(a)
               : st.use === 'sitz' ? seatDest(a)
               : stationDest(a, st);
    if (dest) {
      a.dest = dest;
      const path = F.findPath(W, Math.floor(a.x), Math.floor(a.y), Math.floor(dest.x), Math.floor(dest.y));
      if (path) {
        a.targetLabel = dest.label;
        a.path = path; a.pi = 0; a.state = 'walk'; a.moving = true;
        return;
      }
      releaseDest(a);
    }
    if (!st.optional) { abortTask(a); return; }
    a.step++;                                   /* freiwilliger Schritt wird übersprungen */
  }
  finishTask(a);
}

function arriveStep(a) {
  const st = a.plan[a.step];
  a.moving = false;
  a.state = 'work';
  a.doing = st.doing;
  a.timer = rng.f(st.dur[0], st.dur[1]);
  if (a.dest && a.dest.seat) {
    a.sitting = true;
    a.x = a.dest.seat.x; a.y = a.dest.seat.y; a.dir = a.dest.seat.face;
  } else if (a.dest && a.dest.station) {
    const dx = a.dest.station.cx - a.x, dy = a.dest.station.cy - a.y;
    a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  }
}

function endStep(a) {
  const st = a.plan[a.step];
  if (st && st.then !== undefined) a.acc = st.then;
  a.sitting = false;
  releaseDest(a);
  a.step++;
  startStep(a);
}

function finishTask(a) {
  releaseDest(a);
  a.sitting = false; a.moving = false; a.path = null;
  a.task = null; a.taskKey = null; a.plan = null; a.acc = null;
  a.targetLabel = '—';
  a.doing = 'wartet auf den nächsten Auftrag';
  a.state = 'idle'; a.timer = rng.f(2, 9);
}

function abortTask(a) {
  releaseDest(a);
  a.sitting = false; a.moving = false; a.path = null;
  a.task = null; a.taskKey = null; a.plan = null;
  a.targetLabel = '—';
  a.doing = 'sucht eine neue Aufgabe';
  a.state = 'idle'; a.timer = rng.f(1.5, 5);
}

function updateAgent(a, dt) {
  if (a.emote > 0) a.emote -= dt * 0.5;
  else if (rng.chance(dt * 0.05)) { a.emote = 2.2; a.emoteSym = rng.pick(EMOTES); }

  /* Figuren, die schon sitzend erzeugt wurden */
  if (a.state === 'sit') {
    a.timer -= dt;
    if (a.timer <= 0) {
      a.sitting = false;
      if (a.seat) { a.seat.taken = false; a.seat = null; }
      a.state = 'idle'; a.timer = rng.f(1.5, 5);
    }
    return;
  }

  if (a.state === 'idle') {
    a.moving = false;
    a.timer -= dt;
    if (a.timer <= 0) assignTask(a);
    return;
  }

  if (a.state === 'work') {
    a.timer -= dt;
    if (a.timer <= 0) endStep(a);
    return;
  }

  /* unterwegs zum Ziel des aktuellen Schritts */
  const wp = a.path && a.path[a.pi];
  if (!wp) { arriveStep(a); return; }
  const dx = wp[0] - a.x, dy = wp[1] - a.y;
  const dist = Math.hypot(dx, dy);
  const step = a.speed * dt;
  if (dist <= step) {
    a.x = wp[0]; a.y = wp[1]; a.pi++; a.gait += dist * 6;
    const rid = W.room[(a.y | 0) * MAP + (a.x | 0)];
    if (rid >= 0) a.room = rid;
    if (a.pi >= a.path.length) { a.path = null; arriveStep(a); }
  } else {
    a.x += dx / dist * step; a.y += dy / dist * step;
    a.gait += step * 6;
    a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
  }
}

function updateSwimmer(s, dt) {
  const nx = s.x + Math.cos(s.a) * s.s * dt, ny = s.y + Math.sin(s.a) * s.s * dt;
  const i = (ny | 0) * MAP + (nx | 0);
  if (W.tiles[i] === F.WATER) { s.x = nx; s.y = ny; }
  else s.a += 1.9 + rng.f(-0.5, 0.5);
}

function updateBot(b, dt) {
  const nx = b.x + Math.cos(b.a) * b.s * dt, ny = b.y + Math.sin(b.a) * b.s * dt;
  const i = (ny | 0) * MAP + (nx | 0);
  if (W.walk[i]) { b.x = nx; b.y = ny; }
  else b.a += rng.chance(0.5) ? 1.5708 : -1.5708;
}

/* ---------- Zeichnen ---------- */
function draw(t, dt) {
  F.drawStars(ctx, stars, view.w, view.h, cam.x, cam.y, t);

  ctx.save();
  ctx.setTransform(cam.z * view.dpr, 0, 0, cam.z * view.dpr, cam.x * view.dpr, cam.y * view.dpr);

  /* sichtbarer Bereich in Weltpixeln */
  const vx0 = -cam.x / cam.z, vy0 = -cam.y / cam.z;
  const vx1 = vx0 + view.w / cam.z, vy1 = vy0 + view.h / cam.z;

  /* -- Böden -- */
  const c1 = F.unIso(vx0, vy0), c2 = F.unIso(vx1, vy0);
  const c3 = F.unIso(vx0, vy1), c4 = F.unIso(vx1, vy1);
  const tx0 = Math.max(0, Math.floor(Math.min(c1[0], c2[0], c3[0], c4[0])) - 2);
  const tx1 = Math.min(MAP - 1, Math.ceil(Math.max(c1[0], c2[0], c3[0], c4[0])) + 2);
  const ty0 = Math.max(0, Math.floor(Math.min(c1[1], c2[1], c3[1], c4[1])) - 2);
  const ty1 = Math.min(MAP - 1, Math.ceil(Math.max(c1[1], c2[1], c3[1], c4[1])) + 2);

  for (let y = ty0; y <= ty1; y++) {
    for (let x = tx0; x <= tx1; x++) {
      const i = y * MAP + x, tt = W.tiles[i];
      if (tt === F.VOID) continue;
      let col;
      if (tt === F.HALL) {
        col = ((x + y) & 1) ? '#232b3a' : '#1e2532';
      } else if (tt === F.WATER) {
        const s = Math.sin(t * 1.6 + x * 0.7 + y * 0.5) * 0.5 + 0.5;
        col = F.shade('#1f6f96', -0.18 + s * 0.32);
      } else if (tt === F.GRASS) {
        col = ((x + y) & 1) ? '#2b4226' : '#263b22';
      } else {
        const th = F.THEMES[W.rooms[W.room[i]].theme];
        col = ((x + y) & 1) ? th.floorA : th.floorB;
      }
      F.diamond(ctx, x, y, col, 0);
    }
  }
  /* Wasserglanz */
  ctx.globalAlpha = 0.16;
  for (let y = ty0; y <= ty1; y++)
    for (let x = tx0; x <= tx1; x++)
      if (W.tiles[y * MAP + x] === F.WATER && ((x * 3 + y * 7 + ((t * 2) | 0)) % 11 === 0))
        F.diamond(ctx, x + 0.25, y + 0.25, '#ffffff', 18);
  ctx.globalAlpha = 1;

  /* -- bewegliche Objekte einsortieren -- */
  const dyn = [];
  for (let i = 0; i < W.agents.length; i++) {
    const a = W.agents[i];
    if (a.x < tx0 - 3 || a.x > tx1 + 3 || a.y < ty0 - 3 || a.y > ty1 + 3) continue;
    dyn.push({ key: a.x + a.y, o: a, kind: 0 });
  }
  for (let i = 0; i < W.swimmers.length; i++) {
    const s = W.swimmers[i];
    if (s.x < tx0 - 3 || s.x > tx1 + 3 || s.y < ty0 - 3 || s.y > ty1 + 3) continue;
    dyn.push({ key: s.x + s.y, o: s, kind: 1 });
  }
  for (let i = 0; i < W.bots.length; i++) {
    const b = W.bots[i];
    if (b.x < tx0 - 3 || b.x > tx1 + 3 || b.y < ty0 - 3 || b.y > ty1 + 3) continue;
    dyn.push({ key: b.x + b.y, o: b, kind: 2 });
  }
  dyn.sort(function (a, b) { return a.key - b.key; });

  /* -- Verschmelzen: Statik und Bewegtes nach Tiefe -- */
  let di = 0;
  let drawn = 0;
  for (let i = 0; i < statics.length; i++) {
    const p = statics[i];
    while (di < dyn.length && dyn[di].key < p.key) { drawDyn(dyn[di], t); di++; }
    if (p.bx1 < vx0 || p.bx0 > vx1 || p.by1 < vy0 || p.by0 > vy1) continue;
    F.drawProp(ctx, p, t);
    drawn++;
  }
  while (di < dyn.length) { drawDyn(dyn[di], t); di++; }

  /* Umriss der Figur unter dem Zeiger */
  if (hover && hover !== sel) {
    const px = (hover.x - hover.y) * HW, py = (hover.x + hover.y) * HH;
    ctx.strokeStyle = 'rgba(76,215,192,.5)'; ctx.lineWidth = 1.4 / cam.z;
    ctx.beginPath(); ctx.ellipse(px, py + 1, 11 * hover.scale, 5.5 * hover.scale, 0, 0, 6.2832); ctx.stroke();
  }

  ctx.restore();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  return drawn;
}

function drawDyn(d, t) {
  if (d.kind === 0) F.drawAgent(ctx, d.o, t, d.o === sel);
  else if (d.kind === 1) F.drawSwimmer(ctx, d.o, t);
  else F.drawBot(ctx, d.o, t);
}

/* ---------- Dauerhafter Zustand ----------
   Die Etage selbst muss nicht gespeichert werden: gleicher Seed, gleiche Räume,
   gleiche Möbel, gleiche Arbeitsplätze — in derselben Reihenfolge. Gespeichert
   wird nur, was sich bewegt: wo jede Figur steht, was sie gerade tut und welchen
   Platz sie belegt. Das sind rund 20 KB statt mehrerer Megabyte. */
const store = F.store;
let speicherArt = 'none', darfSchreiben = false, letzteSicherung = 0, sicherungLaeuft = false;

function zustandLesen() {
  const liste = new Array(W.agents.length);
  for (let i = 0; i < W.agents.length; i++) {
    const a = W.agents[i];
    liste[i] = [
      Math.round(a.x * 100) / 100, Math.round(a.y * 100) / 100, a.dir,
      a.state, Math.round(a.timer * 10) / 10,
      a.acc || '', a.taskKey || '', a.step | 0,
      a.dest && a.dest.station ? a.dest.station.idx : -1,
      a.dest && a.dest.seat ? a.dest.seat.idx : (a.seat ? a.seat.idx : -1),
      a.room
    ];
  }
  return { fassung: 1, seed: W.seed, gespeichert: new Date().toISOString(), figuren: liste };
}

function zustandSchreiben(doc) {
  if (!doc || doc.seed !== W.seed || !Array.isArray(doc.figuren)) return false;

  /* alle Belegungen lösen, danach genau die gespeicherten wieder setzen */
  for (let i = 0; i < W.seats.length; i++) W.seats[i].taken = false;
  for (let i = 0; i < W.stations.length; i++) W.stations[i].busy = 0;

  const n = Math.min(doc.figuren.length, W.agents.length);
  for (let i = 0; i < n; i++) {
    const a = W.agents[i], d = doc.figuren[i];
    if (!Array.isArray(d)) continue;
    a.x = d[0]; a.y = d[1]; a.dir = d[2] | 0;
    a.timer = d[4]; a.acc = d[5] || null;
    a.step = d[7] | 0;
    if (d[10] >= 0) a.room = d[10];
    a.seat = null; a.dest = null; a.path = null; a.sitting = false; a.moving = false;

    a.taskKey = d[6] || null;
    a.task = a.taskKey ? TASKS[a.taskKey] : null;
    a.plan = a.task ? a.task.steps : null;
    const schritt = a.plan ? a.plan[a.step] : null;

    if (!schritt) { a.task = null; a.taskKey = null; a.plan = null; a.state = 'idle'; a.timer = rng.f(1, 6); continue; }

    const platz = d[8] >= 0 ? W.stations[d[8]] : null;
    const sitz  = d[9] >= 0 ? W.seats[d[9]] : null;
    const ziel = { x: a.x, y: a.y, station: platz || null, seat: sitz || null, label: '—' };
    if (platz) { platz.busy = a.id; ziel.x = platz.x; ziel.y = platz.y; ziel.label = stationLabel(platz); }
    if (sitz) {
      sitz.taken = true; ziel.x = sitz.x; ziel.y = sitz.y;
      const r = W.rooms[sitz.room];
      if (!platz) ziel.label = 'Sitzplatz · ' + (r ? r.name + ' #' + r.no : 'Etage');
    }
    a.dest = ziel; a.targetLabel = ziel.label;

    if (d[3] === 'work') {
      a.state = 'work'; a.doing = schritt.doing;
      a.x = ziel.x; a.y = ziel.y;
      if (sitz) { a.sitting = true; a.dir = sitz.face; }
    } else if (d[3] === 'walk') {
      /* Weg neu berechnen — Kacheln sind dieselben, der Pfad ist schnell gefunden */
      const weg = F.findPath(W, Math.floor(a.x), Math.floor(a.y), Math.floor(ziel.x), Math.floor(ziel.y));
      if (weg) { a.path = weg; a.pi = 0; a.state = 'walk'; a.moving = true; a.doing = schritt.go || schritt.doing; }
      else { releaseDest(a); a.state = 'idle'; a.timer = rng.f(1, 4); a.task = null; a.taskKey = null; a.plan = null; }
    } else {
      releaseDest(a);
      a.state = 'idle'; a.doing = 'nimmt die Arbeit wieder auf';
    }
  }
  return true;
}

function sichern(grund) {
  if (!W || !darfSchreiben || sicherungLaeuft || speicherArt === 'none') return;
  sicherungLaeuft = true;
  store.save(zustandLesen()).then(function (ok) {
    sicherungLaeuft = false;
    if (ok) { letzteSicherung = Date.now(); speicherAnzeige(); }
  }, function () { sicherungLaeuft = false; });
}

function speicherAnzeige() {
  const el = $('save-state');
  if (!el) return;
  if (speicherArt === 'none') { el.textContent = 'kein Speicher verfügbar'; el.className = 'off'; return; }
  if (!darfSchreiben) { el.textContent = store.label() + ' · nur lesend'; el.className = 'ro'; return; }
  const s = letzteSicherung ? Math.round((Date.now() - letzteSicherung) / 1000) : -1;
  el.textContent = store.label() + (s < 0 ? ' · bereit' : s < 5 ? ' · gerade gesichert' : ' · vor ' + s + ' s gesichert');
  el.className = 'on';
}

/* ---------- Minikarte ---------- */
function buildMiniBase() {
  miniBase = document.createElement('canvas');
  miniBase.width = mini.width; miniBase.height = mini.height;
  const g = miniBase.getContext('2d');
  const s = mini.width / MAP;
  g.fillStyle = '#070a12'; g.fillRect(0, 0, mini.width, mini.height);
  /* Gänge */
  g.fillStyle = '#1c2331';
  for (let y = 0; y < MAP; y++)
    for (let x = 0; x < MAP; x++)
      if (W.tiles[y * MAP + x] === F.HALL) g.fillRect(x * s, y * s, s + 0.6, s + 0.6);
  /* Räume */
  W.rooms.forEach(function (r) {
    const th = F.THEMES[r.theme];
    g.fillStyle = th.accent; g.globalAlpha = 0.30;
    g.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
    g.globalAlpha = 0.85; g.strokeStyle = th.accent; g.lineWidth = 0.6;
    g.strokeRect(r.x * s, r.y * s, r.w * s, r.h * s);
    g.globalAlpha = 1;
  });
}

function drawMini() {
  const s = mini.width / MAP;
  mctx.drawImage(miniBase, 0, 0);
  /* Figuren */
  mctx.fillStyle = 'rgba(230,240,255,.8)';
  for (let i = 0; i < W.agents.length; i += 2) {
    const a = W.agents[i];
    mctx.fillRect(a.x * s - 0.5, a.y * s - 0.5, 1.4, 1.4);
  }
  /* Sichtfeld */
  const c1 = screenToTile(0, 0), c2 = screenToTile(view.w, 0);
  const c3 = screenToTile(view.w, view.h), c4 = screenToTile(0, view.h);
  mctx.strokeStyle = '#4cd7c0'; mctx.lineWidth = 1;
  mctx.beginPath();
  mctx.moveTo(c1[0] * s, c1[1] * s); mctx.lineTo(c2[0] * s, c2[1] * s);
  mctx.lineTo(c3[0] * s, c3[1] * s); mctx.lineTo(c4[0] * s, c4[1] * s);
  mctx.closePath(); mctx.stroke();
}

/* ---------- Oberfläche ---------- */
function buildRoomList() {
  const ul = $('room-list');
  ul.innerHTML = '';
  W.rooms.slice().sort(function (a, b) { return a.name.localeCompare(b.name); }).forEach(function (r) {
    const th = F.THEMES[r.theme];
    const li = document.createElement('li');
    li.dataset.id = r.id;
    li.dataset.search = (r.name + ' ' + th.label + ' ' + r.no).toLowerCase();
    li.innerHTML = '<span class="dot" style="background:' + th.accent + '"></span>' +
                   '<span class="nm">' + r.name + '</span>' +
                   '<span class="no">#' + r.no + '</span>';
    li.addEventListener('click', function () {
      tourOn = false; $('btn-tour').classList.remove('on'); $('btn-tour').textContent = '▶ Tour';
      centerOn(r.cx, r.cy, true, Math.max(cam.z, 0.9));
      $('sidebar').classList.remove('open');
    });
    ul.appendChild(li);
  });
}

function updateStats() {
  $('stats').innerHTML =
    '<b>' + W.rooms.length + '</b> Bereiche · <b>' + W.agents.length + '</b> Figuren · <b>' +
    (W.props.length > 999 ? (W.props.length / 1000).toFixed(1) + 'k' : W.props.length) + '</b> Objekte · Seed <b>' + W.seed + '</b>';
}

function updateLocBar() {
  const c = screenToTile(view.w / 2, view.h / 2);
  const x = Math.round(c[0]), y = Math.round(c[1]);
  let name = 'Zwischendeck';
  let id = -1;
  if (x >= 0 && y >= 0 && x < MAP && y < MAP) {
    const i = y * MAP + x;
    if (W.room[i] >= 0) { const r = W.rooms[W.room[i]]; name = r.name + ' #' + r.no; id = r.id; }
    else if (W.tiles[i] === F.HALL) name = 'Verbindungsgang';
    else if (W.tiles[i] === F.VOID) name = 'Aussenbereich';
  }
  $('locname').textContent = name;
  $('loccoord').textContent = x + ' / ' + y + ' · ' + Math.round(cam.z * 100) + '%';
  if (id !== activeRoom) {
    activeRoom = id;
    const items = $('room-list').children;
    for (let i = 0; i < items.length; i++)
      items[i].classList.toggle('active', +items[i].dataset.id === id);
  }
}

/* Welche Figur liegt unter diesem Bildschirmpunkt? Vorderste gewinnt. */
function hitTest(sx, sy) {
  const wx = (sx - cam.x) / cam.z, wy = (sy - cam.y) / cam.z;
  let best = null, bestKey = -1e9;
  for (let i = 0; i < W.agents.length; i++) {
    const a = W.agents[i];
    const px = (a.x - a.y) * HW, py = (a.x + a.y) * HH;
    const s = a.scale * 1.45;
    if (wx < px - 9 * s || wx > px + 9 * s) continue;
    if (wy < py - 35 * s || wy > py + 5 * s) continue;
    const key = a.x + a.y;
    if (key > bestKey) { bestKey = key; best = a; }
  }
  return best;
}

function findHover() {
  const tip = $('tooltip');
  if (!mouse.inside) { hover = null; tip.hidden = true; return; }
  hover = hitTest(mouse.x, mouse.y);
  cv.style.cursor = hover ? 'pointer' : (drag ? 'grabbing' : 'grab');
  if (hover && hover !== sel) {
    tip.hidden = false;
    tip.innerHTML = hover.name + ' <i>· ' + hover.role + '</i>';
    tip.style.left = Math.min(view.w - tip.offsetWidth - 8, mouse.x + 14) + 'px';
    tip.style.top = (mouse.y + 16) + 'px';
  } else tip.hidden = true;
}

/* ---------- Infokarte ---------- */
function selectAgent(a) {
  sel = a;
  follow = false;
  const card = $('card');
  $('card-follow').classList.remove('on');
  $('card-follow').textContent = 'Folgen';
  if (!a) { card.hidden = true; return; }
  card.hidden = false;
  $('card-name').textContent = a.name;
  $('card-role').textContent = a.role;
  $('card-no').textContent = 'Dienstnummer E17-' + String(a.id).padStart(4, '0');
  updateCard();
}

function fact(k, v) { return '<dt>' + k + '</dt><dd>' + v + '</dd>'; }

function updateCard() {
  if (!sel) return;
  const a = sel, r = W.rooms[a.room];
  const state = a.state === 'work' ? (a.sitting ? 'sitzt und arbeitet' : 'arbeitet')
             : a.state === 'walk' ? 'unterwegs'
             : a.sitting ? 'sitzt' : 'wartet';
  $('card-facts').innerHTML =
    fact('Bereich', r ? r.name + ' <b>#' + r.no + '</b>' : 'Zwischendeck') +
    fact('Aufgabe', a.task ? '<b>' + a.task.label + '</b>' : 'keine') +
    fact('Zustand', state) +
    fact('Tätigkeit', a.doing) +
    fact('Ziel', a.targetLabel || '—') +
    fact('Dabei', a.acc ? (F.ACC_DE[a.acc] || a.acc) : 'nichts') +
    fact('Tempo', a.state === 'walk' ? a.speed.toFixed(1) + ' Kacheln/s' : '—') +
    fact('Position', Math.round(a.x) + ' / ' + Math.round(a.y)) +
    fact('An Bord', 'seit ' + a.since + ' Jahren');
}

/* Porträt in der Karte — dieselbe Figur, nur gross und ruhig stehend */
function drawAvatar(t) {
  avctx.setTransform(1, 0, 0, 1, 0, 0);
  avctx.clearRect(0, 0, av.width, av.height);
  if (!sel) return;
  const k = 3.1;
  avctx.setTransform(k, 0, 0, k, av.width / 2, av.height - 24);
  const ghost = Object.create(sel);
  ghost.x = 0; ghost.y = 0; ghost.dir = 2;
  ghost.moving = false; ghost.sitting = false; ghost.emote = 0;
  F.drawAgent(avctx, ghost, t, false);
}

/* ---------- Eingabe ---------- */
function resize() {
  view.dpr = Math.min(2, window.devicePixelRatio || 1);
  view.w = window.innerWidth; view.h = window.innerHeight;
  cv.width = Math.round(view.w * view.dpr);
  cv.height = Math.round(view.h * view.dpr);
  cv.style.width = view.w + 'px'; cv.style.height = view.h + 'px';
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}
window.addEventListener('resize', resize);

let drag = null;
cv.addEventListener('pointerdown', function (e) {
  drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false };
  cam.tw = null;
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
  cv.classList.add('dragging');
});
cv.addEventListener('pointermove', function (e) {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.inside = true;
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  cam.x = drag.cx + dx; cam.y = drag.cy + dy;
  stopTour(); stopFollow();
});
function endDrag(e) {
  if (drag) { cv.classList.remove('dragging'); try { cv.releasePointerCapture(e.pointerId); } catch (_) {} }
  drag = null;
}
cv.addEventListener('pointerup', function (e) {
  const wasDrag = drag && drag.moved;
  endDrag(e);
  if (wasDrag) return;
  const a = hitTest(e.clientX, e.clientY);
  if (a) stopTour();
  selectAgent(a);
});
cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('pointerleave', function () { mouse.inside = false; $('tooltip').hidden = true; });

cv.addEventListener('wheel', function (e) {
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.14 : 1 / 1.14);
  stopTour();
}, { passive: false });

/* Zwei-Finger-Zoom */
let pinch = null;
cv.addEventListener('touchstart', function (e) {
  if (e.touches.length === 2) {
    pinch = { d: touchDist(e), z: cam.z };
    drag = null;
  }
}, { passive: true });
cv.addEventListener('touchmove', function (e) {
  if (pinch && e.touches.length === 2) {
    e.preventDefault();
    const mx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const my = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const f = (touchDist(e) / pinch.d) * pinch.z / cam.z;
    zoomAt(mx, my, f);
  }
}, { passive: false });
cv.addEventListener('touchend', function () { pinch = null; });
function touchDist(e) {
  return Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY);
}

const keys = {};
window.addEventListener('keydown', function (e) {
  if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') e.target.blur(); return; }
  keys[e.key.toLowerCase()] = true;
  const k = e.key.toLowerCase();
  if (k === 't') toggleTour();
  if (k === 'h' || k === '?') toggleHelp();
  if (k === 'r') reshuffle();
  if (k === 'escape') { $('modal').hidden = true; $('sidebar').classList.remove('open'); selectAgent(null); }
  if (k === '+' || k === '=') zoomAt(view.w / 2, view.h / 2, 1.2);
  if (k === '-') zoomAt(view.w / 2, view.h / 2, 1 / 1.2);
});
window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });

mini.addEventListener('click', function (e) {
  const r = mini.getBoundingClientRect();
  const tx = (e.clientX - r.left) / r.width * MAP;
  const ty = (e.clientY - r.top) / r.height * MAP;
  stopTour();
  centerOn(tx, ty, true);
});

$('search').addEventListener('input', function (e) {
  const q = e.target.value.trim().toLowerCase();
  const items = $('room-list').children;
  for (let i = 0; i < items.length; i++)
    items[i].style.display = !q || items[i].dataset.search.indexOf(q) >= 0 ? '' : 'none';
});

$('btn-zoom-in').onclick = function () { zoomAt(view.w / 2, view.h / 2, 1.25); };
$('btn-zoom-out').onclick = function () { zoomAt(view.w / 2, view.h / 2, 1 / 1.25); };
$('btn-help').onclick = toggleHelp;
$('btn-close').onclick = toggleHelp;
$('btn-tour').onclick = toggleTour;
$('btn-shuffle').onclick = reshuffle;
$('btn-menu').onclick = function () { $('sidebar').classList.toggle('open'); };
$('card-close').onclick = function () { selectAgent(null); };
$('card-goto').onclick = function () { if (sel) centerOn(sel.x, sel.y, true, Math.max(cam.z, 1.2)); };
$('card-follow').onclick = function () {
  if (!sel) return;
  follow = !follow;
  this.classList.toggle('on', follow);
  this.textContent = follow ? 'Folgt' : 'Folgen';
  if (follow) stopTour();
};
$('modal').addEventListener('click', function (e) { if (e.target.id === 'modal') toggleHelp(); });

function toggleHelp() { const m = $('modal'); m.hidden = !m.hidden; }

function toggleTour() {
  tourOn = !tourOn;
  $('btn-tour').classList.toggle('on', tourOn);
  $('btn-tour').textContent = tourOn ? '■ Tour' : '▶ Tour';
  tourTimer = tourOn ? 0.01 : 0;
}
function stopFollow() {
  if (!follow) return;
  follow = false;
  $('card-follow').classList.remove('on');
  $('card-follow').textContent = 'Folgen';
}

function stopTour() {
  if (!tourOn) return;
  tourOn = false;
  $('btn-tour').classList.remove('on');
  $('btn-tour').textContent = '▶ Tour';
}

function reshuffle() {
  if (darfSchreiben && speicherArt !== 'none' && letzteSicherung &&
      !window.confirm('Neue Etage würfeln? Der gespeicherte Stand dieser Etage geht dabei verloren.')) return;
  const seed = (Math.random() * 1e9) | 0;
  letzteSicherung = 0;
  store.clear();
  $('boot').style.display = '';
  $('boot').classList.remove('done');
  $('boot-fill').style.width = '0%';
  stopTour();
  selectAgent(null);
  boot(seed);
}

/* ---------- Hauptschleife ---------- */
let last = 0, fpsAcc = 0, fpsN = 0, miniTick = 0;

function frame(now) {
  requestAnimationFrame(frame);
  if (!W) return;
  const t = now / 1000;
  let dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
  last = now;

  /* Tastatur-Bewegung */
  const sp = 620 * dt / cam.z * (cam.z < 0.5 ? 1.6 : 1);
  let mx = 0, my = 0;
  if (keys.a || keys.arrowleft) mx += sp;
  if (keys.d || keys.arrowright) mx -= sp;
  if (keys.w || keys.arrowup) my += sp;
  if (keys.s || keys.arrowdown) my -= sp;
  if (mx || my) { cam.x += mx * cam.z; cam.y += my * cam.z; cam.tw = null; stopTour(); stopFollow(); }

  /* Kamerafahrt */
  if (cam.tw) {
    const tw = cam.tw;
    tw.t += dt;
    let k = Math.min(1, tw.t / tw.d);
    k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;   // weiche Kurve
    cam.x = tw.fx + (tw.tx - tw.fx) * k;
    cam.y = tw.fy + (tw.ty - tw.fy) * k;
    cam.z = tw.fz + (tw.tz - tw.fz) * k;
    if (k >= 1) cam.tw = null;
  }

  /* Tour */
  if (tourOn) {
    tourTimer -= dt;
    if (tourTimer <= 0) {
      tourTimer = 9;
      tourIdx = (tourIdx + 1 + ((Math.random() * 3) | 0)) % W.rooms.length;
      const r = W.rooms[tourIdx];
      centerOn(r.cx, r.cy, true, 0.75 + Math.random() * 0.5);
    }
  }

  /* Welt */
  for (let i = 0; i < W.agents.length; i++) updateAgent(W.agents[i], dt);
  for (let i = 0; i < W.swimmers.length; i++) updateSwimmer(W.swimmers[i], dt);
  for (let i = 0; i < W.bots.length; i++) updateBot(W.bots[i], dt);

  /* Kamera hängt an der gewählten Figur */
  if (sel && follow) {
    const p = F.iso(sel.x, sel.y);
    const k = Math.min(1, dt * 3.5);
    cam.x += (view.w / 2 - p[0] * cam.z - cam.x) * k;
    cam.y += (view.h / 2 - p[1] * cam.z - cam.y) * k;
    cam.tw = null;
  }

  findHover();
  draw(t, dt);
  updateLocBar();

  miniTick++;
  if (miniTick % 5 === 0) drawMini();
  if (sel) {
    if (miniTick % 2 === 0) drawAvatar(t);
    if (miniTick % 20 === 0) updateCard();
  }
}

/* ---------- Start ---------- */
resize();
requestAnimationFrame(frame);

store.init().then(function (art) {
  speicherArt = art;
  return store.load();
}).then(function (doc) {
  return store.claim().then(function (darf) {
    darfSchreiben = darf;
    speicherAnzeige();
    const passt = doc && doc.seed !== undefined && Array.isArray(doc.figuren);
    boot(passt ? doc.seed : (Math.random() * 1e9) | 0, passt ? doc : null);
    /* regelmässig sichern, und bevor der Tab verschwindet */
    setInterval(function () { sichern('takt'); }, 12000);
    setInterval(function () {
      store.claim().then(function (d) { if (d !== darfSchreiben) { darfSchreiben = d; speicherAnzeige(); } });
    }, 60000);
    setInterval(speicherAnzeige, 5000);
    window.addEventListener('pagehide', function () { sichern('ende'); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') sichern('versteckt');
    });
  });
}).catch(function () {
  speicherArt = 'none'; darfSchreiben = false; speicherAnzeige();
  boot((Math.random() * 1e9) | 0, null);
});

})(window.E17);
