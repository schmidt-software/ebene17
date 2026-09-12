/* Prüft den Weltgenerator ohne Browser.
   Aufruf:  node tools/test-welt.js  [seed …]                                */
'use strict';
const path = require('path');
global.window = {};
require(path.join(__dirname, '..', 'js', 'world.js'));
const E = global.window.E17;

const seeds = process.argv.slice(2).map(Number).filter(n => !isNaN(n));
const liste = seeds.length ? seeds : [1, 7, 42, 12345, 999999];

let heil = true;
for (const seed of liste) {
  const t0 = Date.now();
  const W = E.generate(seed);
  const ms = Date.now() - t0;

  let begehbar = 0, erreichbar = 0;
  for (let i = 0; i < W.walk.length; i++) { if (W.walk[i]) begehbar++; if (W.reach[i]) erreichbar++; }
  const anteil = erreichbar / begehbar;

  /* Weg zwischen den am weitesten auseinanderliegenden Räumen */
  const a = E.findOpen(W, W.rooms[0]);
  const b = E.findOpen(W, W.rooms[W.rooms.length - 1]);
  const weg = a && b ? E.findPath(W, a.x, a.y, b.x, b.y) : null;

  /* Arbeitsplätze je Zweck */
  const zwecke = Object.keys(W.byUse).map(k => k + ':' + W.byUse[k].length).join(' ');

  const ok = weg && W.rooms.length >= 8 && anteil > 0.98 && W.stations.length > 50;
  if (!ok) heil = false;

  console.log(
    `seed ${String(seed).padEnd(8)} ${String(ms).padStart(3)}ms ` +
    `Räume=${String(W.rooms.length).padStart(2)} Objekte=${String(W.props.length).padStart(4)} ` +
    `Figuren=${String(W.agents.length).padStart(3)} Plätze=${String(W.stations.length).padStart(3)} ` +
    `vernetzt=${(anteil * 100).toFixed(1)}% Weg=${weg ? weg.length : 'KEINER'} ${ok ? '' : '  <-- FEHLER'}`
  );
  console.log(`          Zwecke: ${zwecke}`);
}

/* Determinismus: gleicher Seed muss Plätze und Figuren in gleicher Reihenfolge liefern.
   Darauf beruht die Speicherung — gesichert werden nur Indizes, keine Objekte. */
const A = E.generate(4711), B = E.generate(4711);
const deterministisch =
  A.stations.length === B.stations.length &&
  A.seats.length === B.seats.length &&
  A.agents.length === B.agents.length &&
  A.stations.every((s, i) => s.idx === B.stations[i].idx && s.kind === B.stations[i].kind && s.x === B.stations[i].x) &&
  A.seats.every((s, i) => s.idx === B.seats[i].idx && s.x === B.seats[i].x) &&
  A.agents.every((a, i) => a.name === B.agents[i].name && a.role === B.agents[i].role);
if (!deterministisch) heil = false;
console.log(`\nDeterminismus bei gleichem Seed: ${deterministisch ? 'ja' : 'NEIN'}`);
console.log(heil ? 'ALLE PRÜFUNGEN BESTANDEN' : 'PRÜFUNG FEHLGESCHLAGEN');
process.exit(heil ? 0 : 1);
