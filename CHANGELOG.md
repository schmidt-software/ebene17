# Änderungen

Die Versionen folgen dem Schema `haupt.neben`. Solange die Hauptnummer 0 ist, können
sich das Speicherformat und die Erzeugung noch ändern.

## 0.2 — 13. September 2026

Eine reine Umbenennung: keine neue Fähigkeit, kein geändertes Verhalten. Wer 0.1
kennt, findet dieselbe Ebene unter anderem Namen vor.

- **Umbenennung in „Ebene 17"**, durchgezogen bis in den Code. Der Name stand vorher im
  Widerspruch zum Repository `ebene17`. Mitgeändert: Titel, Logo, Ladeschirm, Hilfefenster,
  sämtliche Texte und Dokumente — dort auch das gewöhnliche Wort „Etage", sonst hätte
  „Ebene 17" neben „eine endlose Etage" gestanden.
- **Speicherschlüssel** heissen jetzt `ebene17.zustand` bzw. `ebene/zustand`. Stände aus
  der Zeit davor gehen nicht verloren: liegt unter dem neuen Namen nichts, wird der alte
  gelesen und beim nächsten Sichern übernommen; der alte Eintrag wird dann geräumt.

## 0.1 — 12. September 2026

Erste benannte Fassung. Die Ebene ist vollständig begehbar, belebt und behält ihren
Stand.

**Welt**

- Prozedurale Erzeugung aus einem Seed: Flächenteilung in 19–28 Bereiche, Gänge nur
  ins Leere gegraben, sodass Türöffnungen von selbst entstehen. In allen geprüften
  Seeds ist die begehbare Fläche zu 100 % vernetzt.
- Zwölf Raumthemen mit eigener Möblierung: Serverraum, Kantine, Labor, Pool, Kino,
  Arcade, Bibliothek, Gewächshaus, Werkstatt, Büro, Sporthalle, Startrampe.
- 3 000–4 700 Objekte je Ebene, alle zur Laufzeit aus Rechtecken gezeichnet — keine
  Bilddateien, keine Abhängigkeiten, kein Bauschritt.

**Figuren**

- 188–270 Bewohner mit eigenen Merkmalen: Größe, Hautton, Kleidung, Schuhe, eine von
  sechs Frisuren, gelegentlich ein Namensschild.
- Zehn Aufgabenvorlagen aus ein bis drei Schritten über 286–649 Arbeitsplätze. Die
  Rolle bestimmt die Auswahl; Plätze werden reserviert, Fehlschläge brechen sauber ab.
- Infokarte je Figur mit mitlaufendem Porträt, Aufgabe, Zustand, Tätigkeit und Ziel.

**Bedienung**

- Ziehen, Zoomen mit Rad und zwei Fingern, Tastatur, Bereichsliste mit Suche,
  klickbare Minikarte, weiche Kamerafahrten, automatische Tour, Folgen-Modus.

**Dauerhafter Zustand**

- Gespeichert werden Seed und elf Werte je Figur — 8–15 KB statt mehrerer Megabyte.
  Möglich, weil derselbe Seed dieselbe Ebene in derselben Reihenfolge liefert; geprüft
  bei jedem Testlauf.
- Drei Ebenen: Artefakt-Datenbank, sonst Browser-Speicher, sonst nichts.

**Veröffentlichung**

- GitHub Pages, direkt aus `main` im Wurzelverzeichnis: <https://schmidt-software.github.io/ebene17/>
- 60 Bilder je Sekunde bei voller Ebene, auch herausgezoomt.

Der ausführliche Verlauf samt der gefundenen Fehler steht in
[docs/entwicklung.md](docs/entwicklung.md), die Begründungen in
[docs/entscheidungen.md](docs/entscheidungen.md).
