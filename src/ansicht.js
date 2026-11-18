// Baut eine große Ansicht aller Beiträge (gepostet, freigegeben, offen zur Freigabe)
// nach vorschau/ansehen.html und öffnet sie im Browser.
//   npm run ansehen
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { POSTS_ORDNER, WURZEL } from "./konfig.js";

const git = (...a) => execFileSync("git", a, { cwd: WURZEL, maxBuffer: 64 * 1024 * 1024 });
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const b64 = (puffer) => `data:image/jpeg;base64,${puffer.toString("base64")}`;

git("fetch", "-q", "origin", "--prune");
const posts = [];
for (const id of fs.readdirSync(POSTS_ORDNER)) {
  const datei = path.join(POSTS_ORDNER, id, "post.json");
  if (!fs.existsSync(datei)) continue;
  const p = JSON.parse(fs.readFileSync(datei, "utf8"));
  posts.push({ id, p, stand: p.veroeffentlicht ? "gepostet" : "freigegeben, wartet", bild: (f) => fs.readFileSync(path.join(POSTS_ORDNER, id, f)) });
}
const zweige = git("branch", "-r").toString().split("\n").map((z) => z.trim()).filter((z) => z.startsWith("origin/post/"));
for (const zweig of zweige) {
  const id = zweig.replace("origin/post/", "");
  if (posts.some((x) => x.id === id)) continue;
  try {
    const p = JSON.parse(git("show", `${zweig}:posts/${id}/post.json`).toString());
    posts.push({ id, p, stand: "offen zur Freigabe", bild: (f) => git("show", `${zweig}:posts/${id}/${f}`) });
  } catch {
    // Zweig ohne Beitrag: überspringen
  }
}
posts.sort((a, b) => String(b.p.erstellt).localeCompare(String(a.p.erstellt)));

let html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beiträge ansehen</title><style>
body{margin:0;background:#15171c;color:#eee;font:16px/1.5 -apple-system,system-ui,sans-serif;padding:24px}
h1{font-size:22px}h2{font-size:19px;margin:36px 0 4px}.meta{color:#aab;margin-bottom:12px;font-size:14px}
.reihe{display:flex;gap:14px;overflow-x:auto;padding-bottom:14px;scroll-snap-type:x mandatory}
.reihe img{height:min(82vh,820px);border-radius:8px;scroll-snap-align:start;flex:none}
.cap{white-space:pre-wrap;background:#1e2128;padding:12px 14px;border-radius:8px;max-width:820px;font-size:14px;color:#ccd}
</style></head><body><h1>${posts.length} Beiträge, neueste zuerst. Jede Reihe seitlich wischen oder scrollen.</h1>`;
for (const { p, stand, bild } of posts) {
  const noten = p.lektorat ? ` · Lektorat ${p.lektorat.bestanden ? "bestanden" : "nicht bestanden"} (Schnitt ${p.lektorat.schnitt.toFixed(1)})` : "";
  html += `<h2>${esc(p.thema.trim())}</h2><div class="meta">${esc(p.typ)} · ${stand} · ${p.bilder.length} Seiten${p.bildstil ? ` · Bildstil ${esc(p.bildstil)}` : ""}${p.themenfeld ? ` · ${esc(p.themenfeld.split(":")[0])}` : ""}${noten}</div><div class="reihe">`;
  for (const f of p.bilder) html += `<img loading="lazy" src="${b64(bild(f))}">`;
  html += `</div><div class="cap">${esc(p.caption)}${p.quellen?.length ? `\n\nQuellen:\n${esc(p.quellen.join("\n"))}` : ""}</div>`;
}
html += "</body></html>";
const ziel = path.join(WURZEL, "vorschau", "ansehen.html");
fs.mkdirSync(path.dirname(ziel), { recursive: true });
fs.writeFileSync(ziel, html);
console.log(`${posts.length} Beiträge → vorschau/ansehen.html (${(html.length / 1e6).toFixed(1)} MB)`);
if (!process.argv.includes("--still")) execFileSync("open", [ziel]);
