// Erzeugt einen neuen Beitrag: Text (Claude API) + Bilder, abgelegt unter posts/<id>/.
//
//   node src/erstellen.js                 Typ nach Rhythmus aus config.json
//   node src/erstellen.js --typ saetze    Typ festlegen (geschichte | saetze)
//   node src/erstellen.js --anzahl 2      mehrere Beiträge in einem Lauf
//   node src/erstellen.js --beispiel      Beispieltexte ohne API, Ausgabe nach vorschau/
import fs from "node:fs";
import path from "node:path";
import { konfig, ladePosts, speicherePost, POSTS_ORDNER, WURZEL } from "./konfig.js";
import { erzeugeText, pruefe, BEISPIELE, TYPEN } from "./texte.js";
import { rendere } from "./bilder.js";
import { erzeugeTitelbild } from "./titelbild.js";
import { pruefeInhalt, pruefeBild } from "./pruefung.js";

const args = process.argv.slice(2);
const beispiel = args.includes("--beispiel");
const typWunsch = args.includes("--typ") ? args[args.indexOf("--typ") + 1] : "auto";

function waehleTyp(zaehler) {
  if (TYPEN.includes(typWunsch)) return typWunsch;
  if (typWunsch && typWunsch !== "auto") throw new Error(`Unbekannter Typ: ${typWunsch}`);
  return konfig.rhythmus[zaehler % konfig.rhythmus.length];
}

function neueId(typ) {
  const datum = new Date().toISOString().slice(0, 10);
  for (let n = 1; ; n++) {
    const id = `${datum}-${typ}${n > 1 ? `-${n}` : ""}`;
    if (!fs.existsSync(path.join(POSTS_ORDNER, id))) return id;
  }
}

async function main() {
  if (beispiel) {
    fs.rmSync(path.join(WURZEL, "vorschau"), { recursive: true, force: true });
    for (const typ of TYPEN) {
      const ordner = path.join(WURZEL, "vorschau", typ);
      const bilder = await rendere({ typ, ...pruefe(typ, structuredClone(BEISPIELE[typ])) }, ordner);
      console.log(`Beispiel ${typ}: ${bilder.length} Bild(er) in ${path.relative(WURZEL, ordner)}/`);
    }
    return;
  }

  const anzahl = args.includes("--anzahl") ? Number(args[args.indexOf("--anzahl") + 1]) : 1;
  const posts = ladePosts();
  const themen = posts.slice(-40).map((p) => p.thema);
  const ids = [];
  for (let n = 0; n < anzahl; n++) {
    const post = await erstelleEinen(posts.length + n, themen);
    themen.push(post.thema);
    ids.push(post.id);
  }
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ids=${ids.join(" ")}\n`);
}

/** Schreibt Entwürfe, bis das Lektorat einen durchlässt (höchstens drei), und nimmt sonst den besten. */
async function schreibeGeprueft(typ, themen, schwerpunkt) {
  let bester = null;
  let kritik = null;
  for (let runde = 1; runde <= 3; runde++) {
    const inhalt = await erzeugeText(typ, themen, schwerpunkt, kritik);
    const urteil = await pruefeInhalt(typ, inhalt, schwerpunkt);
    const noten = `Kanal ${urteil.passt_zum_kanal.note}, Spannung ${urteil.spannungsbogen.note}, Thema ${urteil.thema_interessant.note}, Sprache ${urteil.sprache.note}`;
    console.log(`Lektorat, Entwurf ${runde} („${inhalt.thema}“): ${noten} → ${urteil.bestanden ? "bestanden" : "abgelehnt"}`);
    if (!bester || urteil.schnitt > bester.urteil.schnitt) bester = { inhalt, urteil, runde };
    if (urteil.bestanden) break;
    kritik = { thema: inhalt.thema, schwaechste_stelle: urteil.schwaechste_stelle, hinweise: urteil.hinweise };
  }
  return bester;
}

/** Erzeugt das Titelbild und lässt es prüfen; ein durchgefallenes Bild wird einmal neu erzeugt. */
async function bildGeprueft(inhalt) {
  let foto = await erzeugeTitelbild(inhalt.bildidee);
  if (!foto) return { foto: null, bildpruefung: null };
  let pruefung = await pruefeBild(foto, inhalt.titel, inhalt.bildidee);
  console.log(`Bildprüfung: ${pruefung.passt ? "passt" : "passt nicht"} (${pruefung.grund})`);
  if (!pruefung.passt) {
    foto = await erzeugeTitelbild(inhalt.bildidee);
    pruefung = await pruefeBild(foto, inhalt.titel, inhalt.bildidee);
    console.log(`Bildprüfung, zweites Bild: ${pruefung.passt ? "passt" : "passt nicht"} (${pruefung.grund})`);
  }
  return { foto, bildpruefung: pruefung };
}

async function erstelleEinen(zaehler, themen) {
  const typ = waehleTyp(zaehler);
  const felder = konfig.schwerpunkte ?? [];
  // Der Schwerpunkt wechselt täglich und rückt mit jedem Beitrag weiter.
  const tag = Math.floor(Date.now() / 86_400_000);
  const schwerpunkt = felder.length ? felder[(tag + zaehler) % felder.length] : "";
  console.log(`Erzeuge Beitrag vom Typ „${typ}“${schwerpunkt ? `, Schwerpunkt: ${schwerpunkt}` : ""} …`);

  const { inhalt, urteil, runde } = await schreibeGeprueft(typ, themen, schwerpunkt);
  const id = neueId(typ);
  const ordner = path.join(POSTS_ORDNER, id);
  const { foto, bildpruefung } = await bildGeprueft(inhalt);
  const post = {
    typ,
    erstellt: new Date().toISOString(),
    schwerpunkt,
    ...inhalt,
    lektorat: { entwurf: runde, ...urteil },
    bildpruefung,
    titelbild: foto ? "ki" : "ohne",
  };
  post.bilder = await rendere(post, ordner, foto);
  speicherePost(ordner, post);
  console.log(`Fertig: posts/${id}/ (${post.bilder.length} Bild(er)), Thema: ${post.thema}`);
  return { id, thema: post.thema };
}

main().catch((fehler) => {
  console.error(`Fehler: ${fehler.message}`);
  process.exit(1);
});
