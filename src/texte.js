import Anthropic from "@anthropic-ai/sdk";
import { konfig } from "./konfig.js";

const MODELL = "claude-opus-5-5";

const text = { type: "string" };
const SCHEMATA = {
  zitat: {
    type: "object",
    additionalProperties: false,
    required: ["thema", "zitat", "hervorhebung", "caption", "hashtags"],
    properties: {
      thema: { ...text, description: "Thema in 2 bis 5 Wörtern, dient der Vermeidung von Wiederholungen" },
      zitat: { ...text, description: "Der Satz fürs Bild, höchstens 130 Zeichen, ohne Anführungszeichen" },
      hervorhebung: { ...text, description: "1 bis 3 aufeinanderfolgende Wörter, wörtlich aus dem Zitat, die farbig betont werden" },
      caption: { ...text, description: "Bildunterschrift, 300 bis 700 Zeichen, ohne Hashtags" },
      hashtags: { type: "array", items: text, description: "8 bis 12 Hashtags ohne #" },
    },
  },
  karussell: {
    type: "object",
    additionalProperties: false,
    required: ["thema", "titel", "untertitel", "slides", "abschluss", "caption", "hashtags"],
    properties: {
      thema: { ...text, description: "Thema in 2 bis 5 Wörtern, dient der Vermeidung von Wiederholungen" },
      titel: { ...text, description: "Titel der ersten Seite, höchstens 60 Zeichen, macht neugierig" },
      untertitel: { ...text, description: "Eine Zeile unter dem Titel, höchstens 70 Zeichen" },
      slides: {
        type: "array",
        description: "4 bis 6 Inhaltsseiten",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["ueberschrift", "text"],
          properties: {
            ueberschrift: { ...text, description: "höchstens 40 Zeichen" },
            text: { ...text, description: "1 bis 3 Sätze, höchstens 200 Zeichen, konkret und umsetzbar" },
          },
        },
      },
      abschluss: { ...text, description: "Schlusssatz der letzten Seite, höchstens 90 Zeichen" },
      caption: { ...text, description: "Bildunterschrift, 300 bis 700 Zeichen, ohne Hashtags" },
      hashtags: { type: "array", items: text, description: "8 bis 12 Hashtags ohne #" },
    },
  },
};

function systemPrompt() {
  return `Du schreibst die Beiträge für einen deutschsprachigen Instagram-Kanal.

Kanal: @${konfig.handle}
Nische: ${konfig.nische}
Zielgruppe: ${konfig.zielgruppe}
Tonfall: ${konfig.tonfall}

Die Beiträge erscheinen ohne weitere Redaktion. Sie sollen so gut sein, dass jemand sie speichert oder weiterschickt: ein klarer Gedanke, der im Alltag etwas verändert, statt einer Kalenderweisheit.

Was einen guten Beitrag ausmacht:
- Ein einziger, scharf formulierter Gedanke. Lieber eine unbequeme Beobachtung als ein allgemeiner Mutmacher.
- Konkrete Bilder und Situationen aus dem echten Leben (der Wecker, das Handy auf dem Schreibtisch, das aufgeschobene Gespräch).
- Bei Karussells: Jede Seite steht für sich und enthält etwas, das man heute tun kann.
- Die Bildunterschrift vertieft den Gedanken, wiederholt ihn nicht, und endet mit einer Frage oder einer kleinen Aufgabe an die Leserin oder den Leser.

Grenzen, weil der Kanal mit seinem Namen dafür einsteht:
- Alle Texte sind eigene Formulierungen. Keine Zitate realer Personen, keine Sprüche, die bereits als bekannte Zitate im Umlauf sind, keine Namensnennungen.
- Keine erfundenen Zahlen, Studien oder Statistiken.
- Keine Versprechen von Reichtum oder schnellem Erfolg, keine konkreten Anlage-, Gesundheits- oder Rechtsratschläge.
- Niemanden abwerten: keine Verachtung für Angestellte, Menschen mit wenig Geld oder andere Lebensentwürfe.
- Deutsche Rechtschreibung mit echten Umlauten und ß.`;
}

function auftrag(typ, bisherigeThemen) {
  const art =
    typ === "zitat"
      ? "ein Zitat-Bild: ein einzelner, starker Satz"
      : "ein Karussell: Titelseite, 4 bis 6 Inhaltsseiten, Abschlussseite";
  const liste = bisherigeThemen.length
    ? `\n\nDiese Themen gab es zuletzt schon. Wähle ein deutlich anderes Thema und einen anderen Blickwinkel:\n${bisherigeThemen.map((t) => `- ${t}`).join("\n")}`
    : "";
  return `Schreibe ${art}.${liste}`;
}

/** Erzeugt den Text eines Beitrags über die Claude API. */
export async function erzeugeText(typ, bisherigeThemen) {
  const client = new Anthropic();
  const antwort = await client.beta.messages.create({
    model: MODELL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCHEMATA[typ] },
    },
    system: systemPrompt(),
    messages: [{ role: "user", content: auftrag(typ, bisherigeThemen) }],
  });

  if (antwort.stop_reason === "refusal") {
    throw new Error("Die Anfrage wurde vom Modell abgelehnt. Bitte später erneut versuchen.");
  }
  if (antwort.stop_reason === "max_tokens") {
    throw new Error("Die Antwort wurde abgeschnitten (max_tokens erreicht).");
  }
  const roh = antwort.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return pruefe(typ, JSON.parse(roh));
}

/** Prüft Längen und Mengen, die das Schema nicht erzwingen kann. */
export function pruefe(typ, inhalt) {
  const fehler = [];
  const max = (wert, grenze, name) => {
    if (wert.length > grenze) fehler.push(`${name} ist zu lang (${wert.length} > ${grenze} Zeichen)`);
  };
  if (typ === "zitat") {
    max(inhalt.zitat, 160, "Zitat");
  } else {
    max(inhalt.titel, 80, "Titel");
    if (inhalt.slides.length < 3 || inhalt.slides.length > 8) {
      fehler.push(`Karussell hat ${inhalt.slides.length} Inhaltsseiten (erlaubt: 3 bis 8)`);
    }
    inhalt.slides.forEach((s, i) => max(s.text, 260, `Text auf Seite ${i + 2}`));
  }
  max(inhalt.caption, 1800, "Bildunterschrift");
  if (fehler.length) throw new Error(`Der erzeugte Text passt nicht:\n- ${fehler.join("\n- ")}`);

  inhalt.hashtags = inhalt.hashtags
    .map((h) => h.replace(/^#/, "").replace(/\s+/g, ""))
    .filter(Boolean)
    .slice(0, 15);
  return inhalt;
}

/** Feste Beispieltexte, um das Design ohne API-Schlüssel zu prüfen. */
export const BEISPIELE = {
  zitat: {
    thema: "Aufschieben",
    zitat: "Du wartest nicht auf den richtigen Moment. Du wartest darauf, dass es sich leicht anfühlt.",
    hervorhebung: "leicht anfühlt",
    caption:
      "Der richtige Moment ist selten das Problem. Meist fehlt nur das gute Gefühl vor dem ersten Schritt, und das kommt erst danach.\n\nWelche Aufgabe schiebst du gerade vor dir her? Nimm dir heute zehn Minuten dafür. Nur zehn.",
    hashtags: ["mindset", "disziplin", "gewohnheiten", "fokus", "persönlichkeitsentwicklung", "motivation", "selbstverantwortung", "produktivität"],
  },
  karussell: {
    thema: "Fokus am Morgen",
    titel: "5 Dinge, die deinen Fokus vor 9 Uhr zerstören",
    untertitel: "Und was du stattdessen tun kannst",
    slides: [
      { ueberschrift: "Das Handy als Wecker", text: "Wer mit dem Handy aufwacht, liest Nachrichten, bevor er einen eigenen Gedanken hatte. Ein Wecker für zehn Euro löst das." },
      { ueberschrift: "Kein Plan für den Tag", text: "Ohne Plan entscheidet dein Posteingang, woran du arbeitest. Schreib am Abend vorher die eine Aufgabe auf, die morgen zählt." },
      { ueberschrift: "Zuerst die leichten Aufgaben", text: "Kleine Erledigungen fühlen sich produktiv an und kosten deine beste Stunde. Fang mit dem Schwersten an." },
      { ueberschrift: "Offene Benachrichtigungen", text: "Jede Unterbrechung kostet mehr als die Sekunden, die sie dauert. Stell das Handy für die erste Arbeitsstunde auf lautlos." },
      { ueberschrift: "Zu wenig Schlaf", text: "Fokus beginnt am Vorabend. Eine feste Zeit zum Schlafengehen bringt mehr als jede Morgenroutine." },
    ],
    abschluss: "Such dir einen Punkt aus und setz ihn morgen um.",
    caption:
      "Fokus ist selten eine Frage der Willenskraft. Meist ist es eine Frage der Umgebung: was auf dem Nachttisch liegt, was auf dem Bildschirm aufpoppt, was auf dem Zettel für morgen steht.\n\nWelcher der fünf Punkte trifft bei dir am meisten zu?",
    hashtags: ["fokus", "produktivität", "morgenroutine", "gewohnheiten", "mindset", "disziplin", "zeitmanagement", "persönlichkeitsentwicklung"],
  },
};
