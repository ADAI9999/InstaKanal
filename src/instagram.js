// Veröffentlichen über die offizielle Instagram-API.
// Doku: https://developers.facebook.com/docs/instagram-platform/content-publishing
import { konfig } from "./konfig.js";

const VERSION = process.env.IG_API_VERSION || "v27.0";

// Unified Login liefert Systemnutzer-Token für graph.facebook.com (beginnen mit "EA"),
// das ältere Instagram-Login liefert Token für graph.instagram.com (beginnen mit "IG").
function host() {
  if (process.env.IG_API_HOST) return process.env.IG_API_HOST;
  return token().startsWith("IG") ? "graph.instagram.com" : "graph.facebook.com";
}
const basis = () => `https://${host()}/${VERSION}`;

function token() {
  const t = process.env.IG_ACCESS_TOKEN?.trim();
  if (!t) throw new Error("IG_ACCESS_TOKEN fehlt (GitHub-Secret bzw. Umgebungsvariable).");
  return t;
}

async function anfrage(methode, pfad, felder = {}) {
  const daten = new URLSearchParams({ ...felder, access_token: token() });
  const url = methode === "GET" ? `${basis()}${pfad}?${daten}` : `${basis()}${pfad}`;
  const antwort = await fetch(url, methode === "GET" ? {} : { method: "POST", body: daten });
  const json = await antwort.json().catch(() => ({}));
  if (!antwort.ok || json.error) {
    const e = json.error ?? {};
    throw new Error(`Instagram-API ${methode} ${pfad}: ${e.message ?? antwort.status} (Code ${e.code ?? "?"})`);
  }
  return json;
}

export async function kontoId() {
  const fest = process.env.IG_USER_ID || konfig.instagramKontoId;
  if (fest) return fest;
  if (host() !== "graph.instagram.com") {
    throw new Error("Die Instagram-Konto-ID fehlt (instagramKontoId in config.json).");
  }
  const ich = await anfrage("GET", "/me", { fields: "user_id,username" });
  return ich.user_id ?? ich.id;
}

async function warteAufContainer(id) {
  for (let versuch = 0; versuch < 30; versuch++) {
    const { status_code } = await anfrage("GET", `/${id}`, { fields: "status_code" });
    if (status_code === "FINISHED") return;
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new Error(`Instagram konnte das Bild nicht verarbeiten (Status ${status_code}).`);
    }
    await new Promise((r) => setTimeout(r, versuch === 0 ? 3_000 : 10_000));
  }
  throw new Error("Instagram hat das Bild nach 5 Minuten noch nicht verarbeitet.");
}

/** Veröffentlicht ein Bild oder ein Karussell. Gibt die Media-ID zurück. */
export async function veroeffentliche({ bildUrls, caption }) {
  const konto = await kontoId();
  let container;

  if (bildUrls.length === 1) {
    container = await anfrage("POST", `/${konto}/media`, { image_url: bildUrls[0], caption });
  } else {
    const kinder = [];
    for (const url of bildUrls) {
      const kind = await anfrage("POST", `/${konto}/media`, { image_url: url, is_carousel_item: "true" });
      await warteAufContainer(kind.id);
      kinder.push(kind.id);
    }
    container = await anfrage("POST", `/${konto}/media`, {
      media_type: "CAROUSEL",
      children: kinder.join(","),
      caption,
    });
  }

  await warteAufContainer(container.id);
  return veroeffentlicheContainer(konto, container.id);
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Meta drosselt Apps zeitweise („Application request limit reached“, Code 4/17/32/613).
// Dann später erneut versuchen, vorher aber prüfen, ob der Beitrag nicht doch erschienen ist.
async function veroeffentlicheContainer(konto, id) {
  for (let versuch = 1; ; versuch++) {
    try {
      const ergebnis = await anfrage("POST", `/${konto}/media_publish`, { creation_id: id });
      return ergebnis.id;
    } catch (fehler) {
      if (!/\(Code (4|17|32|613)\)/.test(fehler.message) || versuch >= 6) throw fehler;
      console.log(`Instagram drosselt (${fehler.message}). Neuer Versuch in ${versuch * 2} Minuten.`);
      await pause(versuch * 120_000);
      const { status_code } = await anfrage("GET", `/${id}`, { fields: "status_code" }).catch(() => ({}));
      if (status_code === "PUBLISHED") {
        const { data } = await anfrage("GET", `/${konto}/media`, { fields: "id", limit: "1" });
        return data[0].id;
      }
    }
  }
}

/** Liest Namen und ID des Kontos, ohne etwas zu verändern. */
export async function pruefeZugang() {
  const konto = await kontoId();
  return anfrage("GET", `/${konto}`, { fields: "username" });
}

/** Verlängert ein 60-Tage-Token des Instagram-Logins. Systemnutzer-Token laufen nicht ab. */
export async function erneuereToken() {
  if (host() !== "graph.instagram.com") throw new Error("Dieses Token läuft nicht ab und muss nicht verlängert werden.");
  const daten = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token() });
  const antwort = await fetch(`https://${host()}/refresh_access_token?${daten}`);
  const json = await antwort.json().catch(() => ({}));
  if (!antwort.ok || !json.access_token) {
    throw new Error(`Token konnte nicht verlängert werden: ${json.error?.message ?? antwort.status}`);
  }
  return json.access_token;
}

/** Liefert ID und Bildunterschrift der neuesten Beiträge, um doppeltes Posten zu verhindern. */
export async function letzteBeitraege(anzahl = 3) {
  const konto = await kontoId();
  const { data } = await anfrage("GET", `/${konto}/media`, { fields: "id,caption,timestamp", limit: String(anzahl) });
  return data ?? [];
}
