# Home Assistant Custom Card: ha-recipe-card

Eine benutzerdefinierte Lovelace-Karte für Home Assistant, die Rezepte aus dem kochbuch-Backend anzeigt.

## Funktionen

- **Mehrere Ansichtsmodi:**
  - `ideas` - Zutaten, Kategorien, Schlagwörter und Schritte
  - `full` - Vollständige Rezeptansicht mit Bild, Zutaten und Zubereitung
  - `next-step` - Fokus auf den nächsten Schritt und geschätzte Zeit
  - `inspiration` - Inspirierende Übersicht mit Bild, Bewertung und Kategorien

- **Einkaufsliste:** Button zum Hinzufügen/Entfernen von Rezepten in die persönliche Warenkorb-Liste

- **Konfigurierbar:** Suchbegriff, Filteroptionen, Ansichtsmodus

- **Keine Anmeldung nötig:** Funktioniert direkt über das lokale Backend ohne Chefkoch-Login

## Installation

### Option 1: Über HACS (empfohlen)

1. HACS → Drei-Punkte-Menü → **Benutzerdefinierte Repositories**
2. Repository: `https://github.com/Felixstro-dev/kochbuch-recipe-card`
3. Kategorie: **Frontend** (Dashboard)
4. Auf **Hinzufügen** klicken, dann in HACS nach **Kochbuch Recipe Card** suchen und installieren
5. Home Assistant neu starten
6. Karte im Lovelace-Editor hinzufügen

### Option 2: Manuell

1. Die Datei `ha-card/recipe-card.js` in den Konfigurationsordner von Home Assistant kopieren:
   - `/CONFIG_DIR/www/custom_cards/ha-recipe-card.js`
   - Erstellen Sie das Verzeichnis falls es nicht existiert

2. In der `configuration.yaml` Home Assistant die Frontend-Integrationen hinzufügen (falls automatisch erkannt wird):
   ```yaml
   frontend:
     custom_components:
       - type: ha-recipe-card
   ```

### Option 3: Als Lizenzkarte einbinden

Falls HACS erweiterte Verwaltung bietet, können Sie die Karte auch als Lizenzkarte einbinden.

## Verwendung in Lovelace

Fügen Sie der `ui-lovelace.yaml` oder über den Lovelace-Editor eine Karte hinzu:

```yaml
type: custom:ha-recipe-card
base_url: "http://192.168.1.20:8080"   # Adresse deines Backends
mode: ideas                # ideas | full | next-step | inspiration
filter_web_only: true
search_query: "Backen"     # Suchbegriff für das Backend
show_shopping_list: true   # Einkaufsliste Button
```

## Konfigurationsoptionen

| Option | Beschreibung | Standard |
|--------|-------------|----------|
| `base_url` | Basis-URL des kochbuch-Backends | `''` (gleiche Origin) |
| `mode` | Ansichtsmodus | `ideas` |
| `filter_web_only` | Nur Rezepte aus Web-Quelle filtern | `true` |
| `search_query` | Suchbegriff für die Rezeptsuche | `"Backen"` |
| `show_shopping_list` | Einkaufsliste Button anzeigen | `true` |
| `limit` | Maximale Anzahl Rezepte | `50` |

## Einkaufsliste Funktionsweise

- Jedes Karten-Repetition hat einen Button "Warenkorb"
- Klicken Sie darauf, um das Rezept zur Einkaufsliste hinzuzufügen oder zu entfernen
- Es wird ein Custom Event `recipe-shopping-list-changed` ausgelöst, das von Automatien erfasst werden kann:

```yaml
automat:
  - alias: "Warenkorb aktualisieren"
    trigger:
      - platform: event
        event_type: recipe-shopping-list-changed
    action:
      - service: notify.mobile_app
        target:
          name: "mein-Handy"
          message: "Rezept ${trigger.data.recipe.title} wurde ${trigger.data.added ? 'hinzugefügt' : 'aus der Warenkorb entfernt'}"
```

## Backend API Endpunkte

Die Karte ruft folgende Endpunkte Ihres kochbuch-Backends ab:

- `GET /api/v1/search?q=SUCHBEgriff&limit=50` - Sucht nach Rezepten
- Das Backend muss laufen und die CORS-Einstellungen müssen die Home Assistant-Instanz zulassen

## Voraussetzungen

- Home Assistant mit installiertem kochbuch-Backend
- Backend API ist erreichbar (standardmäßig unter `http://HA-IP:8080`)
- CORS konfiguriert: `cors_origins: "http://localhost,http://192.168.1.*"` (in der `.env` des Backends)

## Entwicklung

Um die Karte zu entwickeln oder anzupassen:

1. Änderungen an `ha-card/recipe-card.js` vornehmen
2. Home Assistant neustarten
3. Im Log nach Fehlern suchen: `logbook` oder `Developer Tools → Logs`

## Screenshot-Vorschau

Kleine Karte (Ideen-Ansicht):
![Ideen-Ansicht](screenshot-ideas.png)

Vollständige Ansicht:
![Vollständige Ansicht](screenshot-full.png)

## Lizenz

MIT License - frei für persönliche und kommerzielle Nutzung.