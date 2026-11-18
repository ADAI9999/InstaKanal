// Erzeugt das Titelbild eines Beitrags mit Googles Bildmodell (Gemini API).
// Doku: https://aistudio.google.com/docs/image-generation
import { konfig } from "./konfig.js";

const ENDPUNKT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODELL = konfig.bildmodell || "gemini-nano-banana-2.1";

const STIL = `Photorealistic, candid photograph that looks like it was taken with a phone or a small camera by a friend, not a stock photo. Natural light, real-looking skin and textures, slightly imperfect framing, shallow depth of field. The main subject sits in the upper two thirds of the frame; the bottom third is calm and darker, because text will be placed below. Every person shown is fictional and does not resemble any real, known individual. No text, no captions, no logos, no brand names, no watermarks, no borders.`;

/** Sucht in der Antwort den ersten Bildblock, egal wo er verschachtelt liegt. */
function findeBild(knoten) {
  if (!knoten || typeof knoten !== "object") return null;
  if (typeof knoten.data === "string" && knoten.data.length > 1000 && (knoten.type === "image" || knoten.mime_type)) {
    return knoten.data;
  }
  for (const wert of Object.values(knoten)) {
    const treffer = findeBild(wert);
    if (treffer) return treffer;
  }
  return null;
}

async function erzeuge(bildidee, schluessel) {
  const antwort = await fetch(ENDPUNKT, {
    method: "POST",
    headers: {
      "x-goog-api-key": schluessel,
      "Content-Type": "application/json",
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify({
      model: MODELL,
      input: [{ type: "text", text: `${bildidee}\n\n${STIL}` }],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "5:4", image_size: "1K" },
    }),
  });
  const json = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw new Error(`Bilddienst antwortet mit ${antwort.status}: ${json.error?.message ?? "unbekannter Fehler"}`);
  const daten = findeBild(json);
  if (!daten) throw new Error("Der Bilddienst hat kein Bild geliefert (möglicherweise abgelehnt).");
  return daten;
}

/**
 * Liefert { typ, daten } oder null, wenn kein Schlüssel gesetzt ist.
 * Mit Schlüssel gibt es keinen Beitrag ohne Bild: Nach zwei Fehlversuchen bricht der Lauf ab.
 */
export async function erzeugeTitelbild(bildidee) {
  const schluessel = process.env.GEMINI_API_KEY;
  if (!schluessel) {
    console.log("Titelbild: GEMINI_API_KEY fehlt, die Titelseite bleibt ohne Bild.");
    return null;
  }
  let letzter;
  for (let versuch = 1; versuch <= 2; versuch++) {
    try {
      const daten = await erzeuge(bildidee, schluessel);
      console.log(`Titelbild erzeugt (${MODELL}).`);
      return { typ: "image/jpeg", daten };
    } catch (fehler) {
      letzter = fehler;
      console.log(`Titelbild: Versuch ${versuch} fehlgeschlagen (${fehler.message}).`);
    }
  }
  throw new Error(`Kein Titelbild erzeugt: ${letzter.message}`);
}
