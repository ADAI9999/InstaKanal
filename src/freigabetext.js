// Baut den Text der Freigabe-Anfrage: Lektorat, Bilder, Bildunterschrift.
//   node src/freigabetext.js <id> <zweig>
import fs from "node:fs";
import path from "node:path";
import { POSTS_ORDNER } from "./konfig.js";

const [id, zweig] = process.argv.slice(2);
const post = JSON.parse(fs.readFileSync(path.join(POSTS_ORDNER, id, "post.json"), "utf8"));
const basis = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY}/${zweig}/posts/${id}`;
const l = post.lektorat;
const zelle = (t) => String(t).replace(/\s+/g, " ").replace(/\|/g, "/");

const zeilen = ["**Merge** = freigeben, **Close** = verwerfen.", ""];
if (l) {
  zeilen.push(
    `### Lektorat (Entwurf ${l.entwurf} von höchstens 3, ${l.bestanden ? "bestanden" : "NICHT bestanden, bester Versuch"})`,
    "",
    "| Kriterium | Note | Begründung |",
    "|---|---|---|",
    `| Passt zum Kanal | ${l.passt_zum_kanal.note}/10 | ${zelle(l.passt_zum_kanal.begruendung)} |`,
    `| Spannungsbogen | ${l.spannungsbogen.note}/10 | ${zelle(l.spannungsbogen.begruendung)} |`,
    `| Thema interessant | ${l.thema_interessant.note}/10 | ${zelle(l.thema_interessant.begruendung)} |`,
    `| Sprache | ${l.sprache.note}/10 | ${zelle(l.sprache.begruendung)} |`,
    "",
    `**Schwächste Stelle:** ${l.schwaechste_stelle}`,
    "",
  );
}
if (post.bildpruefung) zeilen.push(`**Titelbild:** ${post.bildpruefung.passt ? "passt" : "PASST NICHT"} – ${post.bildpruefung.grund}`, "");
zeilen.push("### Seiten", "", ...post.bilder.map((b) => `<img src="${basis}/${b}" width="200">`), "");
zeilen.push("### Bildunterschrift", "", post.caption, "", post.hashtags.map((h) => `#${h}`).join(" "));
console.log(zeilen.join("\n"));
