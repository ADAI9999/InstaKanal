# InstaKanal – Anleitung

Automatisierter Instagram-Kanal mit vier Beiträgen pro Tag. Die Beiträge entstehen eine Woche im Voraus,
und du gibst jeden frei, bevor er erscheint.

Jeder Beitrag ist ein Karussell mit KI-Titelbild:
- **Geschichte:** eine erfundene Ich-Erzählung mit Aufhänger, Wendung und einem Werkzeug zum Nachmachen
- **Liste:** nummerierte Sätze oder Schritte zum Mitnehmen („Diese 7 Sätze …“)

Lebt eine Geschichte von Schauplätzen, Tieren oder einem Gleichnis, bekommt jede Seite ein eigenes Bild;
sonst gibt es nur das Titelbild.

## So läuft es ab

1. **Mittwochs 20:00 Uhr** – GitHub füllt den Vorrat auf 28 Beiträge auf (4 pro Tag, 7 Tage).
   - Jeder Entwurf geht durch ein **Lektorat** mit sechs Noten von 1 bis 10: Titelseite, passt zum Kanal,
     Spannungsbogen, Thema, Nutzwert, Sprache. Unter Note 7 wird neu geschrieben, bis zu dreimal.
   - Das **Titelbild** wird geprüft und bei Mängeln einmal neu erzeugt.
2. **Freigabe** – Für jeden Beitrag bekommst du eine Anfrage „Freigabe: …“ mit Noten, schwächster Stelle,
   allen Seiten und der Bildunterschrift. **Merge** = freigeben, **Close** = verwerfen.
3. **07:15, 12:15, 17:15 und 20:15 Uhr** – Jeweils der älteste freigegebene Beitrag wird veröffentlicht.

Die Zeiten gelten für die Winterzeit; in der Sommerzeit verschiebt sich alles um eine Stunde nach hinten.
GitHub startet geplante Abläufe oft einige Minuten verspätet.

**Stoppen:** Erzeugen und Posten lassen sich getrennt anhalten und wieder starten:

```bash
gh workflow disable erstellen.yml
```

```bash
gh workflow disable posten.yml
```

Wieder einschalten mit `enable` statt `disable`. Vorrat außer der Reihe auffüllen:

```bash
gh workflow run erstellen.yml
```

Die Freigabe geht auch am Handy in der GitHub-App.

## Einstellungen: `config.json`

| Feld | Bedeutung |
|---|---|
| `handle` | Instagram-Name ohne @, steht auf jedem Bild |
| `kanalname` | Schriftzug oben links |
| `schlusszeile` | optionale feste Zeile auf der letzten Seite (derzeit nicht gesetzt) |
| `nische`, `zielgruppe`, `tonfall` | steuern die Texte |
| `freigabe` | `true` = du gibst jeden Beitrag frei, `false` = voll automatisch |
| `rhythmus` | Reihenfolge der Beitragsarten (`geschichte`, `saetze`) |
| `schwerpunkte` | Themenfelder, die der Reihe nach drankommen |
| `farben` | Farben des Designs |

## Einmalige Einrichtung

### 1. Instagram-Konto
- Konto anlegen, in den Einstellungen auf **Professionelles Konto** (Creator oder Business) umstellen.
- Namen in `config.json` bei `handle` und `kanalname` eintragen.

### 2. Meta-App für den Zugang
1. Auf <https://developers.facebook.com> anmelden und **App erstellen**.
2. Anwendungsfall **Instagram** wählen, dann **API-Einrichtung mit Instagram-Login**.
3. Dein Instagram-Konto als Tester hinzufügen und in der Instagram-App bestätigen.
4. Bei „Zugriffsschlüssel generieren“ ein Token für dein Konto erzeugen.
   Nötige Berechtigungen: `instagram_business_basic`, `instagram_business_content_publish`.
5. Das Token ist ein Geheimnis: nirgends einfügen außer im nächsten Schritt.

### 3. Geheimnisse bei GitHub hinterlegen
Im Terminal, im Ordner `InstaKanal`. Jeder Befehl fragt nach dem Wert, der beim Einfügen unsichtbar bleibt.

```bash
gh secret set ANTHROPIC_API_KEY
```

```bash
gh secret set IG_ACCESS_TOKEN
```

- `ANTHROPIC_API_KEY`: Schlüssel von <https://console.anthropic.com> (Kosten: wenige Cent pro Beitrag).
- `IG_ACCESS_TOKEN`: das Token aus Schritt 2.

### 3b. Titelbilder
Jede Geschichte bekommt ein KI-erzeugtes Titelbild. Der Dienst richtet sich nach dem hinterlegten Schlüssel:

- **GPT Image (OpenAI):** Schlüssel von <https://platform.openai.com/api-keys>, braucht ein API-Konto mit Guthaben.

```bash
gh secret set OPENAI_API_KEY
```

- **Google (Gemini API):** Schlüssel von <https://aistudio.google.com/apikey>.

```bash
gh secret set GEMINI_API_KEY
```

Sind beide hinterlegt, wird OpenAI verwendet. Ohne Schlüssel bleibt die Titelseite reiner Text.
Modell und Qualität lassen sich in `config.json` über `bildmodell` und `bildqualitaet` (low, medium, high) ändern.
Unter jeder Bildunterschrift steht der Hinweis, dass die Geschichte erfunden und das Titelbild KI-generiert ist.

### 4. Token-Verlängerung (nur beim älteren Instagram-Login)
Das Instagram-Token läuft nach 60 Tagen ab. Damit es sich selbst verlängert:
1. Auf GitHub unter Settings → Developer settings → **Fine-grained tokens** ein Token anlegen,
   nur für dieses Repository, Berechtigung **Secrets: Read and write**.
2. Hinterlegen:

```bash
gh secret set GH_PAT
```

Ohne diesen Schritt musst du alle 60 Tage Schritt 2.4 und 3 wiederholen.

## Befehle

```bash
npm run beispiel
```
Rendert Beispielbilder nach `vorschau/` (ohne API, zum Prüfen des Designs).

```bash
gh workflow run erstellen.yml
```
Erzeugt sofort einen Beitrag.

```bash
gh workflow run posten.yml -f probe=true
```
Prüft, was als Nächstes gepostet würde, ohne zu veröffentlichen.

```bash
gh workflow run posten.yml
```
Veröffentlicht sofort den nächsten freigegebenen Beitrag.

## Gut zu wissen
- Das Repository muss **öffentlich** sein: Instagram holt die Bilder über einen öffentlichen Link ab.
  Geheimnisse liegen nicht im Repository, sondern verschlüsselt bei GitHub.
- Alle Texte sind erfunden und selbst formuliert: keine realen Personen, keine fremden Beiträge, keine Promi-Zitate.
- Instagram erlaubt über die API höchstens 100 Beiträge pro Tag; hier ist es einer.
