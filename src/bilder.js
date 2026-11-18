import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { konfig, WURZEL } from "./konfig.js";

const BREITE = 1080;
const HOEHE = 1350; // 4:5, das größte Hochformat im Feed

const SCHRIFTEN = [
  ["Inter", 400, "normal", "@fontsource/inter/files/inter-latin-400-normal.woff2"],
  ["Inter", 600, "normal", "@fontsource/inter/files/inter-latin-600-normal.woff2"],
  ["Inter", 700, "normal", "@fontsource/inter/files/inter-latin-700-normal.woff2"],
  ["Playfair Display", 400, "normal", "@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff2"],
  ["Playfair Display", 400, "italic", "@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff2"],
  ["Playfair Display", 700, "normal", "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2"],
  ["Playfair Display", 700, "italic", "@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2"],
];

export function schriftCss() {
  return SCHRIFTEN.map(([familie, gewicht, stil, datei]) => {
    const daten = fs.readFileSync(path.join(WURZEL, "node_modules", datei)).toString("base64");
    return `@font-face{font-family:"${familie}";font-weight:${gewicht};font-style:${stil};src:url(data:font/woff2;base64,${daten}) format("woff2");}`;
  }).join("\n");
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);

function css() {
  const f = konfig.farben;
  return `
${schriftCss()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${BREITE}px;height:${HOEHE}px}
body{background:${f.hintergrund};color:${f.text};font-family:"Inter",sans-serif;
  display:flex;flex-direction:column;padding:96px 92px 84px;position:relative;overflow:hidden}
body::before{content:"";position:absolute;inset:0;
  background:radial-gradient(900px 700px at 85% -10%, ${f.akzent}22, transparent 60%)}
body>*{position:relative}
.kopf{display:flex;justify-content:space-between;align-items:center;
  font-size:26px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${f.gedaempft}}
.kopf .marke{color:${f.text}}
.mitte{flex:1;display:flex;flex-direction:column;justify-content:center}
.fuss{display:flex;justify-content:space-between;align-items:center;font-size:26px;color:${f.gedaempft}}
.fuss .marke{font-family:"Playfair Display",serif;font-style:italic;font-size:26px;letter-spacing:.02em;opacity:.8}
.strich{width:96px;height:6px;background:${f.akzent};border-radius:3px;margin-bottom:56px}
.serif{font-family:"Playfair Display",serif;line-height:1.2;letter-spacing:-.01em}
.fett{font-weight:700;font-size:var(--gr);text-wrap:balance}
.akzent{color:${f.akzent};font-style:italic;font-weight:700}
.erzaehl{font-weight:400;font-size:var(--gr);line-height:1.38;letter-spacing:0;text-wrap:pretty}
.erzaehl p+p{margin-top:.85em}
.erzaehl b{font-weight:700}
.erzaehl i{font-style:italic}
.aufhaenger{margin-top:36px;font-size:40px;line-height:1.35;color:${f.text};opacity:.85;text-wrap:balance}
.abspann{margin-top:0;font-size:46px;line-height:1.4;text-wrap:balance}
body.zentriert .mitte{align-items:center;text-align:center}
body.zentriert .folgen{align-self:center}
.nummer{font-family:"Playfair Display",serif;font-weight:700;font-size:64px;line-height:1;color:${f.akzent};margin-bottom:44px}
.weiter{font-weight:600;color:${f.akzent}}
.schlusszeile{margin-top:44px;font-size:60px}
.foto{position:absolute;inset:0 0 auto 0;height:860px;background-size:cover;background-position:center}
.foto::after{content:"";position:absolute;inset:0;
  background:linear-gradient(to bottom, ${f.hintergrund}b3 0%, ${f.hintergrund}00 22%, ${f.hintergrund}00 58%, ${f.hintergrund} 100%)}
body.mitfoto::before{display:none}
body.mitfoto .mitte{justify-content:flex-end;padding-bottom:64px}
body.mitfoto .strich{margin-bottom:40px}
body.mitfoto .kopf{color:${f.text}}
.folgen{margin-top:56px;display:inline-block;align-self:flex-start;padding:26px 44px;border-radius:999px;
  background:${f.akzent};color:${f.hintergrund};font-size:36px;font-weight:700}
`;
}

function seite({ rubrik, mitte, fussLinks, fussRechts, foto, zentriert }) {
  const bild = foto ? `<div class="foto" style="background-image:url(data:${foto.typ};base64,${foto.daten})"></div>` : "";
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css()}</style></head><body class="${foto ? "mitfoto" : ""} ${zentriert ? "zentriert" : ""}">
${bild}<div class="mitte">${mitte}</div>
<div class="fuss"><span class="marke">${esc(konfig.wasserzeichen ?? konfig.kanalname)}</span><span>${fussRechts}</span></div>
</body></html>`;
}

function groesse(laenge, stufen) {
  for (const [bis, px] of stufen) if (laenge <= bis) return px;
  return stufen.at(-1)[1];
}

function hervorheben(satz, phrase) {
  const stelle = phrase ? satz.indexOf(phrase) : -1;
  if (stelle < 0) return esc(satz);
  return (
    esc(satz.slice(0, stelle)) +
    `<span class="akzent">${esc(phrase)}</span>` +
    esc(satz.slice(stelle + phrase.length))
  );
}

const TITEL_STUFEN = [[40, 104], [70, 90], [100, 78], [Infinity, 68]];
const FOTOTITEL_STUFEN = [[40, 88], [70, 76], [100, 66], [Infinity, 58]];
const SATZ_STUFEN = [[60, 96], [90, 84], [120, 74], [Infinity, 64]];
const ERZAEHL_STUFEN = [[110, 62], [180, 56], [250, 50], [Infinity, 45]];

/** Wandelt **fett** und *kursiv* in HTML um. */
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
const ohneSterne = (s) => s.replace(/\*/g, "");

function seitenHtml(post, foto) {
  const handle = `<b>@${esc(konfig.handle)}</b>`;
  const istGeschichte = post.typ === "geschichte";
  const rubrik = istGeschichte ? "Geschichte" : "Gedanken";
  const inhalt = istGeschichte ? post.seiten : post.saetze;
  const gesamt = inhalt.length + 2;
  const zaehler = (n) => `${n} / ${gesamt}`;
  const zentriert = istGeschichte;

  const titel = seite({
    rubrik,
    mitte: `<div class="strich"></div><h1 class="serif fett" style="--gr:${groesse(post.titel.length, foto ? FOTOTITEL_STUFEN : TITEL_STUFEN)}px">${esc(post.titel)}</h1>${post.aufhaenger ? `<p class="aufhaenger">${esc(post.aufhaenger)}</p>` : ""}`,
    foto,
    zentriert,
    fussLinks: handle,
    fussRechts: `<span class="weiter">Wischen →</span>`,
  });

  const mitten = inhalt.map((eintrag, i) => {
    const mitte = istGeschichte
      ? `<div class="serif erzaehl" style="--gr:${groesse(ohneSterne(eintrag.absaetze.join(" ")).length, ERZAEHL_STUFEN)}px">${eintrag.absaetze.map((a) => `<p>${fmt(a)}</p>`).join("")}</div>`
      : `<div class="nummer">${String(i + 1).padStart(2, "0")}</div><p class="serif fett" style="--gr:${groesse(eintrag.satz.length, SATZ_STUFEN)}px">${hervorheben(eintrag.satz, eintrag.hervorhebung)}</p>`;
    return seite({ rubrik, mitte, fussLinks: handle, fussRechts: zaehler(i + 2), zentriert });
  });

  const schlussHtml = istGeschichte
    ? `<p class="serif abspann">${esc(konfig.abspann ?? "")}</p>`
    : `<div class="strich"></div><p class="serif fett" style="--gr:${groesse(post.abschluss.length, SATZ_STUFEN)}px">${esc(post.abschluss)}</p>`;
  const ende = seite({
    rubrik,
    mitte: `${schlussHtml}<span class="folgen">Folge @${esc(konfig.handle)}</span>`,
    foto: istGeschichte ? foto : null,
    zentriert,
    fussLinks: "Speichern für später",
    fussRechts: zaehler(gesamt),
  });

  return [titel, ...mitten, ende];
}

/** Rendert alle Seiten eines Beitrags als JPEG und gibt die Dateinamen zurück. */
export async function rendere(post, ordner, foto = null) {
  fs.rmSync(ordner, { recursive: true, force: true });
  fs.mkdirSync(ordner, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE }, deviceScaleFactor: 1 });
    const dateien = [];
    const seiten = seitenHtml(post, foto);
    for (let i = 0; i < seiten.length; i++) {
      await page.setContent(seiten[i], { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const zuHoch = await page.evaluate(() => document.body.scrollHeight > document.body.clientHeight);
      if (zuHoch) throw new Error(`Seite ${i + 1} passt nicht ins Bild (Text zu lang).`);
      const name = `${String(i + 1).padStart(2, "0")}.jpg`;
      await page.screenshot({ path: path.join(ordner, name), type: "jpeg", quality: 92 });
      dateien.push(name);
    }
    return dateien;
  } finally {
    await browser.close();
  }
}
