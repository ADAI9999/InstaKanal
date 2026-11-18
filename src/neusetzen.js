// Setzt einen vorgelegten Beitrag mit geändertem Text oder Layout neu, ohne neue Bilder zu erzeugen.
// Nutzt die gespeicherten Rohbilder aus dem Freigabe-Zweig, aktualisiert Zweig und Freigabe-Anfrage.
//   node src/neusetzen.js entwuerfe/<name>.json <beitrags-id>
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { WURZEL } from "./konfig.js";
import { pruefe } from "./texte.js";
import { rendere } from "./bilder.js";

const [datei, id] = process.argv.slice(2);
if (!datei || !id) throw new Error("Aufruf: node src/neusetzen.js entwuerfe/<name>.json <beitrags-id>");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: WURZEL, maxBuffer: 1e8, ...opts });
const zweig = `post/${id}`;

run("git", ["fetch", "-q", "origin", zweig]);
const arbeit = fs.mkdtempSync(path.join(os.tmpdir(), "neusetzen-"));
run("git", ["worktree", "add", "-q", "--detach", arbeit, `origin/${zweig}`]);
try {
  const ordner = path.join(arbeit, "posts", id);
  const alt = JSON.parse(fs.readFileSync(path.join(ordner, "post.json"), "utf8"));
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
  const post = { ...alt, ...inhalt, typ: entwurf.typ, recherche: entwurf.fakten ?? alt.recherche, lektorat: { ...alt.lektorat, hinweis: "Text nach dem Lektorat von Hand überarbeitet" } };
  post.bilder = await rendere(post, ordner, foto, seitenfotos);
  fs.cpSync(roh, path.join(ordner, "roh"), { recursive: true });
  const { id: _i, ordner: _o, ...daten } = post;
  fs.writeFileSync(path.join(ordner, "post.json"), JSON.stringify(daten, null, 2) + "\n");

  run("git", ["add", "-A", `posts/${id}`], { cwd: arbeit });
  const geaendert = run("git", ["status", "--porcelain"], { cwd: arbeit }).toString().trim();
  if (geaendert) {
    run("git", ["commit", "-q", "-m", `Neu gesetzt: ${id}`], { cwd: arbeit });
    run("git", ["push", "-q", "origin", `HEAD:${zweig}`], { cwd: arbeit });
  }

  const nummer = run("gh", ["pr", "list", "--head", zweig, "--json", "number", "--jq", ".[0].number"]).toString().trim();
  const repo = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]).toString().trim();
  const text = run("node", [path.join(WURZEL, "src", "freigabetext.js"), id, zweig], { cwd: arbeit, env: { ...process.env, GITHUB_REPOSITORY: repo, POSTS_ORDNER: path.join(arbeit, "posts") } }).toString();
  const textdatei = path.join(os.tmpdir(), `pr-${id}.md`);
  fs.writeFileSync(textdatei, text);
  if (nummer) run("gh", ["pr", "edit", nummer, "--body-file", textdatei]);

  const vorschau = path.join(WURZEL, "vorschau", "fertig", id);
  fs.rmSync(vorschau, { recursive: true, force: true });
  fs.mkdirSync(vorschau, { recursive: true });
  for (const b of post.bilder) fs.copyFileSync(path.join(ordner, b), path.join(vorschau, b));
  console.log(`Neu gesetzt: ${post.bilder.length} Seiten, Freigabe-Anfrage ${nummer || "(keine gefunden)"} aktualisiert, Vorschau in vorschau/fertig/${id}/`);
} finally {
  run("git", ["worktree", "remove", "--force", arbeit]);
}
