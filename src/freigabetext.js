// Baut den Text der Freigabe-Anfrage: Eckdaten, Lektorat, Quellen, Seiten, Bildunterschrift.
//   node src/freigabetext.js <id> <zweig>
import fs from "node:fs";
import path from "node:path";
import { POSTS_ORDNER } from "./konfig.js";
import { FORMATE } from "./texte.js";
import { KRITERIEN } from "./pruefung.js";

const [id, zweig] = process.argv.slice(2);
const post = JSON.parse(fs.readFileSync(path.join(POSTS_ORDNER, id, "post.json"), "utf8"));
const basis = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${zweig}/posts/${id}`;
const l = post.lektorat;
const zelle = (t) => String(t).replace(/\s+/g, " ").replace(/\|/g, "/");

const zeilen = [
  "**Merge** = freigeben, **Close** = verwerfen.",
  "",
  `**Format:** ${FORMATE[post.typ]?.name ?? post.typ} · **Themenfeld:** ${post.themenfeld ?? "–"} · **Bildstil:** ${post.bildstil ?? "–"} · **Seiten:** ${post.bilder.length}${post.seitenbilder ? ` (${post.seitenbilder} mit eigenem Bild)` : ""}`,
  "",
];
if (l) {
  zeilen.push(
    `### Lektorat (Entwurf ${l.entwurf} von höchstens 3, ${l.bestanden ? "bestanden" : "NICHT bestanden, bester Versuch"})`,
    "",
    "| Kriterium | Note | Begründung |",
    "|---|---|---|",
    ...Object.entries(KRITERIEN)
      .filter(([k]) => l[k])
      .map(([k, [name]]) => `| ${name} | ${l[k].note}/10 | ${zelle(l[k].begruendung)} |`),
    "",
    `**Schwächste Stelle:** ${l.schwaechste_stelle}`,
    "",
  );
}
if (post.bildpruefung) zeilen.push(`**Titelbild:** ${post.bildpruefung.passt ? "passt" : "PASST NICHT"} – ${post.bildpruefung.grund}`, "");
if (post.quellen?.length) {
  zeilen.push("### Quellen (bitte vor der Freigabe gegenlesen)", "", ...post.quellen.map((q) => `- ${q}`), "");
}
zeilen.push("### Seiten", "", ...post.bilder.map((b) => `<img src="${basis}/${b}" width="200">`), "");
zeilen.push("### Bildunterschrift", "", post.caption, "", post.hashtags.map((h) => `#${h}`).join(" "));
console.log(zeilen.join("\n"));
