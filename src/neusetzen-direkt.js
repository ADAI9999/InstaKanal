// Setzt einen schon im Plan liegenden Beitrag (posts/<id>/ auf main, Freigabe aus) mit geändertem Text neu,
// ohne neue Bilder zu erzeugen. Committen und pushen danach von Hand.
//   node src/neusetzen-direkt.js entwuerfe/<name>.json <beitrags-id>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { POSTS_ORDNER } from "./konfig.js";
import { pruefe } from "./texte.js";
import { rendere } from "./bilder.js";

const [datei, id] = process.argv.slice(2);
if (!datei || !id) throw new Error("Aufruf: node src/neusetzen-direkt.js entwuerfe/<name>.json <beitrags-id>");
const ordner = path.join(POSTS_ORDNER, id);
const alt = JSON.parse(fs.readFileSync(path.join(ordner, "post.json"), "utf8"));
if (alt.veroeffentlicht) throw new Error(`${id} ist schon veröffentlicht und wird nicht mehr geändert.`);
const entwurf = JSON.parse(fs.readFileSync(datei, "utf8"));
const inhalt = pruefe(entwurf.typ, structuredClone(entwurf));
delete inhalt.fakten;

const lade = (name) => {
  const p = path.join(ordner, "roh", name);
  return fs.existsSync(p) ? { typ: "image/jpeg", daten: fs.readFileSync(p).toString("base64") } : null;
};
const foto = lade("titel.jpg");
const seitenfotos = inhalt.seiten.map((_, i) => lade(`seite-${i + 2}.jpg`));

// Rohbilder sichern, weil rendere() den Ordner leert.
const roh = fs.mkdtempSync(path.join(os.tmpdir(), "roh-"));
fs.cpSync(path.join(ordner, "roh"), roh, { recursive: true });
const post = { ...alt, ...inhalt, typ: entwurf.typ, recherche: entwurf.fakten ?? alt.recherche };
post.bilder = await rendere(post, ordner, foto, seitenfotos);
fs.cpSync(roh, path.join(ordner, "roh"), { recursive: true });
fs.writeFileSync(path.join(ordner, "post.json"), JSON.stringify(post, null, 2) + "\n");
console.log(`Neu gesetzt: posts/${id}/ (${post.bilder.length} Seiten)`);
