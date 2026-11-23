// Macht aus einem handgeschriebenen Entwurf (entwuerfe/<name>.json) einen fertigen Beitrag:
// Lektorat zur Kontrolle, Titelbild mit Bildprüfung, Seitenbilder, Rendern.
//   node src/manuell.js entwuerfe/<name>.json            vollständig (braucht API-Schlüssel)
//   node src/manuell.js entwuerfe/<name>.json --ohne-bilder   nur Layout prüfen, nach vorschau/
import fs from "node:fs";
import path from "node:path";
import { speicherePost, POSTS_ORDNER, WURZEL } from "./konfig.js";
import { pruefe } from "./texte.js";
import { rendere } from "./bilder.js";
import { erzeugeTitelbild } from "./titelbild.js";
import { pruefeInhalt, pruefeBild, KRITERIEN } from "./pruefung.js";

const [datei, ...rest] = process.argv.slice(2);
if (!datei) throw new Error("Bitte den Entwurf angeben, z. B. entwuerfe/beethoven-umgedreht.json");
const ohneBilder = rest.includes("--ohne-bilder");
const entwurf = JSON.parse(fs.readFileSync(datei, "utf8"));
const name = path.basename(datei, ".json");

async function main() {
  const inhalt = pruefe(entwurf.typ, structuredClone(entwurf));

  if (ohneBilder) {
    const ordner = path.join(WURZEL, "vorschau", "entwurf", name);
    const bilder = await rendere({ ...inhalt }, ordner);
    console.log(`Layout: ${bilder.length} Seiten in ${path.relative(WURZEL, ordner)}/`);
    return;
  }

  // Ist die Claude API nicht erreichbar (z. B. kein Guthaben), geht der handgeschriebene Entwurf ohne Lektorat weiter.
  let urteil;
  try {
    urteil = await pruefeInhalt(inhalt, {
      format: entwurf.typ,
      themenfeld: entwurf.thema,
      bisherige: [],
      notizen: entwurf.fakten ?? "",
    });
    console.log(`Lektorat: ${Object.entries(KRITERIEN).map(([k, [n]]) => `${n} ${urteil[k].note}`).join(", ")} → ${urteil.bestanden ? "bestanden" : "nicht bestanden"}`);
    console.log(`Schwächste Stelle: ${urteil.schwaechste_stelle}`);
  } catch (fehler) {
    console.log(`Lektorat übersprungen: ${fehler.message.slice(0, 200)}`);
    urteil = { uebersprungen: true, schnitt: 0, bestanden: true };
  }
  const bildPruefen = (f) =>
    pruefeBild(f, inhalt.titel, inhalt.bildidee, entwurf.bildstil).catch((fehler) => ({ passt: true, grund: `nicht geprüft: ${fehler.message.slice(0, 120)}` }));

  let foto = await erzeugeTitelbild(inhalt.bildidee, entwurf.bildstil);
  let bildpruefung = await bildPruefen(foto);
  console.log(`Bildprüfung: ${bildpruefung.passt ? "passt" : "passt nicht"} (${bildpruefung.grund})`);
  for (let versuch = 2; !bildpruefung.passt && versuch <= 3; versuch++) {
    foto = await erzeugeTitelbild(inhalt.bildidee, entwurf.bildstil);
    bildpruefung = await bildPruefen(foto);
    console.log(`Bildprüfung, Versuch ${versuch}: ${bildpruefung.passt ? "passt" : "passt nicht"} (${bildpruefung.grund})`);
  }

  const seitenfotos = [];
  if (inhalt.bilder_auf_jeder_seite) {
    for (const seite of inhalt.seiten) {
      const idee = (seite.bildidee ?? "").trim();
      seitenfotos.push(idee ? await erzeugeTitelbild(idee, entwurf.bildstil).catch(() => null) : null);
    }
  }

  const jetzt = new Date().toISOString();
  const id = `${jetzt.slice(0, 10)}-${jetzt.slice(11, 19).replace(/:/g, "")}-${name}`;
  const ordner = path.join(POSTS_ORDNER, id);
  const post = {
    ...inhalt,
    typ: entwurf.typ,
    erstellt: jetzt,
    themenfeld: "von Hand geschrieben",
    recherche: entwurf.fakten,
    lektorat: { entwurf: 1, ...urteil },
    bildpruefung,
    titelbild: "ki",
    seitenbilder: seitenfotos.filter(Boolean).length,
  };
  delete post.fakten;
  post.bilder = await rendere(post, ordner, foto, seitenfotos);
  // Rohbilder aufheben, damit Textkorrekturen ohne neue Bilder neu gerendert werden können.
  fs.mkdirSync(path.join(ordner, "roh"), { recursive: true });
  fs.writeFileSync(path.join(ordner, "roh", "titel.jpg"), Buffer.from(foto.daten, "base64"));
  seitenfotos.forEach((f, i) => f && fs.writeFileSync(path.join(ordner, "roh", `seite-${i + 2}.jpg`), Buffer.from(f.daten, "base64")));
  speicherePost(ordner, post);
  console.log(`Fertig: posts/${id}/ (${post.bilder.length} Seiten, ${post.seitenbilder} Seitenbilder)`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `ids=${id}\n`);
}

main().catch((fehler) => {
  console.error(`Fehler: ${fehler.message}`);
  process.exit(1);
});
