// Erzeugt neue Beiträge: Recherche (falls nötig), Text, Lektorat, Bilder; abgelegt unter posts/<id>/.
//
//   node src/erstellen.js                      Format nach Plan aus config.json
//   node src/erstellen.js --typ gleichnis      Format festlegen (siehe FORMATE in texte.js)
//   node src/erstellen.js --anzahl 3           mehrere Beiträge in einem Lauf
//   node src/erstellen.js --beispiel           Beispieltexte ohne API, Ausgabe nach vorschau/
import fs from "node:fs";
import path from "node:path";
import { konfig, ladePosts, speicherePost, POSTS_ORDNER, WURZEL } from "./konfig.js";
import { erzeugeText, recherchiere, pruefe, BEISPIELE, FORMATE, TYPEN, BILDSTILE } from "./texte.js";
import { rendere } from "./bilder.js";
import { erzeugeTitelbild } from "./titelbild.js";
import { pruefeInhalt, pruefeBild, KRITERIEN } from "./pruefung.js";

const args = process.argv.slice(2);
const wert = (name, ersatz) => (args.includes(name) ? args[args.indexOf(name) + 1] : ersatz);
const typWunsch = wert("--typ", "auto");

/** Zeitstempel im Namen: eindeutig auch über mehrere Freigabe-Zweige hinweg und zeitlich sortierbar. */
function neueId(format) {
  const jetzt = new Date().toISOString();
  return `${jetzt.slice(0, 10)}-${jetzt.slice(11, 19).replace(/:/g, "")}-${format}`;
}

/**
 * Legt für den n-ten Beitrag Format, Themenfeld und Bildstil fest. Die drei Listen werden mit
 * unterschiedlichen Schrittweiten durchlaufen, damit aufeinanderfolgende Beiträge sich in allen
 * drei Punkten unterscheiden und keine Kombination sich schnell wiederholt.
 */
function plane(zaehler) {
  const formate = konfig.formate ?? TYPEN;
  const felder = konfig.themenfelder;
  if (typWunsch !== "auto" && !TYPEN.includes(typWunsch)) throw new Error(`Unbekanntes Format: ${typWunsch}`);
  const format = TYPEN.includes(typWunsch) ? typWunsch : formate[zaehler % formate.length];
  const themenfeld = felder[(zaehler * 5 + 2) % felder.length];
  const wahl = (liste) => liste[(zaehler * 3 + 1) % liste.length];

  // Gestaltung und Bildstil passen zueinander und zum Format; innerhalb davon wird gewechselt.
  const KOMBINATIONEN = {
    wahre_geschichte: [["archiv", "schwarzweiss"], ["papier", "illustration"], ["archiv", "ort"], ["vollbild", "gegenstand"]],
    gleichnis: [["papier", "illustration"], ["vollbild", "tier"], ["nacht", "sinnbild"], ["papier", "illustration"]],
    wissen: [["vollbild", "sinnbild"], ["nacht", "gegenstand"], ["archiv", "schwarzweiss"], ["papier", "illustration"]],
    geschichte: [["vollbild", "nahaufnahme"], ["papier", "illustration"], ["nacht", "gegenstand"], ["vollbild", "haende"]],
    liste: [["nacht", "gegenstand"], ["papier", "haende"], ["vollbild", "ort"], ["nacht", "sinnbild"]],
    anleitung: [["papier", "haende"], ["nacht", "gegenstand"], ["papier", "illustration"]],
    saetze: [["nacht", "ort"], ["papier", "illustration"], ["vollbild", "schwarzweiss"]],
  };
  const [design, bildstil] = wahl(KOMBINATIONEN[format] ?? [["nacht", "nahaufnahme"]]);
  return { format, themenfeld, bildstil, design };
}

/** Schreibt Entwürfe, bis das Lektorat einen durchlässt (höchstens drei), und nimmt sonst den besten. */
async function schreibeGeprueft(vorgabe) {
  let bester = null;
  let kritik = null;
  for (let runde = 1; runde <= 3; runde++) {
    const inhalt = await erzeugeText({ ...vorgabe, kritik });
    const urteil = await pruefeInhalt(inhalt, vorgabe);
    const noten = Object.entries(KRITERIEN).map(([k, [name]]) => `${name} ${urteil[k].note}`).join(", ");
    console.log(`Lektorat, Entwurf ${runde} („${inhalt.thema}“): ${noten} → ${urteil.bestanden ? "bestanden" : "abgelehnt"}`);
    if (!bester || (urteil.bestanden && !bester.urteil.bestanden) || (urteil.bestanden === bester.urteil.bestanden && urteil.schnitt > bester.urteil.schnitt)) bester = { inhalt, urteil, runde };
    if (urteil.bestanden) break;
    kritik = { thema: inhalt.thema, schwaechste_stelle: urteil.schwaechste_stelle, hinweise: urteil.hinweise };
  }
  return bester;
}

/** Erzeugt das Titelbild und lässt es prüfen; ein durchgefallenes Bild wird einmal neu erzeugt. */
async function bildGeprueft(inhalt, bildstil) {
  let foto = await erzeugeTitelbild(inhalt.bildidee, bildstil);
  if (!foto) return { foto: null, bildpruefung: null };
  let pruefung = await pruefeBild(foto, inhalt.titel, inhalt.bildidee, bildstil);
  console.log(`Bildprüfung: ${pruefung.passt ? "passt" : "passt nicht"} (${pruefung.grund})`);
  if (!pruefung.passt) {
    foto = await erzeugeTitelbild(inhalt.bildidee, bildstil);
    pruefung = await pruefeBild(foto, inhalt.titel, inhalt.bildidee, bildstil);
    console.log(`Bildprüfung, zweites Bild: ${pruefung.passt ? "passt" : "passt nicht"} (${pruefung.grund})`);
  }
  return { foto, bildpruefung: pruefung };
}

/** Erzeugt Bilder für die Seiten, wenn der Beitrag das vorsieht. Ein fehlendes Bild lässt die Seite ohne. */
async function seitenbilder(inhalt, bildstil) {
  if (!inhalt.bilder_auf_jeder_seite) return [];
  const fotos = [];
  for (const seite of inhalt.seiten) {
    const idee = (seite.bildidee ?? "").trim();
    fotos.push(idee ? await erzeugeTitelbild(idee, bildstil).catch(() => null) : null);
  }
  console.log(`Seitenbilder: ${fotos.filter(Boolean).length} von ${inhalt.seiten.length}`);
  return fotos;
}

async function erstelleEinen(zaehler, bisherige) {
  const { format, themenfeld, bildstil, design } = plane(zaehler);
  console.log(`Erzeuge „${FORMATE[format].name}“ | Themenfeld: ${themenfeld} | Gestaltung: ${design} | Bildstil: ${bildstil}`);

  const notizen = FORMATE[format].recherche ? await recherchiere({ format, themenfeld, bisherige }) : "";
  if (notizen) console.log(`Recherche: ${notizen.split("\n")[0].slice(0, 160)}`);

  const vorgabe = { format, themenfeld, bildstil, bisherige, notizen };
  const { inhalt, urteil, runde } = await schreibeGeprueft(vorgabe);
  if (!urteil.bestanden) {
    // Nur Beiträge, die das Lektorat bestehen, werden vorgelegt. Kein Bild, keine Kosten mehr.
    throw new DurchgefallenFehler(`Nach ${runde} Entwürfen nicht bestanden („${inhalt.thema}“), verworfen.`);
  }
  const id = neueId(format);
  const ordner = path.join(POSTS_ORDNER, id);
  const { foto, bildpruefung } = await bildGeprueft(inhalt, bildstil);
  const seitenfotos = foto ? await seitenbilder(inhalt, bildstil) : [];
  const post = {
    typ: format,
    erstellt: new Date().toISOString(),
    themenfeld,
    bildstil,
    design,
    stempel: design === "archiv" && !FORMATE[format].erfunden ? (format === "wissen" ? "Belegt" : "Wahre Geschichte") : undefined,
    ...inhalt,
    recherche: notizen || undefined,
    lektorat: { entwurf: runde, ...urteil },
    bildpruefung,
    titelbild: foto ? "ki" : "ohne",
    seitenbilder: seitenfotos.filter(Boolean).length,
  };
  post.bilder = await rendere(post, ordner, foto, seitenfotos);
  // Rohbilder aufheben, damit Textkorrekturen mit src/neusetzen.js ohne neue Bilder möglich sind.
  fs.mkdirSync(path.join(ordner, "roh"), { recursive: true });
  if (foto) fs.writeFileSync(path.join(ordner, "roh", "titel.jpg"), Buffer.from(foto.daten, "base64"));
  seitenfotos.forEach((f, i) => f && fs.writeFileSync(path.join(ordner, "roh", `seite-${i + 2}.jpg`), Buffer.from(f.daten, "base64")));
  speicherePost(ordner, post);
  console.log(`Fertig: posts/${id}/ (${post.bilder.length} Seiten, ${post.seitenbilder} Seitenbilder), Thema: ${post.thema}`);
  return { id, kurz: `[${FORMATE[format].name}] ${post.thema}: ${post.titel}` };
}

class DurchgefallenFehler extends Error {}

async function main() {
  if (args.includes("--beispiel")) {
    for (const [format, beispiel] of Object.entries(BEISPIELE)) {
      const ordner = path.join(WURZEL, "vorschau", "beispiele", format);
      const bilder = await rendere({ typ: format, ...pruefe(format, structuredClone(beispiel)) }, ordner);
      console.log(`Beispiel ${format}: ${bilder.length} Bild(er) in ${path.relative(WURZEL, ordner)}/`);
    }
    return;
  }

  const anzahl = Number(wert("--anzahl", 1));
  const versatz = Number(wert("--versatz", 0));
  // Kurzfassungen der noch nicht freigegebenen Beiträge desselben Laufs, damit sich nichts wiederholt.
  const themendatei = wert("--themendatei", "");
  const posts = ladePosts();
  const bisherige = posts.slice(-30).map((p) => `[${FORMATE[p.typ]?.name ?? p.typ}] ${p.thema}: ${p.titel}`);
  if (themendatei && fs.existsSync(themendatei)) {
    bisherige.push(...fs.readFileSync(themendatei, "utf8").split("\n").filter(Boolean));
  }
  const ids = [];
  for (let n = 0; n < anzahl; n++) {
    const post = await erstelleEinen(posts.length + versatz + n, bisherige);
    bisherige.push(post.kurz);
    if (themendatei) fs.appendFileSync(themendatei, `${post.kurz.replace(/\n/g, " ")}\n`);
    ids.push(post.id);
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ids=${ids.join(" ")}\n`);
}

main().catch((fehler) => {
  console.error(`${fehler instanceof DurchgefallenFehler ? "Verworfen" : "Fehler"}: ${fehler.message}`);
  process.exit(fehler instanceof DurchgefallenFehler ? 2 : 1);
});
