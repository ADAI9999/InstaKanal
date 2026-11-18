// Erzeugt das Titelbild eines Beitrags per KI.
// Dienst je nach hinterlegtem Schlüssel: OPENAI_API_KEY (GPT Image) oder GEMINI_API_KEY (Google).
//   https://developers.openai.com/api/docs/guides/image-generation
//   https://aistudio.google.com/docs/image-generation
import { konfig } from "./konfig.js";

const STIL = `Photorealistic, candid photograph that looks like it was taken with a phone or a small camera by a friend, not a stock photo. Natural light, real-looking skin and textures, slightly imperfect framing, shallow depth of field. The main subject sits in the upper two thirds of the frame; the bottom third is calm and darker, because text will be placed below. Every person shown is fictional and does not resemble any real, known individual. No text, no captions, no logos, no brand names, no watermarks, no borders.`;

async function mitOpenAI(bildidee, schluessel) {
  const modell = konfig.bildmodell || "gpt-image-2.5-sunburst";
  const antwort = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modell,
      prompt: `${bildidee}\n\n${STIL}`,
      size: "1536x1024",
      quality: konfig.bildqualitaet || "medium",
      output_format: "jpeg",
      output_compression: 90,
    }),
  });
  const json = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw new Error(`OpenAI antwortet mit ${antwort.status}: ${json.error?.message ?? "unbekannter Fehler"}`);
  const daten = json.data?.[0]?.b64_json;
  if (!daten) throw new Error("OpenAI hat kein Bild geliefert.");
  return { daten, modell };
}

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

async function mitGemini(bildidee, schluessel) {
  const modell = konfig.bildmodell || "gemini-nano-banana-2.1";
  const antwort = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": schluessel, "Content-Type": "application/json", "Api-Revision": "2026-05-20" },
    body: JSON.stringify({
      model: modell,
      input: [{ type: "text", text: `${bildidee}\n\n${STIL}` }],
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "5:4", image_size: "1K" },
    }),
  });
  const json = await antwort.json().catch(() => ({}));
  if (!antwort.ok) throw new Error(`Google antwortet mit ${antwort.status}: ${json.error?.message ?? "unbekannter Fehler"}`);
  const daten = findeBild(json);
  if (!daten) throw new Error("Google hat kein Bild geliefert.");
  return { daten, modell };
}

/**
 * Liefert { typ, daten } oder null, wenn kein Schlüssel gesetzt ist.
 * Mit Schlüssel gibt es keinen Beitrag ohne Bild: Nach zwei Fehlversuchen bricht der Lauf ab.
 */
export async function erzeugeTitelbild(bildidee) {
  const openai = process.env.OPENAI_API_KEY?.trim();
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (!openai && !gemini) {
    console.log("Titelbild: kein Bild-Schlüssel hinterlegt, die Titelseite bleibt ohne Bild.");
    return null;
  }
  let letzter;
  for (let versuch = 1; versuch <= 2; versuch++) {
    try {
      const { daten, modell } = openai ? await mitOpenAI(bildidee, openai) : await mitGemini(bildidee, gemini);
      console.log(`Titelbild erzeugt (${modell}).`);
      return { typ: "image/jpeg", daten };
    } catch (fehler) {
      letzter = fehler;
      console.log(`Titelbild: Versuch ${versuch} fehlgeschlagen (${fehler.message}).`);
    }
  }
  throw new Error(`Kein Titelbild erzeugt: ${letzter.message}`);
}
