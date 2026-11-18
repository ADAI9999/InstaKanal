import Anthropic from "@anthropic-ai/sdk";
import { konfig } from "./konfig.js";

const MODELL = "claude-opus-5-5";

export const TYPEN = ["geschichte", "saetze"];

const text = { type: "string" };
const gemeinsam = {
  thema: { ...text, description: "Thema in 2 bis 5 Wörtern, dient der Vermeidung von Wiederholungen" },
  caption: { ...text, description: "Bildunterschrift: 2 bis 3 kurze Absätze, zusammen 150 bis 400 Zeichen, ohne Hashtags und ohne Folge-Aufruf" },
  hashtags: { type: "array", items: text, description: "3 bis 5 Hashtags ohne #" },
  bildidee: { ...text, description: "Englische Beschreibung des Titelbilds in 2 bis 3 Sätzen: die Hauptfigur des Beitrags im entscheidenden Moment, mit Alter, Aussehen, Kleidung, Gesichtsausdruck, Ort und Licht. Ein Mensch, dem man die Gefühlslage ansieht, in einer alltäglichen Umgebung in Mitteleuropa. Keine Namen, keine Schrift im Bild." },
};

const SCHEMATA = {
  geschichte: {
    type: "object",
    additionalProperties: false,
    required: ["thema", "titel", "aufhaenger", "seiten", "caption", "hashtags", "bildidee"],
    properties: {
      thema: gemeinsam.thema,
      titel: { ...text, description: "Titelseite: Wer erzählt und in welcher Lage, 2 bis 3 kurze Sätze, höchstens 130 Zeichen. Verrät das Ende nicht." },
      aufhaenger: { ...text, description: "Kurze Zeile unter dem Titel, die zum Wischen zwingt, höchstens 70 Zeichen" },
      seiten: {
        type: "array",
        description: "8 bis 13 Seiten: erst die Geschichte, dann ein bis zwei Seiten, die die Leserin oder den Leser direkt ansprechen",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["absaetze"],
          properties: {
            absaetze: { type: "array", items: text, description: "2 bis 3 kurze Absätze, zusammen höchstens 260 Zeichen. **fett** und *kursiv* sind erlaubt." },
          },
        },
      },
      caption: gemeinsam.caption,
      hashtags: gemeinsam.hashtags,
      bildidee: gemeinsam.bildidee,
    },
  },
  saetze: {
    type: "object",
    additionalProperties: false,
    required: ["thema", "titel", "saetze", "abschluss", "caption", "hashtags", "bildidee"],
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
      bildidee: gemeinsam.bildidee,
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

Geschichte: eine kurze, erfundene Erzählung aus dem Alltag in der Ich-Form. So sind Geschichten gebaut, die auf Instagram bis zur letzten Seite gelesen und weitergeschickt werden:
- Titelseite: Die Erzählerin oder der Erzähler stellt sich in einem Halbsatz vor (Alter, Rolle, Lage) und nennt die Situation, in der etwas wehtut, peinlich ist oder auf dem Spiel steht.
- Aufhänger: eine kurze Zeile unter dem Titel, die eine Lücke öffnet. Sie kündigt einen Satz, eine Frage oder eine Wendung an, ohne sie zu verraten („Dann stellte sie mir eine einzige Frage:“).
- Es steht etwas auf dem Spiel: ein Mensch, eine Stelle, das eigene Gesicht, eine Chance. Wer erzählt, ist nicht nur Beobachter, sondern hat selbst etwas falsch gemacht, versäumt oder zu entscheiden.
- Jede Seite ist eine kleine Szene aus zwei bis drei kurzen Absätzen. Die Geschichte lebt von wörtlicher Rede: Menschen sagen einander Dinge, die sitzen.
- Mindestens einmal fällt ein Satz, den man sich merkt. Er wird angekündigt, bevor er kommt („Dann sagte er etwas, das ich bis heute nicht vergessen habe:“).
- Etwas zum Mitnehmen: Die Figur, die mehr weiß (eine Chefin, ein Vater, eine alte Kollegin, ein Trainer), gibt keinen Kalenderspruch, sondern eine Frage, eine Regel oder einen ersten Schritt, den man morgen selbst anwenden kann.
- Auflösung mit Nachhall: Ein Zeitsprung („Drei Wochen später“) oder der Rückgriff auf ein Detail vom Anfang zeigt, was sich verändert hat.
- Die letzten ein bis zwei Seiten verlassen die Geschichte und sprechen die Leserin oder den Leser direkt an: was daraus folgt, in klaren Sätzen. Der wichtigste Satz steht in **Fettschrift**.
- Hervorhebungen: ein Schlüsselwort oder der Schlüsselsatz in **doppelten Sternchen** (fett), ein nachklingender Satz in *einfachen Sternchen* (kursiv). Sparsam, höchstens eine Hervorhebung pro Seite.
- Konkrete Details machen die Geschichte glaubhaft: der Gruppenchat, der kalte Kaffee, die Jacke am Haken. Kein Triumph und keine Abrechnung am Ende.

Sätze: eine Sammlung eigener, pointierter Sätze zu einem gemeinsamen Thema, einer pro Seite.
- Jeder Satz steht für sich und trifft eine Beobachtung, die man kennt, aber selten ausgesprochen hört.
- Die Sätze unterscheiden sich in Bau und Länge, damit die Sammlung nicht leiert.

Die Bildunterschrift vertieft den Gedanken in zwei bis drei kurzen Absätzen und endet mit einem kleinen Anstoß für heute.

Die Haltung des Kanals: Erfolg entsteht aus kleinen, unbequemen Schritten, die jemand doch tut, obwohl Stolz, Angst oder Bequemlichkeit dagegen sprechen. Die letzte Seite jedes Beitrags ist ein fester Abspann mit dem Kanalnamen; sie wird nicht mitgeschrieben.

Grenzen, weil der Kanal mit seinem Namen dafür einsteht:
- Alles ist frei erfunden und selbst formuliert. Keine realen Personen, keine Prominenten, keine Marken- oder Firmennamen, keine Sprüche, die bereits als bekannte Zitate im Umlauf sind.
- Die Geschichte wird nicht als wahre Begebenheit ausgegeben („wahre Geschichte“, „ist mir wirklich passiert“ kommen nicht vor).
- Keine erfundenen Zahlen, Studien oder Statistiken. Keine Gesundheits-, Rechts- oder Anlageratschläge.
- Niemanden abwerten: keine Bösewichte, keine Häme, keine Pauschalurteile über Gruppen oder Lebensentwürfe. Auch die Figur, die sich falsch verhält, bleibt ein Mensch.
- Deutsche Rechtschreibung mit echten Umlauten und ß, Anführungszeichen „so“.`;
}

function auftrag(typ, bisherigeThemen, schwerpunkt) {
  const art = typ === "geschichte" ? "eine Geschichte" : "eine Sammlung von Sätzen";
  const feld = schwerpunkt ? `\n\nSchwerpunkt dieses Beitrags: ${schwerpunkt}.` : "";
  const liste = bisherigeThemen.length
    ? `\n\nDiese Themen gab es zuletzt schon. Wähle ein deutlich anderes Thema, andere Figuren und einen anderen Schauplatz:\n${bisherigeThemen.map((t) => `- ${t}`).join("\n")}`
    : "";
  return `Schreibe ${art}.${feld}${liste}\n\nFülle alle Felder aus, auch Bildunterschrift, Hashtags und Bildidee: Sie werden ungeprüft übernommen.`;
}

/** Erzeugt den Text eines Beitrags über die Claude API. */
export async function erzeugeText(typ, bisherigeThemen, schwerpunkt) {
  // Das Schema erzwingt die Felder, aber nicht ihren Inhalt. Fällt die Prüfung durch, wird neu erzeugt.
  let letzter;
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      return await erzeugeEinmal(typ, bisherigeThemen, schwerpunkt);
    } catch (fehler) {
      letzter = fehler;
      console.log(`Text: Versuch ${versuch} verworfen (${fehler.message.split("\n").join(" ")})`);
    }
  }
  throw letzter;
}

async function erzeugeEinmal(typ, bisherigeThemen, schwerpunkt) {
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
    messages: [{ role: "user", content: auftrag(typ, bisherigeThemen, schwerpunkt) }],
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
  const min = (wert, grenze, name) => {
    if ((wert ?? "").trim().length < grenze) fehler.push(`${name} fehlt oder ist zu kurz`);
  };
  min(inhalt.thema, 3, "Thema");
  min(inhalt.titel, 20, "Titel");
  min(inhalt.caption, 80, "Bildunterschrift");
  min(inhalt.bildidee, 60, "Bildidee");
  if ((inhalt.hashtags ?? []).filter((h) => h.trim()).length < 3) fehler.push("Hashtags fehlen");
  // Instagram erlaubt 20 Bilder pro Karussell; Titel- und Schlussseite kommen dazu.
  const anzahl = (liste, name) => {
    if (liste.length < 6 || liste.length > 18) fehler.push(`${name}: ${liste.length} Seiten (erlaubt: 6 bis 18)`);
  };

  if (typ === "geschichte") {
    max(inhalt.titel, 170, "Titel");
    max(inhalt.aufhaenger, 100, "Aufhänger");
    anzahl(inhalt.seiten, "Geschichte");
    inhalt.seiten.forEach((s, i) => max(s.absaetze.join(" ").replace(/\*/g, ""), 340, `Seite ${i + 2}`));
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
    thema: "Fehler vor dem Chef zugeben",
    titel: "Ich bin 29 und habe unseren größten Kunden fast verloren. Durch eine Mail, die ich nie hätte schicken dürfen.",
    aufhaenger: "Mein Chef stellte mir danach nur eine Frage:",
    seiten: [
      { absaetze: ["Es war ein Dienstag, kurz nach fünf.", "Ich hatte das falsche Angebot angehängt. Mit den Preisen eines anderen Kunden."] },
      { absaetze: ["Zwanzig Minuten später rief der Einkäufer an.", "„Interessant, was Sie anderen berechnen“, sagte er. Dann legte er auf."] },
      { absaetze: ["Ich saß vor dem Bildschirm und überlegte, wie ich es erklären könnte.", "Technischer Fehler. Falsche Vorlage. Irgendetwas, das nicht nach mir klang."] },
      { absaetze: ["Stattdessen ging ich zu meinem Chef.", "Ich sagte: „Ich habe einen Fehler gemacht. Einen großen.“"] },
      { absaetze: ["Er hörte zu, ohne mich zu unterbrechen.", "Dann stellte er die Frage, die ich seitdem jedem stelle, der zu mir kommt:"] },
      { absaetze: ["„**Was ist der nächste Anruf?**“", "Nicht: Wie konnte das passieren. Nicht: Wer ist schuld."] },
      { absaetze: ["Wir riefen den Einkäufer gemeinsam an.", "Ich sagte ihm, was passiert war. Ohne Ausrede, in drei Sätzen."] },
      { absaetze: ["Es war lange still in der Leitung.", "„Das hat mir noch nie jemand so direkt gesagt“, meinte er schließlich."] },
      { absaetze: ["Drei Monate später verlängerte er den Vertrag.", "*In der Mail stand: „Weil ich weiß, dass Sie anrufen, wenn etwas schiefgeht.“*"] },
      { absaetze: ["Die meisten Fehler kosten weniger, als wir fürchten.", "Teuer wird die Zeit, in der wir überlegen, wie wir sie verstecken."] },
      { absaetze: ["Wenn dir das nächste Mal etwas passiert, frag dich nicht, wie du dastehst.", "**Frag dich, was der nächste Anruf ist.**"] },
    ],
    caption:
      "Ein Fehler wird selten durch den Fehler selbst groß, sondern durch die Stunden danach.\n\nWer zuerst anruft, behält das Heft in der Hand. Wer wartet, überlässt es dem Zufall.\n\nWelchen Anruf schiebst du gerade vor dir her?",
    hashtags: ["erfolg", "karriere", "verantwortung", "fehlerkultur"],
    bildidee: "A man in his late twenties in a light blue shirt sits alone at an office desk in the early evening, staring at his laptop with a worried, tense expression, one hand on his forehead. Warm desk lamp light, dark office in the background.",
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
    bildidee: "A woman in her mid thirties stands in a hallway by a half-open front door, looking back over her shoulder with a calm, determined expression. Soft evening light from the doorway.",
  },
};
