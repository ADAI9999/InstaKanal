import Anthropic from "@anthropic-ai/sdk";
import { konfig } from "./konfig.js";

const MODELL = "claude-opus-5-5";

export const TYPEN = ["geschichte", "saetze"];

const text = { type: "string" };
const gemeinsam = {
  thema: { ...text, description: "Thema in 2 bis 5 Wörtern, dient der Vermeidung von Wiederholungen" },
  caption: { ...text, description: "Bildunterschrift: 2 bis 3 kurze Absätze, zusammen 150 bis 400 Zeichen, ohne Hashtags und ohne Folge-Aufruf" },
  hashtags: { type: "array", items: text, description: "3 bis 5 Hashtags ohne #" },
};

const SCHEMATA = {
  geschichte: {
    type: "object",
    additionalProperties: false,
    required: ["thema", "titel", "seiten", "moral", "caption", "hashtags"],
    properties: {
      thema: gemeinsam.thema,
      titel: { ...text, description: "Titelseite: Einstieg mitten in der Szene, 2 bis 3 kurze Sätze, höchstens 120 Zeichen. Verrät das Ende nicht." },
      seiten: {
        type: "array",
        description: "10 bis 13 Seiten, die die Geschichte erzählen",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["absaetze"],
          properties: {
            absaetze: { type: "array", items: text, description: "1 bis 3 kurze Absätze, zusammen höchstens 190 Zeichen" },
          },
        },
      },
      moral: { ...text, description: "Schlusssatz der letzten Seite, höchstens 110 Zeichen" },
      caption: gemeinsam.caption,
      hashtags: gemeinsam.hashtags,
    },
  },
  saetze: {
    type: "object",
    additionalProperties: false,
    required: ["thema", "titel", "saetze", "abschluss", "caption", "hashtags"],
    properties: {
      thema: gemeinsam.thema,
      titel: { ...text, description: "Titelseite: macht neugierig auf die Sammlung, höchstens 80 Zeichen" },
      saetze: {
        type: "array",
        description: "9 bis 12 Sätze, einer pro Seite",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["satz", "hervorhebung"],
          properties: {
            satz: { ...text, description: "höchstens 140 Zeichen" },
            hervorhebung: { ...text, description: "1 bis 3 aufeinanderfolgende Wörter, wörtlich aus dem Satz, die farbig betont werden" },
          },
        },
      },
      abschluss: { ...text, description: "Schlusssatz der letzten Seite, höchstens 110 Zeichen" },
      caption: gemeinsam.caption,
      hashtags: gemeinsam.hashtags,
    },
  },
};

function systemPrompt() {
  return `Du schreibst die Beiträge für einen deutschsprachigen Instagram-Kanal. Jeder Beitrag ist ein Karussell: Die Leserin oder der Leser wischt Seite für Seite weiter.

Kanal: @${konfig.handle}
Themenfeld: ${konfig.nische}
Zielgruppe: ${konfig.zielgruppe}
Tonfall: ${konfig.tonfall}

Die Beiträge erscheinen ohne weitere Redaktion. Ein Beitrag ist gelungen, wenn jemand bis zur letzten Seite wischt und ihn danach einem bestimmten Menschen schickt.

Es gibt zwei Arten von Beiträgen.

Geschichte: eine kurze, erfundene Erzählung aus dem Alltag, in der Ich-Form oder über eine namenlose Person („eine Frau“, „mein Vater“).
- Die Titelseite beginnt mitten in der Szene und lässt eine Frage offen.
- Jede Seite trägt einen kleinen Schritt: eine Beobachtung, ein Detail, ein Satz, der gesagt oder nicht gesagt wird. Wenige Worte, kurze Sätze, viel Weißraum.
- Konkrete Details machen die Geschichte glaubhaft: der Gruppenchat, der kalte Kaffee, die Jacke am Haken.
- Es gibt einen Wendepunkt, an dem jemand etwas erkennt oder anders handelt. Die Geschichte endet leise, ohne Abrechnung und ohne Triumph.
- Der Schlusssatz zieht die Einsicht heraus, die über die Geschichte hinaus gilt.

Sätze: eine Sammlung eigener, pointierter Sätze zu einem gemeinsamen Thema, einer pro Seite.
- Jeder Satz steht für sich und trifft eine Beobachtung, die man kennt, aber selten ausgesprochen hört.
- Die Sätze unterscheiden sich in Bau und Länge, damit die Sammlung nicht leiert.

Die Bildunterschrift vertieft den Gedanken in zwei bis drei kurzen Absätzen und endet mit einem kleinen Anstoß für heute.

Grenzen, weil der Kanal mit seinem Namen dafür einsteht:
- Alles ist frei erfunden und selbst formuliert. Keine realen Personen, keine Prominenten, keine Marken- oder Firmennamen, keine Sprüche, die bereits als bekannte Zitate im Umlauf sind.
- Die Geschichte wird nicht als wahre Begebenheit ausgegeben („wahre Geschichte“, „ist mir wirklich passiert“ kommen nicht vor).
- Keine erfundenen Zahlen, Studien oder Statistiken. Keine Gesundheits-, Rechts- oder Anlageratschläge.
- Niemanden abwerten: keine Bösewichte, keine Häme, keine Pauschalurteile über Gruppen oder Lebensentwürfe. Auch die Figur, die sich falsch verhält, bleibt ein Mensch.
- Deutsche Rechtschreibung mit echten Umlauten und ß, Anführungszeichen „so“.`;
}

function auftrag(typ, bisherigeThemen) {
  const art = typ === "geschichte" ? "eine Geschichte" : "eine Sammlung von Sätzen";
  const liste = bisherigeThemen.length
    ? `\n\nDiese Themen gab es zuletzt schon. Wähle ein deutlich anderes Thema, andere Figuren und einen anderen Schauplatz:\n${bisherigeThemen.map((t) => `- ${t}`).join("\n")}`
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
  // Instagram erlaubt 20 Bilder pro Karussell; Titel- und Schlussseite kommen dazu.
  const anzahl = (liste, name) => {
    if (liste.length < 6 || liste.length > 18) fehler.push(`${name}: ${liste.length} Seiten (erlaubt: 6 bis 18)`);
  };

  if (typ === "geschichte") {
    max(inhalt.titel, 150, "Titel");
    anzahl(inhalt.seiten, "Geschichte");
    inhalt.seiten.forEach((s, i) => max(s.absaetze.join(" "), 260, `Seite ${i + 2}`));
    max(inhalt.moral, 150, "Schlusssatz");
  } else {
    max(inhalt.titel, 110, "Titel");
    anzahl(inhalt.saetze, "Sammlung");
    inhalt.saetze.forEach((s, i) => max(s.satz, 180, `Satz ${i + 1}`));
    max(inhalt.abschluss, 150, "Schlusssatz");
  }
  max(inhalt.caption, 1200, "Bildunterschrift");
  if (fehler.length) throw new Error(`Der erzeugte Text passt nicht:\n- ${fehler.join("\n- ")}`);

  inhalt.hashtags = inhalt.hashtags
    .map((h) => h.replace(/^#/, "").replace(/\s+/g, ""))
    .filter(Boolean)
    .slice(0, 6);
  return inhalt;
}

/** Feste Beispieltexte, um das Design ohne API-Schlüssel zu prüfen. */
export const BEISPIELE = {
  geschichte: {
    thema: "Vater ruft sonntags an",
    titel: "Mein Vater rief jeden Sonntag um zehn an. Ich ließ es meistens klingeln.",
    seiten: [
      { absaetze: ["Nicht aus Bosheit.", "Sonntag um zehn lag ich noch im Bett oder stand unter der Dusche oder hatte einfach keine Lust zu reden."] },
      { absaetze: ["Er hinterließ nie eine Nachricht.", "Nur der verpasste Anruf. Jede Woche derselbe Eintrag."] },
      { absaetze: ["Wenn ich zurückrief, fragte er, ob ich genug esse.", "Dann erzählte er vom Wetter und vom Nachbarn, der schon wieder die Hecke schneidet."] },
      { absaetze: ["Ich sagte „Ja, Papa“ und „Mhm“ und sah dabei auf mein Handy."] },
      { absaetze: ["Im Herbst half ich ihm, den Keller auszuräumen.", "An der Wand neben dem Telefon hing ein Zettel."] },
      { absaetze: ["Darauf standen in seiner Handschrift Stichworte.", "„Neue Wohnung fragen. Prüfung im Mai? Nicht vom Wetter anfangen.“"] },
      { absaetze: ["Er hatte sich Notizen gemacht.", "Für ein Gespräch mit seinem eigenen Kind."] },
      { absaetze: ["Ich stand lange vor diesem Zettel.", "Er rief aus dem Nebenraum, ob alles in Ordnung sei."] },
      { absaetze: ["„Ja, Papa“, sagte ich.", "Diesmal sah ich ihn dabei an."] },
      { absaetze: ["Am nächsten Sonntag rief ich um fünf vor zehn an.", "Er nahm nach dem ersten Klingeln ab."] },
      { absaetze: ["„Ist was passiert?“, fragte er.", "„Nein“, sagte ich. „Ich wollte nur zuerst anrufen.“"] },
    ],
    moral: "Manche Menschen bereiten sich auf dich vor. Merk es, solange sie es noch tun.",
    caption:
      "Zuneigung sieht nicht immer nach Zuneigung aus. Manchmal sieht sie aus wie ein Anruf zur falschen Zeit oder eine Frage, die man schon hundertmal gehört hat.\n\nWer ruft dich regelmäßig an, ohne dass du je zuerst anrufst? Dreh es diese Woche einmal um.",
    hashtags: ["familie", "geschichten", "dankbarkeit", "nachdenken"],
  },
  saetze: {
    thema: "Grenzen setzen",
    titel: "Sätze, die ich gern zehn Jahre früher gehört hätte",
    saetze: [
      { satz: "Wer dich nur mag, solange du Ja sagst, mag dein Ja.", hervorhebung: "mag dein Ja" },
      { satz: "Du musst nicht jede Einladung annehmen, nur weil du Zeit hättest.", hervorhebung: "Zeit hättest" },
      { satz: "Eine Erklärung ist ein Geschenk, keine Schuld.", hervorhebung: "keine Schuld" },
      { satz: "Müdigkeit ist ein Grund. Du brauchst keinen besseren.", hervorhebung: "ein Grund" },
      { satz: "Menschen, die deine Grenze verstehen, fragen nicht dreimal nach.", hervorhebung: "nicht dreimal" },
      { satz: "Ruhe zu brauchen ist kein Urteil über die anderen.", hervorhebung: "kein Urteil" },
      { satz: "Du darfst jemanden gernhaben und trotzdem früher gehen.", hervorhebung: "früher gehen" },
      { satz: "Ein Nein, das du freundlich sagst, bleibt ein Nein.", hervorhebung: "bleibt ein Nein" },
      { satz: "Wer sich an deiner Grenze stößt, stand vorher schon zu nah.", hervorhebung: "zu nah" },
    ],
    abschluss: "Welcher Satz war heute für dich? Schick ihn jemandem, der ihn braucht.",
    caption:
      "Grenzen setzt man selten in großen Gesprächen. Meist sind es kleine Sätze an einem gewöhnlichen Dienstag.\n\nSuch dir einen Satz aus und probier ihn diese Woche einmal aus.",
    hashtags: ["grenzen", "selbstachtung", "nachdenken", "beziehungen"],
  },
};
