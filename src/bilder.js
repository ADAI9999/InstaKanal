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
  ["Playfair Display", 700, "normal", "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff2"],
  ["Playfair Display", 700, "italic", "@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff2"],
];

function schriftCss() {
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
.fuss{display:flex;justify-content:space-between;align-items:center;font-size:28px;color:${f.gedaempft}}
.fuss b{color:${f.text};font-weight:600}
.strich{width:96px;height:6px;background:${f.akzent};border-radius:3px;margin-bottom:56px}
.serif{font-family:"Playfair Display",serif;font-weight:700;line-height:1.16;letter-spacing:-.01em;text-wrap:balance}
.akzent{color:${f.akzent};font-style:italic}
.zitat{font-size:var(--gr)}
.titel{font-size:var(--gr)}
.unter{margin-top:44px;font-size:38px;line-height:1.4;color:${f.gedaempft};text-wrap:balance}
.nummer{font-family:"Playfair Display",serif;font-weight:700;font-size:150px;line-height:1;color:${f.akzent};margin-bottom:36px}
.ueber{font-size:66px}
.text{margin-top:40px;font-size:42px;line-height:1.5;color:${f.text};opacity:.86;text-wrap:pretty}
.weiter{font-weight:600;color:${f.akzent}}
.folgen{margin-top:56px;display:inline-block;align-self:flex-start;padding:26px 44px;border-radius:999px;
  background:${f.akzent};color:${f.hintergrund};font-size:36px;font-weight:700}
`;
}

function seite({ mitte, fussLinks, fussRechts }) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css()}</style></head><body>
<div class="kopf"><span class="marke">${esc(konfig.kanalname)}</span><span></span></div>
<div class="mitte">${mitte}</div>
<div class="fuss"><span>${fussLinks}</span><span>${fussRechts}</span></div>
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

function seitenHtml(post) {
  const handle = `<b>@${esc(konfig.handle)}</b>`;
  if (post.typ === "zitat") {
    const gr = groesse(post.zitat.length, [[60, 104], [90, 90], [120, 78], [Infinity, 68]]);
    return [
      seite({
        mitte: `<div class="strich"></div><p class="serif zitat" style="--gr:${gr}px">${hervorheben(post.zitat, post.hervorhebung)}</p>`,
        fussLinks: handle,
        fussRechts: "",
      }),
    ];
  }

  const gesamt = post.slides.length + 2;
  const zaehler = (n) => `${n} / ${gesamt}`;
  const titelGr = groesse(post.titel.length, [[30, 112], [45, 96], [60, 84], [Infinity, 74]]);
  return [
    seite({
      mitte: `<div class="strich"></div><h1 class="serif titel" style="--gr:${titelGr}px">${esc(post.titel)}</h1><p class="unter">${esc(post.untertitel)}</p>`,
      fussLinks: handle,
      fussRechts: `<span class="weiter">Wischen →</span>`,
    }),
    ...post.slides.map((s, i) =>
      seite({
        mitte: `<div class="nummer">${String(i + 1).padStart(2, "0")}</div><h2 class="serif ueber">${esc(s.ueberschrift)}</h2><p class="text">${esc(s.text)}</p>`,
        fussLinks: handle,
        fussRechts: zaehler(i + 2),
      }),
    ),
    seite({
      mitte: `<div class="strich"></div><p class="serif titel" style="--gr:84px">${esc(post.abschluss)}</p><span class="folgen">Folge @${esc(konfig.handle)}</span>`,
      fussLinks: "Speichern für später",
      fussRechts: zaehler(gesamt),
    }),
  ];
}

/** Rendert alle Seiten eines Beitrags als JPEG und gibt die Dateinamen zurück. */
export async function rendere(post, ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE }, deviceScaleFactor: 1 });
    const dateien = [];
    const seiten = seitenHtml(post);
    for (let i = 0; i < seiten.length; i++) {
      await page.setContent(seiten[i], { waitUntil: "load" });
      await page.evaluate(() => document.fonts.ready);
      const zuHoch = await page.evaluate(() => document.body.scrollHeight > document.body.clientHeight);
      if (zuHoch) throw new Error(`Seite ${i + 1} passt nicht ins Bild (Text zu lang).`);
      const name = `${i + 1}.jpg`;
      await page.screenshot({ path: path.join(ordner, name), type: "jpeg", quality: 92 });
      dateien.push(name);
    }
    return dateien;
  } finally {
    await browser.close();
  }
}
