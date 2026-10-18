=== QR Code Generator ===
Contributors: Raeed
Tags: qr code, generator, tools, shortcode, wordpress
Requires at least: 5.0
Tested up to: 6.7
Stable tag: 1.4
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Ein einfacher QR-Code-Generator für deine WordPress-Seite. Besucher können QR-Codes in verschiedenen Farben und Größen erstellen und herunterladen.

== Beschreibung ==

Mit dem **QR Code Generator** Plugin kannst du ganz einfach einen QR-Code-Generator auf deiner Website anzeigen.
Das Plugin nutzt den Shortcode `[qr_generator]`, um das Tool auf einer beliebigen Seite oder in einem Beitrag einzubetten.

**Features:**
- QR-Code mit beliebigem Text oder URL erstellen
- Farben und Hintergrund wählbar
- Größenanpassung (150-400px)
- Download-Funktion
- Admin-Einstellungen für Standardwerte und Formularlayout
- Responsive Design
- Keine externen Server - alles läuft lokal

== Installation ==

1. Lade den Ordner `qr-code-generator` in das Verzeichnis `/wp-content/plugins/` hoch
2. Aktiviere das Plugin im WordPress-Backend unter **Plugins**
3. Füge den Shortcode `[qr_generator]` in eine Seite oder einen Beitrag ein

== Nutzung ==

- Öffne eine Seite, zum Beispiel "QR-Code Generator"
- Füge `[qr_generator]` in den Editor ein
- Besucher können QR-Codes erstellen und herunterladen
- Die Standardwerte findest du im Admin-Menü unter **QR Generator**

== Changelog ==

= 1.8 =
* 3D Tree nach Referenzvideo umgebaut: zwei Ansichten desselben Werks - isometrische Diorama-Szene (QR-Code als Plattformboden, Gras auf den drei Finder-Mustern, Voxel-Baum mit Stamm, Aesten und dichter Blaetterkrone, Bluetenblaetter, weiche Schatten) und flache, scannbare Draufsicht
* Tippen auf den Baum (oder Umschalter Szene / QR-Code) wechselt die Ansicht
* Neuer Standard-Rendermodus "Garden look": Module in der Blattfarbe mit Tonwert-Variation, Finder-Muster in Gras-Gruen
* Farbpunkte zur schnellen Auswahl; neue Varianten Red Tree und Summer Tree
* Downloads: validiertes QR-PNG/SVG und separates Szenenbild (nur Illustration, nicht zum Scannen)
* Fix: [hidden] wird nicht mehr von display:grid/flex ueberschrieben (Optionspanel und Download-Buttons)
* Darstellung der flachen Ansicht an die Decoder-Grenzen angepasst (Helligkeits-Obergrenze, hauchduenne Kanten) - in Tests 168/168 dekodiert

= 1.7 =
* 3D Tree: isometrische Diorama-Szene um den QR-Code (Plattform mit Rasenkante und Seitendicke, konischer Stamm, Äste, Low-Poly-Blütenkrone, Blumen, weiche Schatten) - rein außerhalb von QR-Code und Ruhezone
* Das angezeigte Vorschaubild ist exakt das validierte Exportbild (ein Render statt zwei)
* Automatischer konservativer Fallback, wenn die Dekodierung der gewählten Einstellung fehlschlägt
* Live-Aktualisierung der Vorschau nach Einstellungsänderungen (entprellt, veraltete Renderings werden verworfen)
* Verständliche Fehlermeldung bei nicht kodierbarem Inhalt; Bedienelemente bleiben danach nutzbar
* jsQR minifiziert (256 KB -> 130 KB)

= 1.4 =
* Root-Version mit Admin-Einstellungen konsolidiert
* AJAX-Vorschau abgesichert und repariert
* Settings-Sanitizing ergänzt
* Frontend-JavaScript für mehrere Generatoren pro Seite vorbereitet
* Kodierungsprobleme in Plugin-Texten bereinigt

= 1.1 =
* Neue Optionen für QR-Farbe, Hintergrundfarbe und Größe hinzugefügt
* Design modernisiert und responsiv gemacht

= 1.0 =
* Erste Version mit Textfeld, QR-Code-Erzeugung und Download-Funktion

== Lizenz ==

Dieses Plugin ist unter der GPLv2 oder späteren Version lizenziert.
