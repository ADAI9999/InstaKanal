// Erzeugt das Titelbild eines Beitrags per KI.
// Dienst je nach hinterlegtem Schlüssel: OPENAI_API_KEY (GPT Image) oder GEMINI_API_KEY (Google).
//   https://developers.openai.com/api/docs/guides/image-generation
//   https://aistudio.google.com/docs/image-generation
import { konfig } from "./konfig.js";

const GEMEINSAM = `It must stop a thumb scrolling through a feed: one clear main subject that is readable at thumbnail size and raises a question. The main subject sits in the upper two thirds of the frame; the bottom third is darker and calm, because text will be placed over it. Set in Germany or Central Europe unless the description says otherwise. Any person shown is fictional and does not resemble a real, known individual. No text, no letters, no captions, no logos, no brand names, no watermarks, no borders.`;

const STILE = {
  nahaufnahme: "Photorealistic documentary photograph with a cinematic look: a person shot close (head and shoulders), strong directional light with deep shadows, high contrast, slightly muted colours, real-looking skin, an unmistakable facial expression. A real, unposed moment, not a stock photo.",
  gegenstand: "Photorealistic still life of a single object, large in the frame, on a dark surface, lit by one dramatic light source from the side, shallow depth of field, rich texture. No people.",
  schwarzweiss: "High-contrast black and white photograph in the style of classic cinema: deep blacks, hard directional light, visible grain, strong composition.",
  illustration: "Hand-drawn illustration in ink and loose watercolour on textured paper, like a picture book for adults: confident black outlines, a limited warm palette, expressive but simple shapes. Not a photograph, no speech bubbles.",
  tier: "Photorealistic wildlife or animal photograph, the animal large in the frame and sharp, expressive eyes, dramatic natural light, dark blurred background.",
  ort: "Atmospheric photograph of a place or room without any people: strong mood, one light source (window, lamp, street light, fog), deep shadows, a single detail that tells a story.",
  sinnbild: "Photorealistic conceptual image with one surreal, striking idea that could not exist quite like this in reality but looks completely real: clean composition, dramatic light, dark background.",
  haende: "Photorealistic close-up of hands holding or doing something, no face visible, strong side light, shallow depth of field, real skin texture and small imperfections.",
};

const stilText = (bildstil) => `${STILE[bildstil] ?? STILE.nahaufnahme} ${GEMEINSAM}`;

async function mitOpenAI(bildidee, bildstil, schluessel) {
  const modell = konfig.bildmodell || "gpt-image-2.5-sunburst";
  const antwort = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${schluessel}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modell,
      prompt: `${bildidee}\n\n${stilText(bildstil)}`,
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

async function mitGemini(bildidee, bildstil, schluessel) {
  const modell = konfig.bildmodell || "gemini-nano-banana-2.1";
  const antwort = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": schluessel, "Content-Type": "application/json", "Api-Revision": "2026-05-20" },
    body: JSON.stringify({
      model: modell,
      input: [{ type: "text", text: `${bildidee}\n\n${stilText(bildstil)}` }],
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
export async function erzeugeTitelbild(bildidee, bildstil = "nahaufnahme") {
  const openai = process.env.OPENAI_API_KEY?.trim();
  const gemini = process.env.GEMINI_API_KEY?.trim();
  if (!openai && !gemini) {
    console.log("Titelbild: kein Bild-Schlüssel hinterlegt, die Titelseite bleibt ohne Bild.");
    return null;
  }
  let letzter;
  for (let versuch = 1; versuch <= 2; versuch++) {
    try {
      const { daten, modell } = openai ? await mitOpenAI(bildidee, bildstil, openai) : await mitGemini(bildidee, bildstil, gemini);
      console.log(`Bild erzeugt (${modell}, ${bildstil}).`);
      return { typ: "image/jpeg", daten };
    } catch (fehler) {
      letzter = fehler;
      console.log(`Titelbild: Versuch ${versuch} fehlgeschlagen (${fehler.message}).`);
    }
  }
  throw new Error(`Kein Titelbild erzeugt: ${letzter.message}`);
}
