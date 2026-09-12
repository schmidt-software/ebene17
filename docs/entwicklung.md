# Entwicklung

Diese Ebene entstand in einer einzigen Arbeitssitzung, in acht Schritten. Der Verlauf
steht hier, weil die Begründungen sonst verloren gehen — vor allem die Fehler und
wie sie gefunden wurden.

Geprüft wurde durchweg zweigleisig: der Generator kopflos in Node (`tools/test-welt.js`),
die Seite in einem echten Browser (Konsolenfehler, Bildrate, simulierte Klicks).

---

## 1 — Grundgerüst

Ziel war eine endlose isometrische Ebene im Geiste der grossen Wimmelbild-Animationen:
ziehen, zoomen, entdecken. Entstanden sind Weltgenerator, Zeichenschicht und Anwendung
als drei Module ohne Abhängigkeiten, dazu Seitenleiste, Minikarte und automatische Tour.

**Gefunden und behoben**

- Das Hilfefenster lag beim Start offen über der Szene. Ursache: `#modal { display: grid }`
  überschrieb das HTML-Attribut `hidden`, das nur `display: none` als Vorgabewert setzt.
  Behoben mit einer ausdrücklichen Regel `#modal[hidden] { display: none !important }`.
- Die Räume waren zu weitläufig (16 Bereiche auf 148×148 Kacheln), das Schwimmbecken
  füllte einen ganzen Saal. Die Flächenteilung geht jetzt eine Ebene tiefer
  (20–28 Bereiche), das Becken ist auf höchstens 14×10 Kacheln begrenzt und bekommt
  Liegen ringsum.

## 2 — Grössere, detailliertere, anklickbare Figuren

Die Figuren waren zu klein, um ihre Beschriftung lesen zu können.

- Grundgrösse auf etwa das Anderthalbfache, dazu eine Streuung je Figur (0,92–1,14),
  damit nicht alle gleich wirken.
- Neu gezeichnet: Schuhe, Hände, Kragen, Gürtel, Namensschild, Ohr auf der Schattenseite,
  Mund — und Augen, die alle paar Sekunden blinzeln. Sechs Frisuren, fünf Gegenstände.
- Ein Klick öffnet eine Infokarte mit mitlaufendem Porträt (dieselbe Zeichenfunktion,
  nur gross und ruhig stehend), Name, Rolle, Dienstnummer und laufenden Angaben.
  Der Treffertest arbeitet auf der tatsächlich gezeichneten Körperfläche und wählt
  bei Überlappung die vorderste Figur.
- Möbel zum Sitzen wurden entsprechend erhöht, damit die Verhältnisse stimmen.

**Nebenbei**: `setPointerCapture` wirft bei ungewöhnlichen Zeigerkennungen; der Aufruf
ist jetzt abgesichert, sonst bricht die gesamte Zeigerbehandlung ab.

## 3 — Ruhigeres Gehtempo

Das Tempo lag bei 1,5–2,6 Kacheln pro Sekunde und wirkte hektisch. Jetzt 0,62–1,05,
Pausen zwischen den Wegen verlängert, Schwimmer und Putzroboter entsprechend gedrosselt.

**Dabei aufgefallen**: Die Schrittanimation hing an der Uhr (`sin(t · 8,5)`), unabhängig
davon, wie schnell eine Figur tatsächlich lief. Bei langsamerem Tempo wären die Beine
sichtbar über den Boden gerutscht. Sie läuft jetzt über eine Schrittphase, die sich an
der zurückgelegten Strecke aufaddiert — rund 1,5 Schritte je Sekunde bei etwa einer
halben Kachel Schrittlänge. Siehe [Entscheidung 4](entscheidungen.md).

## 4 — Umbenennung in Ebene 17

Durchgezogen bis in den Code: Seitentitel, Logo, Ladeschirm, Hilfefenster, der
Namensraum `window.F797` → `window.E17`, die Raumnummern vom 700er- in den
1700er-Kreis, die Dienstnummern von `F797-` auf `E17-`, der Beispiel-Port von 8797
auf 8017. Danach gab es keinen Treffer mehr für die alten Bezeichner.

## 5 — Klemmbrett statt Anzeigetafel

Das Feld *Dabei* nannte einen Gegenstand „Anzeigetafel" — das klang nach einer Tafel
an der Wand, gezeichnet war ein dunkles Gehäuse mit blau leuchtendem Display.
Beides ersetzt: die Bezeichnung durch **Klemmbrett**, der interne Schlüssel `tablet`
durch `clipboard`, und die Zeichnung durch ein Brett mit Blatt, Metallklammer und drei
angedeuteten Schriftzeilen. Das leuchtende Display war der eigentliche Grund für die
Verwirrung.

## 6 — Von Zufall zu Aufgaben

Auf die Frage, ob die Figuren ihren Aufgaben folgen, lautete die ehrliche Antwort:
nein. Rolle und Tätigkeit waren Beschriftungen ohne Wirkung, die Bewegung war eine
Irrfahrt mit ordentlicher Wegfindung. Daraus wurde die grosse Ausbaustufe:

- **Arbeitsplätze**: Jedes Möbelstück, an dem sich etwas tun lässt, wird beim Bauen
  registriert — samt erreichbarem Stehplatz davor — und nach Zweck einsortiert
  (`wartung`, `inventur`, `quelle`, `abgabe`, `ausgabe`, `pflege`, `freizeit`, `sport`,
  `schreibtisch`). Häufige Möbel nur stichprobenweise, sonst wäre jedes einzelne Regal
  ein Posten. Ergebnis: 286–649 Plätze je Ebene.
- **Aufgaben**: zehn Vorlagen aus ein bis drei Schritten. Ein Schritt heisst: zu einem
  Arbeitsplatz laufen, dort eine Weile arbeiten, dabei etwas in die Hand nehmen oder
  ablegen. Die Rolle bestimmt die Auswahl, in einem Viertel der Fälle wird stattdessen
  etwas Privates gezogen.
- Plätze werden **reserviert**, Ziele nach Nähe aus einer Stichprobe gewählt, und jeder
  Fehlschlag bricht die Aufgabe sauber ab, statt die Figur hängen zu lassen.

**Gefunden durch Messung**: Eine Stichprobe über 43 angeklickte Figuren ergab, dass
36 davon gar keine Aufgabe hatten und sassen. Ursache war der Weltstart, der 35 % aller
Sitzplätze mit dauerhaft sitzenden Figuren besetzte — die zugleich genau die Plätze
blockierten, die Pausen brauchen. Jetzt starten höchstens 40 Figuren sitzend und mit
kurzem Zeitgeber, dafür ist die laufende Belegschaft erhöht. Die Wiederholung der
Messung ergab: 17 von 17 mit laufender Aufgabe, Gegenstand jeweils passend.

**Textliche Nachbesserung**: Weg- und Arbeitstext sind getrennt, sonst stand
„macht Pause", während die Figur noch zum Stuhl lief.

## 7 — Dauerhafter Zustand

Die Ebene sollte ihren Stand behalten. Entscheidend war die Einsicht, dass die Ebene
selbst gar nicht gespeichert werden muss: gleicher Seed, gleiche Welt — nachgewiesen
über einen Determinismus-Test, der zwei Läufe desselben Seeds Feld für Feld vergleicht.
Gesichert werden nur elf Werte je Figur. Das sind 8–15 KB statt mehrerer Megabyte.

Die Speicherschicht hat drei Ebenen (Artefakt-Datenbank, Browser-Speicher, gar nichts)
und weicht bei endgültiger Absage der Datenbank selbsttätig auf den Browser aus, statt
den Stand still zu verlieren.

**Nachgewiesen** statt behauptet: 45 Sekunden laufen lassen, sichern, neu laden, nach
16 Sekunden erneut sichern. Mittlerer Abstand der Figuren zwischen beiden Ständen:
**8,0 Kacheln** — plausibel für 16 Sekunden bei 0,8 Kacheln je Sekunde. Abstand zur
Startaufstellung desselben Seeds: **24,8 Kacheln**. 141 von 167 Figuren setzten
dieselbe Aufgabe über den Neustart hinweg fort; der Rest hatte sie zwischenzeitlich
beendet. Verfahren: [Prüfungen](pruefungen.md).

## 8 — Öffentlich statt geteilt

Eine veröffentlichte Seite, die die Datenbank-Fähigkeit anmeldet, wird
organisationsintern und lässt sich nicht mehr öffentlich teilen. Da öffentliches Teilen
wichtiger war, ist die Anmeldung zurückgenommen; der Code bleibt unverändert und fällt
auf den Browser-Speicher zurück.

**Dabei korrigiert**: Im Hilfefenster stand „Die Ebene läuft weiter, auch wenn niemand
zusieht" — das stimmte nie. Die Simulation läuft nicht im Hintergrund, sie wird beim
Öffnen aus dem gesicherten Stand fortgesetzt.

## 9 — Veröffentlichung auf GitHub Pages

Die Seite braucht keinen Server: `index.html` liegt im Wurzelverzeichnis, alle Pfade
sind relativ. Pages liefert daher unverändert aus `main` aus, ohne Bauschritt und ohne
Arbeitsablauf. `.nojekyll` schaltet die Jekyll-Verarbeitung ab.

**Geprüft nach dem ersten Build**: Seite und alle vier Skripte antworten mit 200 und
korrektem Inhaltstyp, 60 Bilder je Sekunde auf der Live-Adresse, keine Meldung in der
Konsole, und die Sicherung greift auch dort (8,1 KB im Browser-Speicher unter der
Pages-Domain).

---

## Gemessene Werte

| Grösse | Wert |
| --- | --- |
| Bildrate, 1440×900, ~240 Figuren | 60/s |
| Bildrate bei 24 % Zoom (halbe Ebene im Bild) | 60/s |
| Erzeugung einer Ebene | 1–10 ms |
| Bereiche je Ebene | 19–28 |
| Objekte je Ebene | 3 000–4 700 |
| Arbeitsplätze je Ebene | 286–649 |
| Figuren je Ebene | 188–270 |
| Vernetzung der begehbaren Fläche | 100 % in allen geprüften Seeds |
| Umfang einer Sicherung | 8–15 KB |
