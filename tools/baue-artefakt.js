/* Erzeugt artifact.html aus index.html: gleiche Seite, nur ohne Rahmen-Tags,
   wie die Veröffentlichungsumgebung sie erwartet (sie liefert doctype, head und body).
   Aufruf:  node tools/baue-artefakt.js                                        */
'use strict';
const fs = require('fs');
const path = require('path');
const wurzel = path.join(__dirname, '..');

const quelle = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
const treffer = quelle.match(/<body>([\s\S]*)<\/body>/);
if (!treffer) { console.error('Kein <body> in index.html gefunden.'); process.exit(1); }

const seite = '<title>Ebene 17</title>\n<link rel="stylesheet" href="styles.css">\n\n' +
              treffer[1].trim() + '\n';
fs.writeFileSync(path.join(wurzel, 'artifact.html'), seite);
console.log('artifact.html geschrieben (' + seite.length + ' Zeichen)');
