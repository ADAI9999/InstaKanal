// Veröffentlicht den ältesten freigegebenen, noch nicht geposteten Beitrag.
//
//   node src/posten.js            veröffentlichen
//   node src/posten.js --probe    nur prüfen, nichts veröffentlichen
//   node src/posten.js --id <teil> einen bestimmten Beitrag veröffentlichen
import { konfig, ladePosts, speicherePost } from "./konfig.js";
import { veroeffentliche, pruefeZugang } from "./instagram.js";

const probe = process.argv.includes("--probe");

function bildBasis() {
  if (process.env.BILD_BASIS_URL) return process.env.BILD_BASIS_URL.replace(/\/$/, "");
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error("GITHUB_REPOSITORY oder BILD_BASIS_URL muss gesetzt sein.");
  return `https://raw.githubusercontent.com/${repo}/main`;
}

function bildunterschrift(post) {
  const tags = post.hashtags.map((h) => `#${h}`).join(" ");
  const erfunden = ["geschichte", "gleichnis"].includes(post.typ);
  const herkunft = (post.quellen ?? []).map((q) => new URL(q).hostname.replace(/^www\./, ""));
  const hinweise = [
    erfunden ? "Geschichte frei erfunden." : "",
    herkunft.length ? `Quellen: ${[...new Set(herkunft)].slice(0, 3).join(", ")}.` : "",
    post.titelbild === "ki" ? "Bilder KI-generiert." : "",
  ].filter(Boolean);
  const quelle = hinweise.length ? `\n\n${hinweise.join(" ")}` : "";
  return `${post.caption}\n\n✅ Folge @${konfig.handle} für mehr\n\n${tags}${quelle}`.slice(0, 2200);
}

async function main() {
  if (probe && process.env.IG_ACCESS_TOKEN) {
    const konto = await pruefeZugang();
    console.log(`Zugang in Ordnung: Instagram-Konto @${konto.username}`);
  }
  const wunsch = process.argv.includes("--id") ? process.argv[process.argv.indexOf("--id") + 1] : "";
  // Tageshöchstzahl (deutsche Zeit); gilt für geplante Läufe, nicht für gezieltes Posten.
  const tag = (d) => new Date(d).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" });
  const heute = ladePosts().filter((p) => p.veroeffentlicht && tag(p.veroeffentlicht.zeit) === tag(Date.now())).length;
  if (!wunsch && !probe && heute >= (konfig.maxProTag ?? 4)) {
    console.log(`Heute schon ${heute} Beiträge veröffentlicht (Höchstzahl ${konfig.maxProTag}). Nichts zu tun.`);
    return;
  }
  const offen = ladePosts().filter((p) => !p.veroeffentlicht);
  const post = wunsch ? offen.find((p) => p.id === wunsch || p.id.includes(wunsch)) : offen[0];
  if (wunsch && !post) throw new Error(`Kein freigegebener, ungeposteter Beitrag passt zu „${wunsch}“.`);
  if (!post) {
    console.log("Kein offener Beitrag vorhanden. Nichts zu tun.");
    return;
  }

  const bildUrls = post.bilder.map((b) => `${bildBasis()}/posts/${post.id}/${b}`);
  for (const url of bildUrls) {
    const antwort = await fetch(url, { method: "HEAD" });
    if (!antwort.ok) throw new Error(`Bild nicht öffentlich abrufbar (${antwort.status}): ${url}`);
  }

  const caption = bildunterschrift(post);
  console.log(`Beitrag: ${post.id} (${post.bilder.length} Bild(er)), Thema: ${post.thema}`);
  if (probe) {
    console.log(`Probe: Bilder erreichbar, es wurde nichts veröffentlicht.\n\n${caption}`);
    return;
  }

  const mediaId = await veroeffentliche({ bildUrls, caption });
  post.veroeffentlicht = { mediaId, zeit: new Date().toISOString() };
  speicherePost(post.ordner, post);
  console.log(`Veröffentlicht. Media-ID: ${mediaId}`);
}

main().catch((fehler) => {
  console.error(`Fehler: ${fehler.message}`);
  process.exit(1);
});
