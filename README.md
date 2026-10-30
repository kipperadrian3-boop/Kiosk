# Kiosk Inventur System

Eine schlanke Webanwendung mit Node.js & Express Backend zur Verwaltung und Erfassung von Kiosk-Inventuren.

## Features
- **Burger-Menü (`☰`)**: Öffnet die Seitenleiste mit Navigation zu "Inventar / Inventur".
- **Infinite-Scroll-Liste**: Chronologische Übersicht aller durchgeführten Inventuren.
- **Inventur erstellen**:
  - Modal zum Eingeben von Artikelname und Menge.
  - Temporäre Liste mit Entfernen-Funktion vor dem finalen Speichern ("Fertigstellen").
- **Detail- & Bearbeitungsansicht**:
  - Anzeige aller Artikel pro Inventur.
  - Anzeige des Erstelldatums und des letzten Änderungsdatums.
  - Nachträgliches Bearbeiten/Hinzufügen von Artikeln.
- **REST Backend**:
  - `GET /api/inventories`
  - `POST /api/inventories`
  - `PUT /api/inventories/:id`

## Lokale Installation & Start

```bash
npm install
npm start
```
Die Anwendung ist danach erreichbar unter: `http://localhost:3000`

## Kostenloses Hosting mit Backend
Empfohlen: **[Render.com](https://render.com/)**
1. Neues "Web Service" auf Render erstellen.
2. Dieses GitHub Repository verbinden.
3. Build Command: `npm install`
4. Start Command: `npm start`
