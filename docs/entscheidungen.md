# Entscheidungen

Warum die Dinge so sind, wie sie sind — samt dem, was dadurch teurer wurde.

---

### 1 — Alles zur Laufzeit zeichnen, keine Bilddateien

**Lage.** Eine Wimmelbild-Etage braucht hunderte verschiedener Objekte.

**Entscheidung.** Jedes Objekt ist ein isometrischer Quader aus drei Flächen (Deckel,
zwei Seiten, automatisch abgestuft aus einer Grundfarbe) plus etwas Eigenleben. Kein
einziges Bild, keine Bibliothek.

**Folgen.** Kein Ladebalken, keine Netzlast, freie Farbwahl je Thema, alles skaliert
verlustfrei. Dafür ist jede Form Code, und komplexe Silhouetten (die Rakete) brauchen
Sonderbehandlung.

### 2 — Prozedural aus einem Seed statt handgebauter Karte

**Entscheidung.** Die Etage entsteht per Flächenteilung, Gängen und Möblierungsfunktionen
je Thema aus einer einzigen Zahl.

**Folgen.** Unbegrenzt viele Etagen, `R` würfelt eine neue. Der Preis: Räume lassen sich
nicht von Hand komponieren, und jede Änderung an der Möblierung verändert alle Etagen.
Der eigentliche Gewinn zeigte sich später bei der Speicherung (siehe 9).

### 3 — Gänge nur ins Leere graben

**Lage.** Gänge zwischen Raummittelpunkten würden quer durch die Räume schneiden.

**Entscheidung.** Beim Graben werden ausschliesslich leere Kacheln zu Gang; Raumkacheln
bleiben unberührt. Wände entstehen danach nur an Kanten zum Leeren — wo ein Gang
andockt, bleibt die Wand automatisch offen und bildet eine Türöffnung.

**Folgen.** Türen brauchen keine Sonderlogik. Alle geprüften Seeds erreichen 100 %
Vernetzung der begehbaren Fläche.

### 4 — Schrittanimation an der Strecke, nicht an der Uhr

**Lage.** Beim Drosseln des Tempos wären die Beine über den Boden gerutscht, weil die
Animation mit fester Frequenz lief.

**Entscheidung.** Jede Figur führt eine Schrittphase mit, die sich an der zurückgelegten
Strecke aufaddiert.

**Folgen.** Tempoänderungen wirken automatisch richtig. Der Faktor zwischen Strecke und
Phase bestimmt die Schrittlänge und musste einmal justiert werden (erst zu trippelig).

### 5 — Treffertest auf der gezeichneten Fläche

**Lage.** Ein Abstandstest in Kachelkoordinaten trifft daneben, weil Figuren hoch und
schmal sind, Kacheln aber breit und flach.

**Entscheidung.** Der Klick wird in Weltpixel umgerechnet und gegen den tatsächlich
gezeichneten Körperbereich geprüft; bei Überlappung gewinnt die vorderste Figur.

**Folgen.** Treffsicher auf jeder Zoomstufe. Bindet die Trefferfläche an die
Zeichenmasse — beide Stellen müssen zusammen geändert werden.

### 6 — Aufgaben statt Zufall, mit Arbeitsplätzen als Anker

**Lage.** Rolle und Tätigkeit waren blosse Beschriftungen; die Figuren irrten umher.

**Entscheidung.** Möbel werden zu Arbeitsplätzen mit Zweck und Stehplatz. Aufgaben sind
Folgen von Schritten über diese Plätze. Die Rolle wählt die Aufgabe.

**Folgen.** Das Verhalten wird lesbar und lässt sich auf der Infokarte belegen
(*Aufgabe*, *Ziel*). Zwei Zusatzkosten: Plätze müssen reserviert und wieder freigegeben
werden — auch bei jedem Abbruch — und jede Aufgabe braucht einen Weg zurück in den
Leerlauf, falls kein Platz oder kein Pfad zu finden ist.

### 7 — Häufige Möbel nur stichprobenweise als Arbeitsplatz

**Lage.** Jedes Regal als eigener Posten hätte tausende Plätze ergeben, in denen die
Suche nach dem nächstgelegenen freien untergeht.

**Entscheidung.** Je Möbeltyp eine Eintragungsdichte (Regale und Serverschränke 0,3,
Kisten 0,6, seltene Geräte 1,0).

**Folgen.** 286–649 Plätze je Etage — genug Auswahl, überschaubare Suche.

### 8 — Nur wenige Figuren starten sitzend

**Lage.** Ursprünglich wurden 35 % aller Sitzplätze vorbesetzt. Die Messung zeigte:
36 von 43 Figuren hatten keine Aufgabe, und die Sitzenden blockierten genau die Plätze,
die Pausen brauchen.

**Entscheidung.** Höchstens 40 Figuren starten sitzend, mit kurzem Zeitgeber; dafür mehr
laufende Belegschaft.

**Folgen.** Die Etage ist von der ersten Sekunde an in Betrieb.

### 9 — Speichern, was sich bewegt — nicht die Etage

**Lage.** Ein vollständiger Weltzustand wären mehrere Megabyte je Etage.

**Entscheidung.** Gespeichert werden Seed und elf Werte je Figur; Arbeits- und
Sitzplätze werden über ihren Index angesprochen. Beim Laden wird die Etage aus dem Seed
neu gebaut und der Stand daraufgelegt.

**Folgen.** 8–15 KB statt Megabyte. Bedingung ist strenger Determinismus: gleicher Seed
muss Plätze und Figuren in gleicher Reihenfolge liefern. `tools/test-welt.js` prüft das
bei jedem Lauf mit. **Wer die Erzeugung ändert, macht alte Sicherungen ungültig** —
darum trägt das Dokument ein Feld `fassung`.

### 10 — Speicherschicht mit drei Ebenen

**Entscheidung.** Artefakt-Datenbank, sonst Browser-Speicher, sonst gar nichts. Die
Anwendung kennt nur `store.load()` und `store.save()`.

**Folgen.** Dieselbe Datei läuft dauerhaft als lokale Seite und als veröffentlichtes
Artefakt. Bei endgültiger Absage der Datenbank (Zugriff verweigert, Recht entzogen)
weicht die Schicht auf den Browser aus; vorübergehende Fehler werden ausgesessen.

### 11 — Ein Schreiber, per Kurzzeitsperre

**Lage.** Mehrere offene Tabs simulieren dieselbe Etage und würden sich gegenseitig
überschreiben — der Speicher kennt nur „der letzte gewinnt".

**Entscheidung.** Wer die Sperre hält, schreibt; die übrigen laufen nur lesend mit und
zeigen das an.

**Folgen.** Kein Hin und Her zwischen Tabs. Die lesenden Tabs zeigen ihren eigenen Lauf,
nicht den des Schreibers — bewusst, denn eingespielte Fremdstände liessen die Figuren
springen.

### 12 — Keine Datenbank-Anmeldung in der veröffentlichten Fassung

**Lage.** Eine Seite, die die Datenbank-Fähigkeit anmeldet, wird organisationsintern und
lässt sich nicht mehr öffentlich teilen.

**Entscheidung.** Öffentliches Teilen hat Vorrang; die Fähigkeit bleibt unangemeldet.

**Folgen.** Der Stand liegt im Browser des jeweiligen Betrachters — pro Gerät, nicht
geteilt. Ebene 1 der Speicherschicht bleibt im Code und greift, sobald die Fähigkeit
angemeldet wird.

### 13 — Eigenständige Hommage, nichts übernommen

**Entscheidung.** Aufbau, Grafik und Figuren sind vollständig eigen; gezeichnet wird
ausschliesslich aus Rechtecken und Ellipsen zur Laufzeit. Übernommen ist allein die
Idee der Gattung: eine endlose Etage voller kleiner Szenen.

### 14 — GitHub Pages als öffentliche Heimat

**Lage.** Die Seite existierte zunächst nur als veröffentlichtes Artefakt. Das ist an
ein Konto gebunden und lässt sich nicht frei verlinken.

**Entscheidung.** Auslieferung über GitHub Pages, direkt aus `main` im
Wurzelverzeichnis — dieselben Dateien, die im Repository stehen, ohne Bauschritt.

**Folgen.** Code und veröffentlichte Seite können nicht auseinanderlaufen: jeder Push
ist nach einer halben Minute live. Der Preis ist, dass dort keine Artefakt-Laufzeit
existiert — also kein geteilter Speicher, sondern Ebene 2 (siehe 10 und 12). Damit
Pages die Dateien unverändert ausliefert, liegt ein leeres `.nojekyll` im
Wurzelverzeichnis; und alle Pfade in `index.html` müssen relativ bleiben, weil die
Seite unter `/ebene17/` und nicht an der Wurzel der Domain steht.
