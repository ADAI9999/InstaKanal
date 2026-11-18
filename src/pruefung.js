// Kritisches Lektorat: Ein zweiter Claude-Lauf prüft jeden Entwurf, bevor ein Bild erzeugt
// und der Beitrag vorgelegt wird. Ebenso wird das Titelbild gegen die Titelseite geprüft.
import Anthropic from "@anthropic-ai/sdk";
import { konfig } from "./konfig.js";

const MODELL = "claude-opus-5-5";
export const MINDESTNOTE = 7;

const note = (beschreibung) => ({
  type: "object",
  additionalProperties: false,
  required: ["note", "begruendung"],
  properties: {
    note: { type: "integer", description: `1 (unbrauchbar) bis 10 (herausragend). ${beschreibung}` },
    begruendung: { type: "string", description: "Zwei bis drei Sätze mit Belegen aus dem Text" },
  },
});

const TEXT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["passt_zum_kanal", "spannungsbogen", "thema_interessant", "sprache", "schwaechste_stelle", "hinweise"],
  properties: {
    passt_zum_kanal: note("Passt der Beitrag zu Namen, Versprechen und Zielgruppe des Kanals?"),
    spannungsbogen: note("Zwingt die Titelseite zum Wischen, steigt die Spannung, gibt es eine Wendung und einen Schluss, der sitzt?"),
    thema_interessant: note("Würde ein fremder Mensch im Feed dafür anhalten und es jemandem schicken?"),
    sprache: note("Klingt es wie ein Mensch, der erzählt, oder wie ein Ratgeber?"),
    schwaechste_stelle: { type: "string", description: "Die eine Stelle, an der am ehesten jemand aufhört zu wischen, und warum" },
    hinweise: { type: "string", description: "Konkrete Anweisungen für eine bessere Fassung, drei bis fünf Sätze" },
  },
};

function alsText(typ, inhalt) {
  if (typ === "geschichte") {
    return [
      `TITELSEITE: ${inhalt.titel}`,
      `AUFHÄNGER: ${inhalt.aufhaenger}`,
      ...inhalt.seiten.map((s, i) => `SEITE ${i + 2}: ${s.absaetze.join(" / ")}`),
      `BILDUNTERSCHRIFT: ${inhalt.caption}`,
    ].join("\n");
  }
  return [
    `TITELSEITE: ${inhalt.titel}`,
    ...inhalt.saetze.map((s, i) => `SEITE ${i + 2}: ${s.satz}${s.erklaerung ? ` — ${s.erklaerung}` : ""}`),
    `SCHLUSS: ${inhalt.abschluss}`,
    `BILDUNTERSCHRIFT: ${inhalt.caption}`,
  ].join("\n");
}

async function frage(schema, inhalt, effort) {
  const client = new Anthropic();
  const antwort = await client.beta.messages.create({
    model: MODELL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: { type: "json_schema", schema } },
    messages: [{ role: "user", content: inhalt }],
  });
  if (antwort.stop_reason !== "end_turn") throw new Error(`Prüfung abgebrochen (${antwort.stop_reason})`);
  return JSON.parse(antwort.content.filter((b) => b.type === "text").map((b) => b.text).join(""));
}

/** Liefert das Urteil des Lektorats samt Entscheidung, ob der Entwurf besteht. */
export async function pruefeInhalt(typ, inhalt, schwerpunkt) {
  const auftrag = `Du bist Chefredakteurin eines großen deutschsprachigen Instagram-Kanals und entscheidest, ob ein Karussell-Entwurf erscheint. Du hast viele mittelmäßige Entwürfe gesehen und winkst nichts durch, nur weil es sauber geschrieben ist.

Der Kanal: @${konfig.handle} („${konfig.wasserzeichen ?? konfig.kanalname}“)
Versprechen: ${konfig.nische}
Zielgruppe: ${konfig.zielgruppe}
Schwerpunkt dieses Beitrags: ${schwerpunkt || "frei"}

Der Maßstab sind Kanäle mit mehreren hunderttausend Followern in diesem Feld. Ihre besten Beiträge haben eine Titelseite, die eine Lage mit Fallhöhe nennt und eine Lücke offen lässt; Figuren, die einander Dinge sagen, die sitzen; eine Wendung, die man nicht kommen sieht; mindestens eine Stelle, die wehtut; und am Ende etwas, das man selbst anwenden oder jemandem schicken will.

Typische Gründe für eine Ablehnung: Das Thema ist zu klein oder zu speziell, um Fremde zu interessieren. Der Ausgang steht nach der Titelseite fest. Die Mitte tritt auf der Stelle. Die Sprache klingt nach Büro oder Kalender. Der Beitrag könnte auf jedem beliebigen Kanal stehen und hat mit dem Versprechen dieses Kanals wenig zu tun.

Bewerte streng und nutze die ganze Skala: 7 heißt „kann so erscheinen“, 9 heißt „einer der besten des Monats“. Begründe jede Note mit Stellen aus dem Text.

Der Entwurf:

${alsText(typ, inhalt)}`;

  const urteil = await frage(TEXT_SCHEMA, auftrag, "high");
  const noten = [urteil.passt_zum_kanal, urteil.spannungsbogen, urteil.thema_interessant, urteil.sprache].map((n) => n.note);
  return { ...urteil, schnitt: noten.reduce((a, b) => a + b, 0) / noten.length, bestanden: noten.every((n) => n >= MINDESTNOTE) };
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

/** Prüft, ob das erzeugte Titelbild zur Titelseite passt und handwerklich in Ordnung ist. */
export async function pruefeBild(foto, titel, bildidee) {
  return frage(
    BILD_SCHEMA,
    [
      {
        type: "text",
        text: `Dieses Bild soll die Titelseite eines Instagram-Karussells tragen. Der Titeltext darunter lautet:\n\n„${titel}“\n\nBestellt war dieses Motiv: ${bildidee}\n\nDas Bild passt, wenn es die Hauptfigur und die Stimmung des Titels zeigt und wie ein echtes Foto wirkt. Es fällt durch, wenn es etwas anderes zeigt als bestellt, wenn Hände, Gesichter oder Gegenstände sichtbar verformt sind, wenn Schrift, Logos oder Wasserzeichen im Bild stehen, oder wenn es nach Werbefoto statt nach einem echten Moment aussieht.`,
      },
      { type: "image", source: { type: "base64", media_type: foto.typ, data: foto.daten } },
    ],
    "medium",
  );
}
