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
  ["Lora", 400, "normal", "@fontsource/lora/files/lora-latin-400-normal.woff2"],
  ["Lora", 400, "italic", "@fontsource/lora/files/lora-latin-400-italic.woff2"],
  ["Lora", 700, "normal", "@fontsource/lora/files/lora-latin-700-normal.woff2"],
  ["Lora", 700, "italic", "@fontsource/lora/files/lora-latin-700-italic.woff2"],
  ["Special Elite", 400, "normal", "@fontsource/special-elite/files/special-elite-latin-400-normal.woff2"],
  ["Courier Prime", 400, "normal", "@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2"],
  ["Courier Prime", 700, "normal", "@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2"],
];

/**
 * Gestaltungen. Jeder Beitrag wählt eine, damit der Feed nicht einfarbig wirkt.
 *   nacht    dunkler Grund, goldene Akzente
 *   papier   warmes Papier, dunkle Schrift, rote Akzente; passt zu Zeichnungen
 *   archiv   graues Akten-Papier, Schreibmaschinenschrift, roter Stempel; für wahre Begebenheiten
 *   vollbild jedes Bild füllt die ganze Seite, Text weiß unten auf dem Bild
 */
export const DESIGNS = {
  nacht: { hintergrund: "#0E1014", text: "#F4F1EA", gedaempft: "#9A9FAB", akzent: "#E9B44C", titel: '"Playfair Display",serif', lauf: '"Playfair Display",serif', glanz: true },
  papier: { hintergrund: "#F2EBDD", text: "#24201B", gedaempft: "#7C7264", akzent: "#A3352A", titel: '"Playfair Display",serif', lauf: '"Lora",serif', glanz: false, block: "rand" },
  archiv: { hintergrund: "#E6E1D5", text: "#1B1B1A", gedaempft: "#6E6A61", akzent: "#B3261E", titel: '"Special Elite",monospace', lauf: '"Courier Prime",monospace', glanz: false, rahmen: true, block: "foto", skala: 0.8 },
  vollbild: { hintergrund: "#0B0B0C", text: "#FFFFFF", gedaempft: "#D0D0D0", akzent: "#F2C14E", titel: '"Playfair Display",serif', lauf: '"Lora",serif', glanz: false, vollbild: true },
};

export function schriftCss() {
  return SCHRIFTEN.map(([familie, gewicht, stil, datei]) => {
    const daten = fs.readFileSync(path.join(WURZEL, "node_modules", datei)).toString("base64");
    return `@font-face{font-family:"${familie}";font-weight:${gewicht};font-style:${stil};src:url(data:font/woff2;base64,${daten}) format("woff2");}`;
  }).join("\n");
}

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[z]);

let SCHRIFT_CSS = null;

/**
 * Helle Gestaltungen legen das Bild als eigenen Block über den Text, statt den Text auf das Bild zu setzen:
 *   rand  Bild über die ganze Breite oben, harte Kante zum Papier
 *   foto  eingeklebtes Foto mit hellem Rand, leicht schräg
 */
function blockCss(f) {
  const titelH = f.block === "foto" ? 590 : 680;
  const seiteH = f.block === "foto" ? 560 : 610;
  const oben = f.block === "foto" ? 70 : 0;
  const lage =
    f.block === "foto"
      ? `top:${oben}px;left:70px;right:70px;border:14px solid #F7F4EC;box-shadow:0 10px 30px #0004;transform:rotate(-1.2deg)`
      : "top:0;left:0;right:0";
  return `.foto{${lage};height:${titelH}px}
.foto::after{${f.block === "foto" ? "display:none" : `background:linear-gradient(to bottom, ${f.hintergrund}00 88%, ${f.hintergrund} 100%)`}}
body.seitenfoto .foto{height:${seiteH}px}
body.mitfoto .mitte{justify-content:center;margin-top:${oben + titelH - 60}px;padding-bottom:0}
body.seitenfoto .mitte{margin-top:${oben + seiteH - 60}px}
body.mitfoto .stempel{margin-bottom:28px}`;
}

function css(design = "nacht") {
  const f = DESIGNS[design] ?? DESIGNS.nacht;
  SCHRIFT_CSS ??= schriftCss();
  return `
${SCHRIFT_CSS}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${BREITE}px;height:${HOEHE}px}
body{background:${f.hintergrund};color:${f.text};font-family:"Inter",sans-serif;
  display:flex;flex-direction:column;padding:96px 92px 84px;position:relative;overflow:hidden}
body::before{content:"";position:absolute;inset:0;
  ${f.glanz ? `background:radial-gradient(900px 700px at 85% -10%, ${f.akzent}22, transparent 60%)` : ""}}
${f.rahmen ? `body::after{content:"";position:absolute;inset:34px;border:2px solid ${f.text}33;pointer-events:none}` : ""}
body>*{position:relative}
.mitte{flex:1;display:flex;flex-direction:column;justify-content:center}
.fuss{display:flex;justify-content:space-between;align-items:center;font-size:26px;color:${f.gedaempft}}
.fuss .marke{font-family:"Playfair Display",serif;font-style:italic;font-size:26px;letter-spacing:.02em;opacity:.85}
.strich{width:96px;height:6px;background:${f.akzent};border-radius:3px;margin-bottom:56px}
.serif{font-family:${f.lauf};line-height:1.25;letter-spacing:-.005em}
.fett{font-family:${f.titel};font-weight:700;font-size:calc(var(--gr) * ${f.skala ?? 1});text-wrap:balance;line-height:1.2}
.akzent{color:${f.akzent};font-style:italic;font-weight:700}
.erzaehl{font-weight:400;font-size:calc(var(--gr) * ${f.skala ?? 1});line-height:1.38;letter-spacing:0;text-wrap:pretty}
.erzaehl p+p{margin-top:.8em}
.kopfzeile{margin-bottom:.6em;color:${f.akzent}}
.kopfzeile.allein{color:${f.text}}
.kopfzeile b{color:${f.akzent}}
.kopfzeile:not(.allein) b{color:${f.text}}
.erzaehl b{font-weight:700}
.erzaehl i{font-style:italic}
.aufhaenger{margin-top:30px;font-family:${f.lauf};font-style:italic;font-size:${Math.round(42 * (f.skala ?? 1))}px;line-height:1.35;color:${f.text};opacity:.9;text-wrap:balance}
.abspann{margin-top:0;font-size:46px;line-height:1.4;text-wrap:balance}
.stempel{display:inline-block;align-self:center;margin-bottom:40px;padding:10px 26px;border:4px solid ${f.akzent};color:${f.akzent};
  font-family:"Special Elite",monospace;font-size:34px;letter-spacing:.12em;text-transform:uppercase;transform:rotate(-4deg)}
body.zentriert .mitte{align-items:center;text-align:center}
body.zentriert .folgen{align-self:center}
.weiter{font-weight:600;color:${f.akzent}}
.foto{position:absolute;inset:0 0 auto 0;height:860px;background-size:cover;background-position:center}
.foto::after{content:"";position:absolute;inset:0;
  background:linear-gradient(to bottom, ${f.hintergrund}${f.vollbild ? "00" : "b3"} 0%, ${f.hintergrund}00 22%, ${f.hintergrund}00 ${f.vollbild ? "45" : "58"}%, ${f.hintergrund}${f.vollbild ? "f0" : ""} 100%)}
body.mitfoto::before{display:none}
body.seitenfoto .foto{height:740px}
body.seitenfoto .mitte{padding-bottom:40px}
body.mitfoto .mitte{justify-content:flex-end;padding-bottom:64px}
body.mitfoto .strich{margin-bottom:40px}
${f.vollbild ? `body.mitfoto .foto, body.seitenfoto .foto{height:${HOEHE}px}
body.mitfoto .mitte{padding-bottom:20px}
body.mitfoto{text-shadow:0 2px 18px #000a}` : ""}
.folgen{margin-top:56px;display:inline-block;align-self:flex-start;padding:26px 44px;border-radius:999px;
  background:${f.akzent};color:${f.hintergrund};font-size:36px;font-weight:700;text-shadow:none}
${f.block ? blockCss(f) : ""}
`;
}

function seite({ mitte, fussRechts, foto, zentriert, klein, design }) {
  const bild = foto ? `<div class="foto" style="background-image:url(data:${foto.typ};base64,${foto.daten})"></div>` : "";
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css(design)}</style></head><body class="${foto ? "mitfoto" : ""} ${foto && klein ? "seitenfoto" : ""} ${zentriert ? "zentriert" : ""}">
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
const SATZ_STUFEN = [[40, 108], [70, 94], [100, 82], [140, 72], [Infinity, 62]];
const ERZAEHL_STUFEN = [[90, 78], [150, 68], [220, 60], [290, 54], [Infinity, 50]];
const KOPF_STUFEN = [[30, 74], [60, 62], [90, 54], [Infinity, 50]];
const ERZAEHL_FOTO_STUFEN = [[80, 64], [130, 56], [180, 50], [240, 46], [Infinity, 42]];

/** Wandelt **fett** und *kursiv* in HTML um. */
const fmt = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
const ohneSterne = (s) => s.replace(/\*/g, "");

function seitenHtml(post, foto, seitenfotos = []) {
  const gesamt = post.seiten.length + 2;
  const zaehler = (n) => `${n} / ${gesamt}`;
  const zentriert = true;
  const design = DESIGNS[post.design] ? post.design : "nacht";

  const titel = seite({
    design,
    mitte: `${post.stempel ? `<div class="stempel">${esc(post.stempel)}</div>` : `<div class="strich"></div>`}<h1 class="serif fett" style="--gr:${groesse(post.titel.length, foto ? FOTOTITEL_STUFEN : TITEL_STUFEN)}px">${esc(post.titel)}</h1>${post.aufhaenger ? `<p class="aufhaenger">${esc(post.aufhaenger)}</p>` : ""}`,
    foto,
    zentriert,
    fussRechts: `<span class="weiter">Wischen →</span>`,
  });

  const mitten = post.seiten.map((eintrag, i) => {
    const kopf = (eintrag.ueberschrift ?? "").trim();
    const absaetze = (eintrag.absaetze ?? []).filter((a) => a.trim());
    const bild = seitenfotos[i] ?? null;
    const laenge = ohneSterne(absaetze.join(" ")).length + kopf.length;
    // Eine Seite, die nur aus einer Überschrift besteht, trägt sie groß (Sätze-Format).
    const kopfHtml = kopf
      ? `<h2 class="serif fett kopfzeile ${absaetze.length ? "" : "allein"}" style="--gr:${groesse(kopf.length, absaetze.length ? KOPF_STUFEN : SATZ_STUFEN)}px">${fmt(kopf)}</h2>`
      : "";
    const textHtml = absaetze.length
      ? `<div class="serif erzaehl" style="--gr:${groesse(laenge, bild ? ERZAEHL_FOTO_STUFEN : ERZAEHL_STUFEN)}px">${absaetze.map((a) => `<p>${fmt(a)}</p>`).join("")}</div>`
      : "";
    return seite({ design, mitte: kopfHtml + textHtml, fussRechts: zaehler(i + 2), zentriert, foto: bild, klein: true });
  });

  const ende = seite({
    design,
    mitte: `<p class="serif abspann">${esc(konfig.abspann ?? "")}</p><span class="folgen">Folge @${esc(konfig.handle)}</span>`,
    foto,
    zentriert,
    fussRechts: zaehler(gesamt),
  });

  return [titel, ...mitten, ende];
}

/** Rendert alle Seiten eines Beitrags als JPEG und gibt die Dateinamen zurück. */
export async function rendere(post, ordner, foto = null, seitenfotos = []) {
  fs.rmSync(ordner, { recursive: true, force: true });
  fs.mkdirSync(ordner, { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: BREITE, height: HOEHE }, deviceScaleFactor: 1 });
    const dateien = [];
    const seiten = seitenHtml(post, foto, seitenfotos);
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
