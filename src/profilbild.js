// Rendert Profilbilder im Kanal-Design nach profil/.
//   node src/profilbild.js
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { konfig, WURZEL } from "./konfig.js";
import { schriftCss } from "./bilder.js";

const f = konfig.farben;
const basis = `${schriftCss()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1080px}
body{background:${f.hintergrund};color:${f.text};display:flex;flex-direction:column;align-items:center;justify-content:center;
  font-family:"Playfair Display",serif;position:relative;overflow:hidden}
body::before{content:"";position:absolute;inset:0;background:radial-gradient(700px 700px at 50% 0%, ${f.akzent}2e, transparent 65%)}
body>*{position:relative}`;

// Instagram schneidet das Bild rund zu: alles Wichtige liegt im inneren Kreis.
const VARIANTEN = {
  monogramm: `<style>${basis}
    .m{font-weight:700;font-size:560px;line-height:.9;letter-spacing:-.03em}
    .m i{color:${f.akzent};font-style:normal}
    .s{width:150px;height:12px;border-radius:6px;background:${f.akzent};margin-top:36px}</style>
    <div class="m">E<i>.</i></div><div class="s"></div>`,
  wortmarke: `<style>${basis}
    .o{font-weight:700;font-style:italic;font-size:150px;line-height:1;color:${f.akzent}}
    .u{font-weight:700;font-size:150px;line-height:1.05}
    .s{width:120px;height:10px;border-radius:5px;background:${f.akzent};margin-top:48px}</style>
    <div class="o">Erfolgs</div><div class="u">guru</div><div class="s"></div>`,
};

const ordner = path.join(WURZEL, "profil");
fs.mkdirSync(ordner, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1080 } });
for (const [name, html] of Object.entries(VARIANTEN)) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(ordner, `profilbild-${name}.jpg`), type: "jpeg", quality: 95 });
  console.log(`profil/profilbild-${name}.jpg`);
}
await browser.close();
