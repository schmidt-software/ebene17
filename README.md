# Etage 17

Eine endlose isometrische Etage im Browser — prozedural erzeugt, animiert, ohne
Abhängigkeiten. Ziehen, zoomen, entdecken.

![Bereiche](https://img.shields.io/badge/Bereiche-20--28-4cd7c0) ![Technik](https://img.shields.io/badge/Technik-Canvas%202D-8fa8ff)

## Starten

Ein beliebiger statischer Server genügt:

```bash
python3 -m http.server 8017
# http://localhost:8017
```

(`index.html` läuft auch direkt per Doppelklick — es werden keine ES-Module
geladen, daher gibt es keine CORS-Probleme.)

## Steuerung

| Eingabe | Wirkung |
| --- | --- |
| Klick auf eine Figur | Infokarte mit Porträt, Name, Bereich und Tätigkeit |
| Ziehen / Wischen | Etage verschieben |
| Mausrad, Zwei-Finger-Geste | Zoomen |
| `W` `A` `S` `D`, Pfeiltasten | Bewegen |
| `+` / `−` | Zoomen |
| `T` | Automatische Tour |
| `R` | Neue Etage würfeln |
| `H` | Hilfe |

Klick auf einen Bereich in der Seitenleiste oder in die Minikarte springt dorthin.
Der Mauszeiger über einer Figur zeigt Name und Rolle, ein Klick öffnet die Infokarte:
ein mitlaufendes Porträt, Dienstnummer, aktueller Bereich, Zustand, Tätigkeit und
was die Figur gerade trägt — dazu **Folgen**, damit die Kamera an ihr hängen bleibt.

## Aufbau

```
index.html               Gerüst und Oberfläche
styles.css               dunkles Terminal-Layout
js/world.js              Weltgenerator: Räume, Gänge, Möblierung, Arbeitsplätze, Wegsuche
js/render.js             isometrische Zeichenprimitive und alle Objekttypen
js/store.js              Speicherschicht: Datenbank, sonst Browser-Speicher
js/app.js                Kamera, Eingabe, Aufgabensteuerung, Hauptschleife
artifact.html            erzeugt — dieselbe Seite ohne Rahmen-Tags
tools/test-welt.js       prüft den Generator ohne Browser
tools/baue-artefakt.js   erzeugt artifact.html aus index.html
docs/                    Entwicklung, Entscheidungen, Prüfungen
```

Keine Abhängigkeiten, kein Bauschritt, keine Bilddateien: rund 2 600 Zeilen
HTML, CSS und JavaScript, gezeichnet auf einem Canvas.

### Wie die Etage entsteht

1. **Aufteilen** — ein 148×148-Raster wird per BSP in Flächen zerlegt, jede Fläche
   bekommt mit Rand einen Raum.
2. **Verbinden** — die Räume werden der Reihe nach mit L-förmigen Gängen verbunden,
   dazu ein paar Querverbindungen. Gegraben wird nur ins Leere, Räume bleiben
   unversehrt; wo ein Gang auf eine Wand trifft, entsteht eine Türöffnung.
3. **Wände** — an jeder Kante zum Leeren wird ein niedriger Quader gesetzt.
4. **Möblieren** — jedes der zwölf Themen (Serverraum, Kantine, Labor, Pool, Kino,
   Arcade, Bibliothek, Gewächshaus, Werkstatt, Büro, Sporthalle, Startrampe) hat
   eine eigene Funktion, die Objekte und Sitzplätze verteilt.
5. **Arbeitsplätze eintragen** — jedes Möbelstück, an dem sich etwas tun lässt,
   wird mit einem erreichbaren Stehplatz davor registriert und nach Zweck einsortiert:
   Serverschränke und Maschinen als `wartung`, Regale und Spinde als `inventur`,
   Kisten als `quelle` und `abgabe`, die Essensausgabe als `ausgabe`, Beete als
   `pflege`, Automaten als `freizeit`. Häufige Möbel nur stichprobenweise, damit
   nicht jedes einzelne Regal zum Posten wird — je Etage rund 300–650 Plätze.
6. **Bevölkern** — 190–270 Figuren mit eigenen Merkmalen: Größe, Hautton, Kleidung,
   Schuhe, eine von sechs Frisuren, manchmal ein Namensschild. Was sie in der Hand
   halten, entscheidet dagegen die laufende Aufgabe.

### Was die Figuren tun

Sie laufen nicht zufällig herum, sondern arbeiten **Aufgaben aus mehreren Schritten**
ab. Ein Schritt heißt: zu einem passenden Arbeitsplatz laufen, dort eine Weile etwas
tun, dabei etwas in die Hand nehmen oder ablegen.

| Aufgabe | Ablauf |
| --- | --- |
| Wartungsrunde | Werkzeug holen → Anlage prüfen → Bauteil tauschen |
| Inventur | Posten zählen → Nummern notieren → am Schreibtisch eintragen |
| Transport | Kiste im Lager aufnehmen → zum Abgabeort bringen → ablegen |
| Pause | Becher an der Ausgabe holen → freien Sitzplatz suchen → sitzen |
| Pflanzenpflege | gießen → nächste Pflanze → Triebe schneiden |
| Ausgabedienst | an der Ausgabe stehen → Nachschub holen → einräumen |
| Schreibtischarbeit | an den Platz setzen und arbeiten |
| Rundgang, Freizeit, Training | Runde gehen, Automat, Trainingsgerät |

Welche Aufgabe eine Figur bekommt, hängt an ihrer **Rolle**: Technik wartet und
inventarisiert, Logistik transportiert, Küche steht an der Ausgabe, Gärtnerei pflegt
die Beete. In einem Viertel der Fälle wird stattdessen etwas Privates gezogen —
Pause, Freizeit, Training.

Arbeitsplätze und Sitzplätze werden **reserviert**, solange jemand sie nutzt, damit
nicht zwei Figuren im selben Regal stehen. Ziele werden aus einer Stichprobe nach
Nähe gewählt (fremde Räume mit Zuschlag), sodass niemand ständig quer über die Etage
läuft. Findet sich kein passender Platz oder kein Weg, bricht die Aufgabe sauber ab
und die Figur sucht sich eine neue — hängenbleiben kann niemand.

Die Infokarte macht das alles sichtbar: **Aufgabe**, **Zustand** (unterwegs,
arbeitet, sitzt, wartet), aktuelle **Tätigkeit** und das konkrete **Ziel** —
etwa „Regal · Bibliothek #1722".

Alles hängt an einem Seed: gleicher Seed, gleiche Etage.

### Zeichnung

Es gibt keine Bilddateien. Jedes Objekt ist ein isometrischer Quader aus drei
Flächen (Deckel, zwei Seiten, automatisch abgestuft) plus etwas Eigenleben —
blinkende LEDs, laufende Förderbänder, flackernde Leinwand, schwankende Blätter,
Dampf über der Essensausgabe. Statische Objekte werden einmalig nach Tiefe
sortiert, bewegliche pro Bild eingeschmolzen; gezeichnet wird nur, was im Bild
liegt.

## Dauerhafter Zustand

Die Etage überlebt das Schliessen des Tabs. Gespeichert wird **nicht** die Etage
selbst — gleicher Seed erzeugt bit-genau dieselben Räume, Möbel, Arbeitsplätze und
Figuren, in derselben Reihenfolge. Gespeichert wird nur, was sich bewegt:

```
{ fassung, seed, gespeichert,
  figuren: [ [x, y, dir, zustand, timer, gegenstand, aufgabe, schritt,
              arbeitsplatz, sitzplatz, raum], … ] }
```

Rund 8–15 KB je Etage statt mehrerer Megabyte. Beim Laden wird die Etage aus dem
Seed neu gebaut, danach werden Positionen, Aufgaben und Platzreservierungen
daraufgelegt; wer unterwegs war, bekommt seinen Weg neu berechnet.

**Wohin gespeichert wird**, entscheidet sich beim Start und steht unter der Minikarte:

1. **Artefakt-Datenbank** — wenn die Seite in einer Laufzeit läuft, die sie
   bereitstellt. Geteilt, überdauert Sitzungen und Geräte. Damit nicht mehrere Tabs
   gegeneinander schreiben, holt sich einer per Kurzzeitsperre (`acquire`) das
   Schreibrecht, die übrigen laufen nur lesend mit.
2. **Browser-Speicher** — sonst. Nur dieses Gerät, aber ohne jede Einrichtung; so
   läuft auch die lokale Fassung dauerhaft.
3. **Gar nichts** — falls beides fehlt, läuft die Seite unverändert weiter.

> Die veröffentlichte Fassung meldet die Datenbank **bewusst nicht** an: eine Seite,
> die das tut, ist organisationsintern und lässt sich nicht öffentlich teilen.
> Sie speichert daher im Browser des jeweiligen Betrachters. Ebene 1 bleibt im Code,
> greift aber nur, wenn die Fähigkeit angemeldet ist.

Gesichert wird alle 12 Sekunden sowie beim Verlassen oder Verstecken des Tabs.
`R` (neue Etage) verwirft den Stand und fragt vorher nach.

## Prüfen

```bash
node tools/test-welt.js        # Generator, Wegfindung, Determinismus
node tools/baue-artefakt.js    # artifact.html neu erzeugen
```

Der Determinismus-Test ist der wichtigste: die Speicherung beruht darauf, dass
derselbe Seed dieselbe Etage in derselben Reihenfolge liefert. Das Verfahren für
alles Weitere — Oberfläche, Verhalten, Fortsetzen eines Standes — steht in
[docs/pruefungen.md](docs/pruefungen.md).

## Weiterlesen

- [docs/entwicklung.md](docs/entwicklung.md) — wie das Projekt entstand, welche Fehler
  auftraten und wie sie gefunden wurden, dazu die gemessenen Werte
- [docs/entscheidungen.md](docs/entscheidungen.md) — dreizehn Entscheidungen mit
  Begründung und Folgekosten
- [docs/pruefungen.md](docs/pruefungen.md) — was geprüft wird und wie

## Hinweis

Eine eigenständige Hommage an das Genre der endlosen Wimmelbild-Animationen im
Stil von *floor796*. Code, Grafik und Figuren sind vollständig eigen — hier wird
zur Laufzeit ausschließlich aus Rechtecken gezeichnet.
