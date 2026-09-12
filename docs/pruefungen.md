# Prüfungen

Es gibt keinen Testrahmen als Abhängigkeit. Geprüft wird mit Bordmitteln — der
Generator kopflos in Node, die Oberfläche im Browser.

## Generator

```bash
node tools/test-welt.js              # fünf feste Seeds
node tools/test-welt.js 4711 1234    # eigene Seeds
```

Fällt mit Rückgabewert 1 aus, wenn eine der Bedingungen verletzt ist:

| Bedingung | Warum |
| --- | --- |
| Weg zwischen dem ersten und letzten Raum existiert | Gänge verbinden tatsächlich |
| Vernetzung über 98 % | keine abgeschnittenen Inseln |
| mindestens 8 Bereiche | Flächenteilung greift |
| über 50 Arbeitsplätze | Aufgaben finden Ziele |
| Determinismus bei gleichem Seed | Grundlage der Speicherung, siehe [Entscheidung 9](entscheidungen.md) |

Der Determinismus-Teil vergleicht zwei Läufe desselben Seeds Feld für Feld:
Anzahl und Reihenfolge der Arbeitsplätze, Sitzplätze und Figuren samt Namen und Rollen.
**Diese Prüfung ist die wichtigste** — schlägt sie fehl, lassen sich gespeicherte Stände
nicht mehr zuordnen.

## Oberfläche

Seite starten und im Browser öffnen:

```bash
python3 -m http.server 8017
```

Worauf zu achten ist:

1. **Konsole** — muss fehlerfrei bleiben, auch beim Würfeln einer neuen Etage (`R`).
2. **Bildrate** — 60/s bei voller Etage, auch herausgezoomt auf etwa 24 %.
3. **Figuren** — laufen sie flüssig, ohne über den Boden zu rutschen? Stehen sie beim
   Arbeiten dem Möbelstück zugewandt?
4. **Infokarte** — Klick auf eine Figur. *Aufgabe*, *Ziel* und *Dabei* müssen
   zueinander passen: wer „prüft Kabel", trägt Werkzeug, nicht eine Kiste.
5. **Aufgabenwechsel** — eine Figur eine Minute beobachten. Sie muss Schritte
   abarbeiten, Gegenstände aufnehmen und ablegen und danach eine neue Aufgabe beginnen.
   Niemand darf dauerhaft „wartet auf den nächsten Auftrag" anzeigen.

## Dauerhafter Zustand

Das Verfahren, mit dem nachgewiesen wurde, dass ein Stand **fortgesetzt** und nicht
mit gleichem Seed **neu erzeugt** wird — beides sieht auf den ersten Blick gleich aus,
weil derselbe Seed dieselbe Etage ergibt:

1. Seite öffnen, etwa 45 Sekunden laufen lassen (die Figuren entfernen sich dabei weit
   von ihren Startplätzen).
2. Gesicherten Stand **A** auslesen:
   `JSON.parse(localStorage.getItem('etage17.zustand'))`
3. Seite neu laden, 16 Sekunden warten (eine Sicherung läuft alle 12 s), Stand **B**
   auslesen.
4. Startaufstellung **S** in Node erzeugen: `E17.generate(seedA).agents`
5. Mittlere Abstände vergleichen. Fortgesetzt heisst: **|A−B| ist klein gegenüber |A−S|.**

Gemessen wurden 8,0 Kacheln (A→B) gegen 24,8 Kacheln (A→S) bei 167 Figuren; 141 davon
führten dieselbe Aufgabe über den Neustart hinweg fort.

Zusätzlich zu prüfen:

- Die Anzeige unter der Minikarte nennt den verwendeten Speicher und wechselt nach einer
  Sicherung auf „gerade gesichert".
- `R` fragt nach, bevor ein gesicherter Stand verworfen wird.
- Ohne verfügbaren Speicher (privates Fenster mit blockiertem Speicher) läuft die Seite
  unverändert weiter und zeigt „kein Speicher verfügbar".

## Nach dem Veröffentlichen

Ein Push auf `main` geht innerhalb einer halben Minute live. Danach:

```bash
gh api repos/schmidt-software/ebene17/pages/builds/latest --jq '.status, .error.message'

B=https://schmidt-software.github.io/ebene17
for P in / /styles.css /js/store.js /js/world.js /js/render.js /js/app.js; do
  curl -s -o /dev/null -w "%{http_code} %{content_type}  $P\n" "$B$P"
done
```

Erwartet wird `built` ohne Fehlermeldung und sechsmal `200` mit passendem Inhaltstyp.
Ein `404` auf eine der Skriptdateien deutet auf einen absoluten Pfad hin — die Seite
liegt im Unterverzeichnis `/ebene17/`, nicht an der Wurzel der Domain. Danach die
Live-Adresse einmal im Browser öffnen und die [Oberflächen-Prüfungen](#oberfläche)
durchgehen.
