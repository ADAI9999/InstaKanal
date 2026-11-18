# InstaKanal – Anleitung

Automatisierter Instagram-Kanal. Jeden Tag entsteht ein Beitrag (Zitat-Bild oder Karussell),
du gibst ihn frei, abends wird er veröffentlicht.

## So läuft es ab

1. **05:00 Uhr** – GitHub erzeugt einen Beitrag: Text über die Claude API, Bilder im Kanal-Design.
2. **Freigabe** – Du bekommst auf GitHub eine Anfrage „Freigabe: …“ mit Bildern und Bildunterschrift.
   - **Merge** (Zusammenführen) = freigeben
   - **Close** (Schließen) = verwerfen
3. **18:00 Uhr** – Der älteste freigegebene Beitrag wird auf Instagram veröffentlicht.

Die Freigabe geht auch am Handy in der GitHub-App.

## Einstellungen: `config.json`

| Feld | Bedeutung |
|---|---|
| `handle` | Instagram-Name ohne @, steht auf jedem Bild |
| `kanalname` | Schriftzug oben links |
| `nische`, `zielgruppe`, `tonfall` | steuern die Texte |
| `freigabe` | `true` = du gibst jeden Beitrag frei, `false` = voll automatisch |
| `rhythmus` | Reihenfolge der Beitragsarten |
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

### 4. Token-Verlängerung (empfohlen)
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
- Alle Texte sind eigene Formulierungen. Fremde Beiträge werden nicht kopiert.
- Instagram erlaubt über die API höchstens 100 Beiträge pro Tag; hier ist es einer.
