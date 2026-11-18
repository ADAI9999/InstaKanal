// Sucht ein lizenzfreies Symbolfoto für die Titelseite (Pexels) und lässt Claude das passendste wählen.
// Lizenz: https://www.pexels.com/license/ (frei nutzbar, auch auf Instagram; Bearbeitung erlaubt)
import Anthropic from "@anthropic-ai/sdk";

const MODELL = "claude-opus-5-5";
const KANDIDATEN = 6;

async function ladeBild(url) {
  const antwort = await fetch(url);
  if (!antwort.ok) throw new Error(`Foto nicht ladbar (${antwort.status})`);
  const typ = (antwort.headers.get("content-type") || "image/jpeg").split(";")[0];
  return { typ, daten: Buffer.from(await antwort.arrayBuffer()).toString("base64") };
}

async function suche(begriff, schluessel) {
  const parameter = new URLSearchParams({ query: begriff, orientation: "portrait", per_page: "30" });
  const antwort = await fetch(`https://api.pexels.com/v1/search?${parameter}`, {
    headers: { Authorization: schluessel },
  });
  if (!antwort.ok) throw new Error(`Pexels-Suche fehlgeschlagen (${antwort.status})`);
  return (await antwort.json()).photos ?? [];
}

/** Claude sieht die Kandidaten und wählt eines aus, oder keines (-1). */
async function waehle(vorschauen, titel) {
  const inhalt = [
    {
      type: "text",
      text: `Für die Titelseite eines Instagram-Karussells wird ein Symbolfoto gesucht. Der Titeltext lautet:\n\n„${titel}“\n\nDas Foto steht oben, der Text darunter. Es soll die Stimmung der Geschichte tragen und neugierig machen. Wähle das am besten passende Bild.\n\nNicht infrage kommen Bilder, auf denen das Gesicht eines Menschen erkennbar ist (die Geschichte ist erfunden und darf keiner realen Person zugeschrieben werden), Bilder mit sichtbaren Markenlogos oder eingeblendetem Text sowie Bilder, die mit dem Titel nichts zu tun haben. Hände, Rückenansichten und Silhouetten sind in Ordnung. Passt keines, antworte mit index -1.`,
    },
  ];
  vorschauen.forEach((bild, i) => {
    inhalt.push({ type: "text", text: `Bild ${i}:` });
    inhalt.push({ type: "image", source: { type: "base64", media_type: bild.typ, data: bild.daten } });
  });

  const client = new Anthropic();
  const antwort = await client.beta.messages.create({
    model: MODELL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["index", "grund"],
          properties: {
            index: { type: "integer", description: "Nummer des gewählten Bildes, oder -1" },
            grund: { type: "string", description: "Ein Satz zur Begründung" },
          },
        },
      },
    },
    messages: [{ role: "user", content: inhalt }],
  });
  if (antwort.stop_reason !== "end_turn") return { index: -1, grund: `Auswahl abgebrochen (${antwort.stop_reason})` };
  return JSON.parse(antwort.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

/**
 * Liefert { id, url, fotograf, typ, daten } oder null, wenn kein Schlüssel gesetzt ist
 * oder kein passendes Foto gefunden wurde. Ein Fehler hier verhindert den Beitrag nicht.
 */
export async function findeTitelfoto({ begriff, titel, benutzteIds }) {
  const schluessel = process.env.PEXELS_API_KEY;
  if (!schluessel) return null;
  try {
    const treffer = (await suche(begriff, schluessel)).filter((f) => !benutzteIds.has(f.id)).slice(0, KANDIDATEN);
    if (!treffer.length) {
      console.log(`Titelfoto: keine Treffer für „${begriff}“, Titelseite bleibt ohne Foto.`);
      return null;
    }
    const vorschauen = await Promise.all(treffer.map((f) => ladeBild(f.src.medium)));
    const { index, grund } = await waehle(vorschauen, titel);
    if (!Number.isInteger(index) || index < 0 || index >= treffer.length) {
      console.log(`Titelfoto: keines gewählt (${grund}), Titelseite bleibt ohne Foto.`);
      return null;
    }
    const foto = treffer[index];
    const bild = await ladeBild(foto.src.large2x);
    console.log(`Titelfoto: „${begriff}“ → ${foto.url} (${grund})`);
    return { id: foto.id, url: foto.url, fotograf: foto.photographer, ...bild };
  } catch (fehler) {
    console.log(`Titelfoto: übersprungen (${fehler.message}), Titelseite bleibt ohne Foto.`);
    return null;
  }
}
