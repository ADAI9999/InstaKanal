---
name: instakanal
description: Betreibt und richtet einen automatisierten Instagram-Karussell-Kanal ein (Texte per Claude, Bilder per GPT Image, Freigabe per Pull/Merge Request, Posten über die Instagram-API). Verwenden, wenn ein Kanal neu aufgesetzt, auf eine andere Plattform (z. B. GitLab) übertragen, Beiträge erzeugt, geprüft, korrigiert, freigegeben oder gepostet werden sollen, oder wenn beim Posten etwas schiefgeht.
---

# InstaKanal: Prozess

Ein Kanal = ein Repository mit diesem Code, einer `config.json` und Geheimnissen in der CI.
Inhalte (Beiträge, Entwürfe, Profil) gehören zum Kanal; der Prozess (Code, Workflows, dieser Skill) ist wiederverwendbar.

Kommunikation mit dem Betreiber auf Deutsch, kurz; Befehle immer vollständig und kopierfertig (er ist neu im Terminal).
Vor allem, was öffentlich sichtbar wird (Post, Repository, Push), fragen. Secrets nie in Code, Commits, Logs oder Chat.

## Ablauf eines Beitrags

1. **Planen** (`src/erstellen.js`, `plane()`): Format × Themenfeld × Design × Bildstil, aus `config.json` (`formate`, `themenfelder`).
   Formate: `wahre_geschichte`, `wissen`, `gleichnis`, `geschichte` (Ich-Erzählung), `liste`, `anleitung`, `saetze`.
   Designs: `nacht` (dunkel/gold), `papier` (hell, Lora, rot), `archiv` (Schreibmaschine, Stempel), `vollbild`.
2. **Recherche** (nur `wahre_geschichte`, `wissen`): Websuche, Notizen mit TATSACHEN / UNSICHER / QUELLEN. Nur Belegtes darf behauptet werden.
3. **Schreiben** (`src/texte.js`): Claude, Effort xhigh, JSON-Schema. Vorbilder in `entwuerfe/*.json` setzen den Maßstab.
4. **Lektorat** (`src/pruefung.js`): sechs Noten. Bestanden = Stimmigkeit ≥ 7 UND Schnitt ≥ 7 UND kein Kriterium < 6.
   Bis zu drei Entwürfe; besteht keiner, wird verworfen, bevor Bilder Geld kosten.
5. **Bilder** (`src/titelbild.js`): Titelbild + optionale Seitenbilder, Titelbild wird gegen die Titelseite geprüft.
   Rohbilder landen in `posts/<id>/roh/`, damit Texte später ohne neue Bilder korrigierbar sind.
6. **Rendern** (`src/bilder.js`): HTML → JPEG 1080×1350 mit Playwright. Text, der nicht passt, bricht mit „Seite N passt nicht ins Bild“ ab.
7. **Freigabe**: je Beitrag ein eigener Zweig `post/<id>` + Pull Request (Body aus `src/freigabetext.js`), dem Betreiber zugewiesen.
   Merge = freigeben, Close = verwerfen. Der Betreiber gibt am Handy frei.
8. **Posten** (`src/posten.js`, `.github/workflows/taktgeber.yml`): Der Taktgeber prüft alle 15 Minuten, ob laut
   `postzeiten` / `maxProTag` ein Termin fällig ist, und postet den ältesten freigegebenen Beitrag. Zurückgestellte
   (`"zurueckgestellt": true` in `post.json`) kommen nach allen anderen. Vor dem Posten Abgleich mit den letzten
   Instagram-Beiträgen (kein Doppelpost); bei Drosselung (Code 4/17/32/613) bis zu 30 Minuten Wiederholung.

## Täglicher Betrieb

| Aufgabe | Befehl |
|---|---|
| Vorrat auffüllen (sonst mittwochs automatisch) | `gh workflow run erstellen.yml` |
| Einzelne Beiträge eines Formats testen | `gh workflow run erstellen.yml -f anzahl=1 -f typ=wahre_geschichte` |
| Handgeschriebenen Entwurf zum Beitrag machen | `gh workflow run manuell.yml -f datei=entwuerfe/<name>.json` |
| Text eines vorgelegten Beitrags korrigieren | Entwurf in `entwuerfe/` anpassen, dann `node src/neusetzen.js entwuerfe/<name>.json <id>` |
| Bestimmten Beitrag sofort posten | `gh workflow run posten.yml -f id=<teil-der-id>` |
| Prüfen, was als Nächstes käme | `gh workflow run posten.yml -f probe=true` |
| Alle Beiträge ansehen | `npm run ansehen` → `vorschau/ansehen.html` |
| Posten anhalten / fortsetzen | `gh workflow disable taktgeber.yml` / `gh workflow enable taktgeber.yml` und `gh workflow run taktgeber.yml` |

Neue Beiträge immer selbst gegenlesen, bevor sie dem Betreiber empfohlen werden: Titel logisch zur Geschichte?
Jede Tatsache in den Notizen? Pointe gedeckt? Bilder passend und ohne Verformungen? Mängel benennen und
mit `neusetzen.js` beheben (nur möglich, wenn `roh/` existiert).

## Qualitätsmaßstab (vom Betreiber eingefordert)

- Orientierung an großen deutschen Kanälen (@erfolgslieferant, @motiversum, @erfolgsart, @erfolgsclan): eigene Formulierungen, nichts kopieren, keine Zitate realer Personen.
- Jeder Beitrag muss **überraschen, überzeugen, informieren**; Themen, Formate, Farben und Bildstile wechseln stark.
- Nicht immer dunkler Hintergrund, nicht immer eine Person im Bild; Zeichnungen erlaubt. Seitenzahl je nach Stoff (4–18).
- Wahre Geschichten: kurz, überraschend, belegt (zwei unabhängige Quellen). Legenden verwerfen.
- Kein Kopf mit Kanalname; unten links klein „Erfolgsguru“ (`wasserzeichen`), rechts Seitenzähler.
- Bildunterschrift endet mit Kennzeichnung: „Geschichte frei erfunden.“ / „Quellen: …“ / „Bilder KI-generiert.“

## Einen neuen Kanal einrichten

Reihenfolge einhalten; Schritte mit 👤 kann nur der Mensch erledigen (Konten, Zahlungsdaten, Bestätigungscodes,
Captchas, Zustimmung zu Nutzungsbedingungen). Claude führt Schritt für Schritt hindurch und übernimmt alles danach.

1. 👤 **Instagram-Konto** anlegen, auf Professionell (Creator) umstellen, Profilbild und Bio setzen.
2. 👤 **Meta-Unternehmensportfolio** (business.facebook.com) anlegen – ein eigenes, kein fremdes Firmenportfolio – und das Instagram-Konto hinzufügen.
3. 👤 **Meta-App** (developers.facebook.com): Anwendungsfall Instagram, „API-Einrichtung mit Facebook-Login für Unternehmen“ (Unified Login).
   App-Name darf „Insta“/„Instagram“ nicht enthalten. App mit dem Portfolio verknüpfen.
4. 👤 **Systemnutzer** im Portfolio anlegen, App und Instagram-Konto zuweisen, Token erzeugen mit
   `instagram_basic`, `instagram_content_publish`, `business_management` – läuft nicht ab.
5. 👤 **API-Schlüssel**: Anthropic (console.anthropic.com), OpenAI (platform.openai.com, mit Guthaben).
6. **Repository** aus diesem Prozess anlegen (öffentlich, weil Instagram die Bilder per öffentlicher URL holt), Inhalte leeren:
   `posts/`, `entwuerfe/` (bis auf 1–2 gute Vorbilder des neuen Kanals), `vorschau/`.
7. **Geheimnisse** setzen – der Betreiber fügt die Werte selbst ein, sie erscheinen nie im Chat:
   `gh secret set ANTHROPIC_API_KEY`, `gh secret set OPENAI_API_KEY`, `gh secret set IG_ACCESS_TOKEN`.
8. **`config.json`** anpassen: `handle`, `instagramKontoId` (aus der API, `pruefeZugang`), `kanalname`, `wasserzeichen`,
   `nische`, `zielgruppe`, `tonfall`, `themenfelder`, `postzeiten`, `maxProTag`, `abspann`.
9. Test: `gh workflow run posten.yml -f probe=true`, dann ein Beitrag mit `erstellen.yml -f anzahl=1`, gegenlesen, freigeben, posten.
10. `gh workflow run taktgeber.yml` einmal von Hand starten.

## Auf eine andere CI-Plattform übertragen (z. B. GitLab)

Der Node-Code ist plattformneutral. Plattformgebunden sind nur:

| GitHub | Entsprechung |
|---|---|
| `.github/workflows/*.yml` | `.gitlab-ci.yml` mit Jobs, gesteuert über `rules: - if: $AUFGABE == "..."` |
| `gh secret set` | CI/CD-Variablen (Masked + Protected), `glab variable set` |
| Pull Request je Beitrag (`gh pr create`) | Merge Request (`glab mr create`, Assignee/Reviewer = Betreiber) |
| `workflow_dispatch` | „Pipeline ausführen“ mit Variablen bzw. Pipeline-Trigger-Token |
| Taktgeber (selbststartender Dauerlauf) | Pipeline-Zeitplan (GitLab-Zeitpläne laufen zuverlässig, alle 15 Minuten) |
| `GITHUB_REPOSITORY` → raw.githubusercontent.com | `BILD_BASIS_URL` auf `https://<gitlab-host>/<gruppe>/<projekt>/-/raw/main` setzen (Projekt muss öffentlich sein) |
| Push aus der CI mit `GITHUB_TOKEN` | Projekt-Zugriffstoken mit `write_repository` als Variable |
| `src/freigabetext.js` (verlinkt Bilder auf GitHub) | `REPO_ROH_BASIS=https://<gitlab-host>/<gruppe>/<projekt>/-/raw` |

## Bekannte Fehler und Lösungen

| Symptom | Ursache | Lösung |
|---|---|---|
| Nichts gepostet, keine Läufe in der Liste | GitHub lässt `schedule`-Läufe aus | Taktgeber läuft? `gh run list --workflow taktgeber.yml`; sonst `gh workflow run taktgeber.yml` |
| „Application request limit reached (Code 4)“ | Meta drosselt die App | wird automatisch wiederholt; sonst nächster Taktgeber-Durchgang |
| „Die Antwort wurde abgeschnitten“ | `max_tokens` zu klein für hohen Effort | Streaming mit 64 000 Tokens (`anfrage()` in `texte.js`) |
| Lektorat verwirft alles | Regel zu streng / Vorbilder fehlen | Bestehensregel in `pruefung.js`, gute Vorbilder in `entwuerfe/` |
| „Seite N passt nicht ins Bild“ | Text zu lang für das Design | Text kürzen, `neusetzen.js` |
| Bild zeigt Falsches | Bildidee mehrdeutig | `bildidee` präziser (Blickrichtung, Perspektive), neu erzeugen |
| Leere Token-Liste bei Meta | Instagram-Konto nicht professionell / nicht im Portfolio | umstellen, Portfolio-Zuordnung prüfen |
| `neusetzen.js`: `roh` fehlt | Beitrag vor dem Rohbild-Fix erzeugt | nur Seiten ohne Bild neu rendern oder Beitrag neu erzeugen |
