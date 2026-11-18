// Erzeugt einen neuen Beitrag: Text (Claude API) + Bilder, abgelegt unter posts/<id>/.
//
//   node src/erstellen.js                 Typ nach Rhythmus aus config.json
//   node src/erstellen.js --typ saetze    Typ festlegen (geschichte | saetze)
//   node src/erstellen.js --beispiel      Beispieltexte ohne API, Ausgabe nach vorschau/
import fs from "node:fs";
import path from "node:path";
import { konfig, ladePosts, speicherePost, POSTS_ORDNER, WURZEL } from "./konfig.js";
import { erzeugeText, pruefe, BEISPIELE, TYPEN } from "./texte.js";
import { rendere } from "./bilder.js";
import { erzeugeTitelbild } from "./titelbild.js";

const args = process.argv.slice(2);
const beispiel = args.includes("--beispiel");
const typWunsch = args.includes("--typ") ? args[args.indexOf("--typ") + 1] : "auto";

function waehleTyp(posts) {
  if (TYPEN.includes(typWunsch)) return typWunsch;
  if (typWunsch && typWunsch !== "auto") throw new Error(`Unbekannter Typ: ${typWunsch}`);
  return konfig.rhythmus[posts.length % konfig.rhythmus.length];
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

  const posts = ladePosts();
  const typ = waehleTyp(posts);
  const themen = posts.slice(-40).map((p) => p.thema);
  const felder = konfig.schwerpunkte ?? [];
  // Der Schwerpunkt wechselt täglich und rückt mit jedem vorhandenen Beitrag weiter.
  const tag = Math.floor(Date.now() / 86_400_000);
  const schwerpunkt = felder.length ? felder[(tag + posts.length) % felder.length] : "";
  console.log(`Erzeuge Beitrag vom Typ „${typ}“${schwerpunkt ? `, Schwerpunkt: ${schwerpunkt}` : ""} …`);

  const inhalt = await erzeugeText(typ, themen, schwerpunkt);
  const id = neueId(typ);
  const ordner = path.join(POSTS_ORDNER, id);
  const post = { typ, erstellt: new Date().toISOString(), schwerpunkt, ...inhalt };

  const foto = await erzeugeTitelbild(inhalt.bildidee);
  post.titelbild = foto ? "ki" : "ohne";
  post.bilder = await rendere(post, ordner, foto);
  speicherePost(ordner, post);

  console.log(`Fertig: posts/${id}/ (${post.bilder.length} Bild(er)), Thema: ${post.thema}`);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `id=${id}\nanzahl=${post.bilder.length}\n`);
  }
}

main().catch((fehler) => {
  console.error(`Fehler: ${fehler.message}`);
  process.exit(1);
});
