# Kochbuch Recipe Card

Eine Lovelace-Karte für Home Assistant, die Rezepte aus dem lokalen
Kochbuch-Backend anzeigt.

## Funktionen

- Vier Ansichten: **Ideen**, **Vollständige WebUI**, **Nächster Schritt**, **Inspiration**
- Visueller Editor in Home Assistant („Karte hinzufügen“ → Kochbuch Recipe Card)
- Einkaufsliste-Button pro Rezept
- Funktioniert ohne Chefkoch-Login (Rezepte kommen aus dem eigenen Backend)
- Optionaler API-Key oder öffentlicher Lesezugriff (`EMBED_PUBLIC=true`)

## Voraussetzungen

1. Das Kochbuch-Backend läuft und ist aus dem Home-Assistant-Netz erreichbar.
2. Das Backend lauscht auf allen Interfaces, nicht nur auf `127.0.0.1`:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. CORS ist erlaubt (in `.env` des Backends):

   ```env
   CORS_ORIGINS=*
   EMBED_PUBLIC=true
   ```

   `EMBED_PUBLIC=true` erlaubt Lesezugriff ohne Anmeldung. Alternativ einen
   API-Key im Kochbuch anlegen und in der Karte unter `api_key` eintragen.

## Installation über HACS

1. HACS → Drei-Punkte-Menü → **Benutzerdefinierte Repositories**
2. Repository: `https://github.com/Felixstro-dev/kochbuch-recipe-card`
3. Kategorie: **Dashboard** (nicht „Integration“!)
4. Installieren, danach Browser-Cache leeren (Strg+F5)

## Verwendung

Im Dashboard auf **Karte hinzufügen** → **Kochbuch Recipe Card** klicken.
Der visuelle Editor öffnet sich automatisch. Alternativ per YAML:

```yaml
type: custom:ha-recipe-card
base_url: "http://192.168.30.9:8000"   # IP:Port des Backends (nicht Home Assistant!)
mode: ideas                             # ideas | full | next-step | inspiration
search_query: "Backen"
limit: 10
filter_web_only: false
show_shopping_list: true
# api_key: "kb_..."                     # nur nötig, wenn EMBED_PUBLIC=false
```

## Optionen

| Option | Beschreibung | Standard |
|---|---|---|
| `base_url` | Basis-URL des Kochbuch-Backends | – (Pflicht) |
| `mode` | Ansicht: `ideas`, `full`, `next-step`, `inspiration` | `ideas` |
| `search_query` | Suchbegriff | `Backen` |
| `limit` | Maximale Anzahl Rezepte (1–50) | `50` |
| `filter_web_only` | Nur Rezepte aus der Web-Quelle | `false` |
| `show_shopping_list` | Einkaufsliste-Button anzeigen | `true` |
| `api_key` | API-Key für geschützte Backends | – |

## Fehlerbehebung

- **„Failed to fetch“** → `base_url` falsch, Backend lauscht nur auf
  `127.0.0.1`, oder CORS fehlt. Die URL muss die LAN-IP des Backend-Rechners
  sein (z. B. `http://192.168.30.9:8000`), nicht die Home-Assistant-Adresse.
- **HTTP 401** → Backend erreichbar, aber ohne Freigabe. `EMBED_PUBLIC=true`
  setzen oder `api_key` konfigurieren.
- **Karte fehlt in der Auswahl** → Browser-Cache leeren bzw. HA neu starten.
