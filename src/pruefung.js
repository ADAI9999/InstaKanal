// Kritisches Lektorat: Ein zweiter Claude-Lauf prüft jeden Entwurf, bevor Bilder erzeugt
// und der Beitrag vorgelegt wird. Ebenso wird das Titelbild gegen die Titelseite geprüft.
import Anthropic from "@anthropic-ai/sdk";
import { konfig } from "./konfig.js";
import { FORMATE, BILDSTILE, vorbilder } from "./texte.js";

const MODELL = "claude-opus-5-5";
export const MINDESTNOTE = 7;

export const KRITERIEN = {
  titelseite: ["Titelseite", "Wirft die Titelseite sofort eine konkrete Frage auf, die man beantwortet haben will? Würde ein Fremder im Feed dafür anhalten?"],
  ueberraschung: ["Überraschung", "Enthält der Beitrag etwas, das man nicht erwartet hat: eine Wendung, einen Befund, einen Blickwinkel? Oder ahnt man nach der zweiten Seite alles?"],
  stimmigkeit: ["Stimmigkeit", "Ergibt jede Seite für sich und im Zusammenhang Sinn? Sind Handlungen nachvollziehbar, Zahlen und Zeitangaben widerspruchsfrei, ist die Folgerung durch das Erzählte gedeckt? Bei recherchierten Formaten: Steht jede Behauptung in den Notizen?"],
  gehalt: ["Gehalt", "Weiß oder kann man nach dem Lesen etwas, das man vorher nicht wusste oder konnte? Ist es mehr als eine Binsenweisheit?"],
  abwechslung: ["Abwechslung", "Unterscheidet sich der Beitrag in Stoff, Einstieg, Figuren und Pointe deutlich von den zuletzt erschienenen? 10 = völlig eigen, 4 = klingt wie einer von ihnen."],
  sprache: ["Sprache", "Klingt es wie ein Mensch, der erzählt oder erklärt, oder wie ein Ratgeber? Kurze Zeilen, keine Floskeln, keine Predigt am Schluss?"],
};

const note = (beschreibung) => ({
  type: "object",
  additionalProperties: false,
  required: ["note", "begruendung"],
  properties: {
    note: { type: "integer", description: `1 (unbrauchbar) bis 10 (herausragend). ${beschreibung}` },
    begruendung: { type: "string", description: "Ein bis zwei Sätze mit Belegen aus dem Text" },
  },
});

const TEXT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...Object.keys(KRITERIEN), "schwaechste_stelle", "hinweise"],
  properties: {
    ...Object.fromEntries(Object.entries(KRITERIEN).map(([k, [, frage]]) => [k, note(frage)])),
    schwaechste_stelle: { type: "string", description: "Die eine Stelle, an der am ehesten jemand aufhört zu wischen oder den Kopf schüttelt, und warum" },
    hinweise: { type: "string", description: "Konkrete Anweisungen für eine bessere Fassung, drei bis fünf Sätze" },
  },
};

export function alsText(inhalt) {
  return [
    `TITELSEITE: ${inhalt.titel}${inhalt.aufhaenger ? ` | ${inhalt.aufhaenger}` : ""}`,
    ...inhalt.seiten.map((s, i) => `SEITE ${i + 2}: ${[s.ueberschrift, ...(s.absaetze ?? [])].filter(Boolean).join(" / ")}`),
    `BILDUNTERSCHRIFT: ${inhalt.caption}`,
  ].join("\n");
}

async function frage(schema, inhalt, effort) {
  const client = new Anthropic();
  const antwort = await client.beta.messages
    .stream({
      model: MODELL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort, format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: inhalt }],
    })
    .finalMessage();
  if (antwort.stop_reason !== "end_turn") throw new Error(`Prüfung abgebrochen (${antwort.stop_reason})`);
  return JSON.parse(antwort.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

/** Liefert das Urteil des Lektorats samt Entscheidung, ob der Entwurf besteht. */
export async function pruefeInhalt(inhalt, { format, themenfeld, bisherige, notizen }) {
  const auftrag = `Du bist Chefredakteurin eines großen deutschsprachigen Instagram-Kanals und entscheidest, ob ein Karussell-Entwurf erscheint. Du hast viele mittelmäßige Entwürfe gesehen und winkst nichts durch, nur weil es sauber geschrieben ist. Dein Verleger hat sich zuletzt beschwert: zu ähnliche Beiträge, zu vorhersehbar, manches ergab beim zweiten Lesen keinen Sinn.

Der Kanal: @${konfig.handle} („${konfig.wasserzeichen ?? konfig.kanalname}“)
Versprechen: ${konfig.nische}
Zielgruppe: ${konfig.zielgruppe}
Format dieses Beitrags: ${FORMATE[format].name}
Themenfeld: ${themenfeld}

Der Maßstab sind die meistgeteilten Beiträge von Kanälen mit mehreren hunderttausend Followern. Sie überraschen, sie halten einer Nachfrage stand, und man nimmt etwas mit.

Lies den Entwurf zweimal: einmal wie ein Fremder, der durch den Feed wischt, und einmal wie jemand, der Fehler sucht. Prüfe beim zweiten Mal jede Seite: Würde ein Mensch das wirklich so tun oder sagen? Passen die Zahlen und Zeiten zusammen? Folgt die Schlussfolgerung aus dem, was erzählt wurde, oder wird sie nur behauptet? Versteht man jede Seite, ohne zu rätseln?

Bewerte streng und nutze die ganze Skala: 7 heißt „kann so erscheinen“, 9 heißt „einer der besten des Monats“.

Maßstab für „Überraschung“ ist ein durchschnittlicher Mensch, der durch Instagram wischt, nicht eine Expertin. Eine bekannte Person mit einer wenig bekannten Wendung ist überraschend; eine Geschichte, die man aus jedem Ratgeber kennt, ist es nicht.

${vorbilder().length ? `Zur Eichung: Diese Beiträge hat der Inhaber freigegeben, sie liegen bei 7 bis 8 in jedem Kriterium.\n\n${vorbilder().map((v, i) => `EICHBEISPIEL ${i + 1}\n${v}`).join("\n\n")}\n\n` : ""}

${bisherige.length ? `Zuletzt erschienen (für die Note „Abwechslung“):\n${bisherige.map((t) => `- ${t}`).join("\n")}\n\n` : ""}${notizen ? `Recherche-Notizen (nur was hier steht, darf als Tatsache behauptet werden):\n${notizen}\n\n` : ""}Der Entwurf:

${alsText(inhalt)}`;

  const urteil = await frage(TEXT_SCHEMA, auftrag, "high");
  const noten = Object.keys(KRITERIEN).map((k) => urteil[k].note);
  const schnitt = noten.reduce((a, b) => a + b, 0) / noten.length;
  // Fakten und Logik sind Pflicht; sonst zählt der Gesamteindruck, ohne echten Ausreißer nach unten.
  const bestanden = urteil.stimmigkeit.note >= MINDESTNOTE && schnitt >= MINDESTNOTE && noten.every((n) => n >= MINDESTNOTE - 1);
  return { ...urteil, schnitt, bestanden };
}

const BILD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["passt", "grund"],
  properties: {
    passt: { type: "boolean" },
    grund: { type: "string", description: "Ein Satz" },
  },
};

/** Prüft, ob das erzeugte Titelbild zur Titelseite passt, auffällt und handwerklich in Ordnung ist. */
export async function pruefeBild(foto, titel, bildidee, bildstil) {
  return frage(
    BILD_SCHEMA,
    [
      {
        type: "text",
        text: `Dieses Bild soll die Titelseite eines Instagram-Karussells tragen. Der Titeltext darunter lautet:\n\n„${titel}“\n\nBestellt war dieses Motiv: ${bildidee}\nBestellter Bildstil: ${BILDSTILE[bildstil] ?? bildstil}\n\nDas Bild passt, wenn es zum Titel gehört, im bestellten Stil ist und im Feed auffällt: ein klares Hauptmotiv, das auch in Daumennagelgröße lesbar ist und neugierig macht. Es fällt durch, wenn es etwas anderes zeigt als bestellt, wenn es beliebig oder unauffällig ist (kleine Figuren in einer weiten Szene, flaches Licht), wenn Hände, Gesichter oder Gegenstände sichtbar verformt sind, oder wenn Schrift, Logos oder Wasserzeichen im Bild stehen.`,
      },
      { type: "image", source: { type: "base64", media_type: foto.typ, data: foto.daten } },
    ],
    "medium",
  );
}
