# InstaKanal – Arbeitsregeln für Claude

1. **Sprache:** Kommunikation mit Roman auf Deutsch, kurz und präzise. Er ist neu im Terminal: Befehle immer vollständig und kopierfertig angeben.
2. **Secrets:** nie in Code, Commits, Logs oder Chat. Sie liegen nur als GitHub-Secrets (`gh secret set`).
3. **Veröffentlichen:** Vor allem, was auf Instagram oder GitHub sichtbar wird (Post, Repository, Push), fragen.
4. **Inhalte:** nur eigene Formulierungen. Keine fremden Posts kopieren, keine Zitate realer Personen.

## Prozess

Der gesamte Ablauf (Einrichtung, Betrieb, Qualität, Fehler, Übertragung auf GitLab) steht im Skill
`.claude/skills/instakanal/SKILL.md`. Bei Arbeit am Kanal zuerst dort nachsehen.

## Aufbau

```
config.json          Kanalname, Nische, Tonfall, Farben, Freigabe an/aus
src/erstellen.js     Beitrag erzeugen (Text + Bilder) nach posts/<id>/
src/texte.js         Texte über die Claude API, Beispieltexte
src/bilder.js        Bilder rendern (HTML → JPEG, Playwright)
src/posten.js        nächsten fälligen, freigegebenen Beitrag veröffentlichen
src/instagram.js     Instagram-API
.github/workflows/   erstellen.yml, taktgeber.yml (postet), posten.yml (von Hand), manuell.yml
ANLEITUNG.md         Einrichtung und Bedienung
```

## Befehle

```bash
npm run beispiel      # Beispielbilder nach vorschau/ (ohne API)
```
