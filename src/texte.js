import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { konfig, WURZEL } from "./konfig.js";

const MODELL = "claude-opus-5-5";

/**
 * Die Beitragsformate. Sie stammen aus der Auswertung der meistgeteilten Beiträge großer Kanäle
 * und unterscheiden sich bewusst stark in Erzählform, Länge und Bildsprache.
 */
export const FORMATE = {
  geschichte: {
    name: "Ich-Geschichte",
    recherche: false,
    erfunden: true,
    bau: `Eine erfundene Erzählung in der Ich-Form, 7 bis 14 Seiten, so lang wie sie trägt und keine Seite länger.
- Der erste Satz ist eine einzige konkrete, merkwürdige Tatsache (eine Abmachung, ein Gegenstand, eine Zahl, etwas, das jemand jeden Tag tut), keine Selbstvorstellung.
- Menschen sagen einander Dinge, die sitzen. Genaue Angaben (Uhrzeit, Anzahl, was auf dem Tisch stand) machen es glaubhaft.
- Es gibt eine Wendung, die man nicht kommen sieht, und danach noch eine zweite, kleinere.
- Am Ende steht etwas, das man mitnimmt. Das kann ein Werkzeug zum Nachmachen sein, muss es aber nicht: Manche Geschichten wirken allein durch ihr letztes Bild.`,
  },
  gleichnis: {
    name: "Gleichnis",
    recherche: false,
    erfunden: true,
    bau: `Eine kurze Parabel in der dritten Person, 6 bis 9 Seiten: Tiere, ein Bauer, eine Handwerkerin, ein Fährmann, zwei Nachbarn. Keine Ich-Form, keine Gegenwart mit Handys und Büros.
- Die Titelseite schildert einen seltsamen, bildstarken Vorgang, bei dem man wissen will, wie er ausgeht.
- Die Handlung ist einfach und läuft auf eine unbequeme Einsicht zu, die man erst auf den letzten Seiten versteht.
- Dann wird das Prinzip beim Namen genannt und in zwei, drei Sätzen auf das Leben der Leserin oder des Lesers übertragen (Arbeit, Geld, Familie, Freundschaft).
- Dieses Format lebt von Bildern: bilder_auf_jeder_seite ist wahr, jede Erzählseite hat eine eigene Bildidee, die beiden Seiten mit dem Prinzip bleiben ohne Bild. Seiten sind kurz, höchstens 170 Zeichen.
- Eine gute Weisheit ist unbequem und genau. Sie sagt etwas, das man nicht schon tausendmal gelesen hat.`,
  },
  wissen: {
    name: "Überraschendes Wissen",
    recherche: true,
    erfunden: false,
    bau: `Ein Beitrag, der mit einem belegten, überraschenden Befund beginnt und zeigt, was er für den Alltag bedeutet, 6 bis 10 Seiten. Kein Ich, keine erfundene Rahmenhandlung.
- Die Titelseite nennt das Verblüffende zuerst, als Vorgang oder als Zahl, nicht als Behauptung.
- Dann Schritt für Schritt: was untersucht wurde, was herauskam, warum das so ist. Zahlen und Namen nur, wenn sie in den Recherche-Notizen stehen.
- Die letzten zwei Seiten sagen, was man damit anfängt: eine konkrete Folgerung für heute.
- Zwischenüberschriften in Großbuchstaben (zwei bis vier Wörter) gliedern die Seiten.`,
  },
  wahre_geschichte: {
    name: "Wahre Geschichte über eine Berühmtheit",
    recherche: true,
    erfunden: false,
    bau: `Eine wahre, gut belegte Begebenheit aus Geschichte, Wissenschaft, Sport oder Wirtschaft, erzählt in der dritten Person, 7 bis 12 Seiten. Am liebsten eine, die kaum jemand kennt, oder ein unbekanntes Kapitel aus einem bekannten Leben.
- Die Titelseite beginnt mit dem Moment, in dem alles verloren scheint oder etwas Unerhörtes geschieht.
- Erzählt wird in Szenen, nicht als Lebenslauf. Alles, was behauptet wird, steht in den Recherche-Notizen. Nichts hinzuerfinden, auch keine Zitate.
- Über lebende Personen nur, was unstrittig belegt und nicht ehrenrührig ist.
- Der Schluss zieht eine Folgerung, die über die Person hinaus gilt.
- Bilder: Lebende Personen werden nie abgebildet, nur Orte, Gegenstände, Hände oder Szenen. Lange verstorbene Persönlichkeiten dürfen als Zeichnung erscheinen. Bilder dort, wo sie etwas zeigen; reine Gedankenseiten bleiben ohne Bild (bildidee leer).
- Die Titelseite verrät die Pointe nicht.`,
  },
  liste: {
    name: "Liste",
    recherche: false,
    erfunden: false,
    bau: `Eine nummerierte Sammlung zum Mitnehmen, 6 bis 11 Seiten, ein Punkt pro Seite.
- Die Titelseite verspricht eine Zahl, einen Menschen und einen Nutzen, und macht vorher die Lage spürbar.
- Jede Seite hat als Überschrift den Punkt selbst (ein Satz, den man wörtlich sagen, oder ein Schritt, den man tun kann, mit Nummer) und darunter ein bis zwei Sätze: wann man ihn braucht, was er bewirkt.
- Kein Punkt ist eine Binsenweisheit. Die Punkte steigern sich, der stärkste steht am Ende.`,
  },
  anleitung: {
    name: "Anleitung",
    recherche: false,
    erfunden: false,
    bau: `Eine einzige Methode, Schritt für Schritt erklärt, 6 bis 11 Seiten: ein Spiel, eine Fragetechnik, eine Übung, ein Ablauf für ein schwieriges Gespräch.
- Die Titelseite fragt, ob man etwas herausfinden oder erreichen will, das sonst schwer zu bekommen ist, und kündigt die Methode an.
- Erst kurz, warum der direkte Weg nicht funktioniert. Dann die Schritte so genau, dass man sie ohne Rückfrage nachmachen kann. Dann, woran man erkennt, dass es wirkt, und was man daraus liest.
- Nüchtern und genau. Keine Rahmengeschichte, höchstens ein Beispielsatz in wörtlicher Rede.
- Keine Heilversprechen und keine Diagnosen: Die Methode ersetzt keinen Arzt und keinen Therapeuten und behauptet das auch nicht.`,
  },
  saetze: {
    name: "Sätze",
    recherche: false,
    erfunden: false,
    bau: `Eine Sammlung eigener Sätze zu einem Thema, 6 bis 10 Seiten, ein Satz pro Seite, sonst nichts.
- Die Titelseite macht neugierig auf die Sammlung, ohne einen der Sätze vorwegzunehmen.
- Jeder Satz ist eine Beobachtung, die man kennt, aber selten ausgesprochen hört. Kein Satz klingt nach Kalender oder Motivationstrainer.
- Die Sätze unterscheiden sich in Bau und Länge; einer darf nur drei Wörter haben.
- Das wichtigste Wort oder die wichtigste Wendung eines Satzes steht in **Fettschrift**.`,
  },
};

export const TYPEN = Object.keys(FORMATE);

/** Bildsprachen, damit nicht jedes Titelbild eine Person in Nahaufnahme zeigt. */
export const BILDSTILE = {
  nahaufnahme: "ein Mensch, nah herangeholt, mit einem eindeutigen Gesichtsausdruck",
  gegenstand: "ein einzelner Gegenstand aus dem Beitrag als Stillleben, groß im Bild, ohne Menschen",
  schwarzweiss: "eine kontrastreiche Schwarz-Weiß-Szene wie aus einem Kinofilm",
  illustration: "eine handgezeichnete Illustration in Tusche und Aquarell, wie aus einem Bilderbuch für Erwachsene",
  tier: "ein Tier als Hauptmotiv",
  ort: "ein Ort oder Raum ohne Menschen, dessen Stimmung alles sagt",
  sinnbild: "ein ungewöhnliches, leicht surreales Sinnbild, das eine Frage aufwirft (etwas, das so nicht zusammengehört)",
  haende: "Hände, die etwas halten oder tun, ohne Gesicht",
};

const text = { type: "string" };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["thema", "titel", "aufhaenger", "bildidee", "bilder_auf_jeder_seite", "seiten", "caption", "hashtags", "quellen"],
  properties: {
    thema: { ...text, description: "Thema in 2 bis 6 Wörtern, dient der Vermeidung von Wiederholungen" },
    titel: { ...text, description: "Text der Titelseite, höchstens 140 Zeichen" },
    aufhaenger: { ...text, description: "Kurze zweite Zeile, die zum Wischen zwingt, höchstens 70 Zeichen. Leer lassen, wenn der Titel schon mit einem Doppelpunkt oder einer offenen Frage endet." },
    bildidee: { ...text, description: "Englische Beschreibung des Titelbilds in 2 bis 3 Sätzen, passend zum vorgegebenen Bildstil. Ein klares Hauptmotiv, eine dramatische Lichtquelle, ein Detail, das neugierig macht. Keine Schrift im Bild." },
    bilder_auf_jeder_seite: { type: "boolean", description: "Ob jede Seite ein eigenes Bild bekommt" },
    seiten: {
      type: "array",
      description: "Die Seiten nach der Titelseite",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["ueberschrift", "absaetze", "bildidee"],
        properties: {
          ueberschrift: { ...text, description: "Optionale Überschrift der Seite, höchstens 90 Zeichen. Leer, wenn die Seite keine braucht." },
          absaetze: { type: "array", items: text, description: "0 bis 3 kurze Absätze, zusammen höchstens 260 Zeichen. **fett** und *kursiv* sind erlaubt." },
          bildidee: { ...text, description: "Nur wenn bilder_auf_jeder_seite wahr ist: englische Beschreibung des Seitenbilds in einem Satz, im selben Bildstil wie das Titelbild, ohne wiederkehrende Gesichter. Sonst leer." },
        },
      },
    },
    caption: { ...text, description: "Bildunterschrift: 2 bis 3 kurze Absätze, zusammen 150 bis 400 Zeichen, ohne Hashtags und ohne Folge-Aufruf" },
    hashtags: { type: "array", items: text, description: "3 bis 5 Hashtags ohne #" },
    quellen: { type: "array", items: text, description: "Bei recherchierten Formaten die Adressen der verwendeten Quellen aus den Notizen, sonst leer" },
  },
};

/** Die von Hand geschriebenen und vom Inhaber freigegebenen Beiträge dienen als Maßstab für das Niveau. */
export function vorbilder() {
  const ordner = path.join(WURZEL, "entwuerfe");
  if (!fs.existsSync(ordner)) return [];
  return fs
    .readdirSync(ordner)
    .filter((d) => d.endsWith(".json"))
    .map((d) => JSON.parse(fs.readFileSync(path.join(ordner, d), "utf8")))
    .map((e) =>
      [
        `TITELSEITE: ${e.titel}${e.aufhaenger ? ` | ${e.aufhaenger}` : ""}`,
        ...e.seiten.map((s, i) => `SEITE ${i + 2}: ${[s.ueberschrift, ...(s.absaetze ?? [])].filter(Boolean).join(" / ")}`),
      ].join("\n"),
    );
}

function systemPrompt() {
  return `Du schreibst Karussell-Beiträge für einen deutschsprachigen Instagram-Kanal. Die Leserin oder der Leser wischt Seite für Seite weiter.

Kanal: @${konfig.handle} („${konfig.wasserzeichen ?? konfig.kanalname}“)
Versprechen: ${konfig.nische}
Zielgruppe: ${konfig.zielgruppe}
Tonfall: ${konfig.tonfall}

Der Kanal veröffentlicht vier Beiträge am Tag. Wer ihm folgt, sieht sie hintereinander. Deshalb ist der größte Fehler nicht ein schwacher Beitrag, sondern einer, der klingt wie der davor. Jeder Beitrag bekommt ein Format, ein Themenfeld und einen Bildstil vorgegeben; halte dich daran, auch wenn dir eine andere Form leichter fiele.

Ein Beitrag ist gelungen, wenn er vier Dinge leistet:
- Er überrascht. Die Titelseite zeigt etwas, das man so nicht erwartet hat, und das Ende ist nicht schon auf Seite zwei absehbar.
- Er überzeugt. Jede Seite ergibt für sich und im Zusammenhang Sinn. Handlungen sind nachvollziehbar, Zahlen passen zueinander, niemand tut etwas, das kein Mensch tun würde, nur damit die Pointe aufgeht.
- Er informiert oder gibt etwas mit: einen Befund, eine Einsicht, einen Satz, ein Werkzeug. Nach dem Lesen weiß oder kann man etwas, das man vorher nicht wusste oder konnte.
- Er ist so lang, wie sein Stoff trägt. Sechs starke Seiten sind besser als vierzehn, von denen fünf Anlauf nehmen.

Handwerk:
- Kurze Zeilen, gesprochene Sprache, selten mehr als zwölf Wörter pro Satz. Keine Bürowörter („Prozess“, „Feedback“, „Herausforderung“), keine Ratgeberfloskeln.
- Hervorhebungen sparsam: ein Schlüsselwort oder Schlüsselsatz in **doppelten Sternchen** (fett), ein nachklingender Satz in *einfachen Sternchen* (kursiv), höchstens eine pro Seite.
- Die Bildunterschrift wiederholt den Beitrag nicht, sondern setzt einen eigenen Gedanken dazu und endet mit einem kleinen Anstoß oder einer Frage.
- Die letzte Seite jedes Beitrags ist ein fester Abspann mit dem Kanalnamen; sie wird nicht mitgeschrieben.

${vorbilder().length ? `So sieht das gewünschte Niveau aus. Diese Beiträge hat der Inhaber freigegeben. Übernimm nicht ihre Stoffe, sondern ihre Sorgfalt: ein überraschender, belegter Kern, eine Titelseite, die die Pointe nicht verrät, kurze Seiten, eine Schlussfolgerung, die genau aus dem Erzählten folgt, Vorsicht bei allem, was nicht sicher belegt ist („laut Zeitzeugen“).\n\n${vorbilder().map((v, i) => `BEISPIEL ${i + 1}\n${v}`).join("\n\n")}\n\n` : ""}Verbrauchte Muster, die in diesem Kanal nicht mehr vorkommen:
- Einstiege wie „Ich bin 41, Pflegerin …“ oder „Ich war 36 und …“ (Alter plus Beruf als erster Satz).
- Die weise Chefin, der weise Vater oder das weise Kind, die mit einer Regel oder einem Zettel alles lösen.
- Zettel im Glas, das Klopfen an eine Tür, das späte Geständnis am Küchentisch, „Dann sagte sie etwas, das ich bis heute nicht vergessen habe“.
- Vornamen wie Jonas, Katrin, Ida, Clara, Julia. Die meisten Figuren brauchen keinen Namen.
- Schlüsse, die predigen („Vielleicht stehst du gerade selbst …“). Wenn am Ende eine Anrede steht, dann als Handlung in einem Satz.

Grenzen, weil der Kanal mit seinem Namen dafür einsteht:
- Erfundenes wird nicht als wahre Begebenheit ausgegeben. Recherchierte Formate behaupten nur, was in den mitgelieferten Notizen steht; nichts wird ergänzt, auch keine wörtlichen Zitate.
- Keine Einfälle anderer Kanäle nacherzählen und keine Sprüche verwenden, die als bekannte Zitate im Umlauf sind.
- Keine Gesundheits-, Rechts- oder Anlageratschläge, keine Heilversprechen, keine Diagnosen.
- Niemanden abwerten: keine Häme, keine Pauschalurteile über Gruppen oder Lebensentwürfe.
- Deutsche Rechtschreibung mit echten Umlauten und ß, Anführungszeichen „so“.`;
}

function auftrag({ format, themenfeld, bildstil, bisherige, notizen, kritik }) {
  const f = FORMATE[format];
  const teile = [
    `Schreibe einen Beitrag im Format „${f.name}“.`,
    `So ist dieses Format gebaut:\n${f.bau}`,
    `Themenfeld: ${themenfeld}`,
    `Bildstil für diesen Beitrag: ${bildstil} – ${BILDSTILE[bildstil]}. Die Bildidee muss in diesem Stil sein.`,
  ];
  if (format !== "gleichnis") {
    teile.push(
      "Ein Bild auf jeder Seite (bilder_auf_jeder_seite) lohnt sich nur, wenn die Seiten kurz sind und der Beitrag von wechselnden Motiven lebt. Weil jedes Bild einzeln erzeugt wird, zeigen Seitenbilder nie dasselbe Gesicht zweimal.",
    );
  }
  if (notizen) {
    teile.push(`Recherche-Notizen (einzige erlaubte Quelle für Tatsachen, Zahlen und Namen):\n${notizen}`);
  }
  if (bisherige.length) {
    teile.push(
      `Diese Beiträge gab es zuletzt. Dein Beitrag muss sich in Thema, Schauplatz, Figuren, Einstieg und Pointe deutlich von jedem unterscheiden:\n${bisherige.map((t) => `- ${t}`).join("\n")}`,
    );
  }
  if (kritik) {
    teile.push(
      `Ein strenges Lektorat hat den vorigen Entwurf („${kritik.thema}“) abgelehnt.\nSchwächste Stelle: ${kritik.schwaechste_stelle}\nHinweise: ${kritik.hinweise}\nSchreibe einen neuen Entwurf ohne diese Schwächen. Ein anderer Stoff im selben Format und Themenfeld ist erlaubt und oft die bessere Wahl${notizen ? ", solange er sich aus den Notizen belegen lässt" : ""}.`,
    );
  }
  teile.push("Fülle alle Felder aus, auch Bildunterschrift, Hashtags und Bildidee: Sie werden ungeprüft übernommen.");
  return teile.join("\n\n");
}

async function anfrage(parameter) {
  const client = new Anthropic();
  return client.beta.messages.create({
    model: MODELL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...parameter,
  });
}

const nurText = (antwort) => antwort.content.filter((b) => b.type === "text").map((b) => b.text).join("");

/**
 * Sucht im Netz einen belegten Stoff für die recherchierten Formate und liefert Notizen mit Quellen.
 * Die Websuche läuft auf Anthropics Servern; ein langer Lauf kann pausieren und wird dann fortgesetzt.
 */
export async function recherchiere({ format, themenfeld, bisherige }) {
  const gesucht =
    format === "wissen"
      ? "einen überraschenden, gut belegten Befund aus Psychologie, Verhaltensforschung, Hirnforschung, Schlafforschung, Ökonomie oder einem Nachbarfach, der für den Alltag etwas bedeutet und den die meisten Menschen nicht kennen"
      : "eine wahre, gut belegte und wirklich überraschende Begebenheit aus dem Leben einer berühmten Person (Musik, Wissenschaft, Erfindung, Sport, Film, Wirtschaft, Literatur, Politik der Vergangenheit): ein Moment, den kaum jemand kennt und der etwas über Erfolg, Scheitern, Mut oder Menschlichkeit erzählt. Möglichst über eine verstorbene Person oder ein lange zurückliegendes Ereignis";
  const frage = `Finde für einen Instagram-Beitrag ${gesucht}.

Themenfeld: ${themenfeld}

Meide abgegriffene Stoffe (Marshmallow-Test, 10.000-Stunden-Regel, Edison und die Glühbirne, Colonel Sanders, Steve Jobs, J. K. Rowling, die Titanic) und alles, was diesen früheren Beiträgen ähnelt:
${bisherige.length ? bisherige.map((t) => `- ${t}`).join("\n") : "- (noch keine)"}

Suche gezielt, prüfe den Stoff an mindestens zwei voneinander unabhängigen, seriösen Quellen (Fachartikel, Universitäten, Lexika, Qualitätspresse) und verwirf ihn, wenn er sich als Legende oder als umstritten herausstellt.

Antworte mit Notizen in dieser Form:
STOFF: ein Satz
TATSACHEN: nummerierte Liste aller belegten Einzelheiten mit Namen, Jahr, Ort, Zahlen. Nur was in den Quellen steht.
UNSICHER: was die Quellen offenlassen oder unterschiedlich darstellen
QUELLEN: die vollständigen Adressen`;

  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }];
  const messages = [{ role: "user", content: frage }];
  let antwort = await anfrage({ tools, messages, output_config: { effort: "medium" } });
  for (let fortsetzung = 0; antwort.stop_reason === "pause_turn" && fortsetzung < 4; fortsetzung++) {
    messages.push({ role: "assistant", content: antwort.content });
    antwort = await anfrage({ tools, messages, output_config: { effort: "medium" } });
  }
  if (antwort.stop_reason !== "end_turn") throw new Error(`Recherche abgebrochen (${antwort.stop_reason})`);
  const notizen = nurText(antwort).trim();
  if (!/QUELLEN/.test(notizen) || !/https?:\/\//.test(notizen)) throw new Error("Recherche ohne Quellen");
  return notizen;
}

/** Erzeugt den Text eines Beitrags. Fällt die Prüfung der Felder durch, wird neu erzeugt. */
export async function erzeugeText(vorgabe) {
  let letzter;
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      const antwort = await anfrage({
        output_config: { effort: "xhigh", format: { type: "json_schema", schema: SCHEMA } },
        system: systemPrompt(),
        messages: [{ role: "user", content: auftrag(vorgabe) }],
      });
      if (antwort.stop_reason === "refusal") throw new Error("Die Anfrage wurde vom Modell abgelehnt.");
      if (antwort.stop_reason === "max_tokens") throw new Error("Die Antwort wurde abgeschnitten.");
      return pruefe(vorgabe.format, JSON.parse(nurText(antwort)));
    } catch (fehler) {
      letzter = fehler;
      console.log(`Text: Versuch ${versuch} verworfen (${fehler.message.split("\n").join(" ")})`);
    }
  }
  throw letzter;
}

const ohneSterne = (s) => s.replace(/\*/g, "");

/** Prüft Längen und Mengen, die das Schema nicht erzwingen kann. */
export function pruefe(format, inhalt) {
  const fehler = [];
  const max = (wert, grenze, name) => {
    if ((wert ?? "").length > grenze) fehler.push(`${name} ist zu lang (${wert.length} > ${grenze} Zeichen)`);
  };
  const min = (wert, grenze, name) => {
    if ((wert ?? "").trim().length < grenze) fehler.push(`${name} fehlt oder ist zu kurz`);
  };
  min(inhalt.thema, 3, "Thema");
  min(inhalt.titel, 20, "Titel");
  max(inhalt.titel, 180, "Titel");
  max(inhalt.aufhaenger, 100, "Aufhänger");
  min(inhalt.caption, 80, "Bildunterschrift");
  max(inhalt.caption, 1200, "Bildunterschrift");
  min(inhalt.bildidee, 60, "Bildidee");
  if ((inhalt.hashtags ?? []).filter((h) => h.trim()).length < 3) fehler.push("Hashtags fehlen");
  // Instagram erlaubt 20 Bilder pro Karussell; Titel- und Schlussseite kommen dazu.
  if (inhalt.seiten.length < 4 || inhalt.seiten.length > 18) {
    fehler.push(`${inhalt.seiten.length} Seiten (erlaubt: 4 bis 18)`);
  }
  inhalt.seiten.forEach((s, i) => {
    const laenge = ohneSterne([s.ueberschrift ?? "", ...(s.absaetze ?? [])].join(" ")).trim().length;
    if (laenge < 3) fehler.push(`Seite ${i + 2} ist leer`);
    if (laenge > 360) fehler.push(`Seite ${i + 2} ist zu lang (${laenge} > 360 Zeichen)`);
  });
  if (FORMATE[format].recherche && !(inhalt.quellen ?? []).some((q) => /^https?:\/\//.test(q))) {
    fehler.push("Quellen fehlen");
  }
  if (fehler.length) throw new Error(`Der erzeugte Text passt nicht:\n- ${fehler.join("\n- ")}`);

  inhalt.hashtags = inhalt.hashtags
    .map((h) => h.replace(/^#/, "").replace(/\s+/g, ""))
    .filter(Boolean)
    .slice(0, 6);
  inhalt.quellen = (inhalt.quellen ?? []).filter((q) => /^https?:\/\//.test(q)).slice(0, 5);
  return inhalt;
}

const s = (ueberschrift, ...absaetze) => ({ ueberschrift, absaetze, bildidee: "" });

/** Feste Beispieltexte, um das Design ohne API-Schlüssel zu prüfen. */
export const BEISPIELE = {
  gleichnis: {
    thema: "Der Fährmann und die zwei Ruder",
    titel: "Ein Fährmann hatte auf sein eines Ruder „Glauben“ geschrieben und auf das andere „Arbeit“.",
    aufhaenger: "Ein Reisender lachte ihn dafür aus.",
    bildidee: "A weathered wooden rowing boat on a misty river at dawn, two oars resting across it, one with a word carved into the blade. Black and white, cinematic, low sun through the fog.",
    bilder_auf_jeder_seite: false,
    seiten: [
      s("", "„Wozu der Aberglaube?“, fragte der Reisende.", "Der Fährmann sagte nichts. Er zog das Ruder „Arbeit“ ein und ruderte nur mit „Glauben“."),
      s("", "Das Boot drehte sich im Kreis.", "Mitten auf dem Fluss, eine Runde nach der anderen."),
      s("", "Dann wechselte er. Nur „Arbeit“.", "Wieder drehte sich das Boot. Diesmal andersherum."),
      s("", "Erst als er beide Ruder eintauchte, fuhr es geradeaus.", "*Der Reisende lachte nicht mehr.*"),
      s("DAS PRINZIP", "Wer nur hofft, dreht sich im Kreis.", "Wer nur schuftet und an nichts mehr glaubt, dreht sich auch. Nur in die andere Richtung."),
      s("", "**Frag dich heute, welches Ruder du gerade nicht im Wasser hast.**"),
    ],
    caption:
      "Die meisten von uns haben ein Lieblingsruder. Die einen planen und hoffen, die anderen arbeiten, bis sie nicht mehr wissen, wofür.\n\nWelches ist deins?",
    hashtags: ["gleichnis", "erfolg", "ausdauer", "nachdenken"],
    quellen: [],
  },
  liste: {
    thema: "Sätze fürs Gehaltsgespräch",
    titel: "Du leistest seit Jahren mehr, als in deinem Vertrag steht. Diese 6 Sätze helfen dir, es endlich auszusprechen:",
    aufhaenger: "",
    bildidee: "A single empty office chair facing a large desk, seen from behind, late evening light through blinds casting long stripes. No people.",
    bilder_auf_jeder_seite: false,
    seiten: [
      s("1. „Ich möchte über meine Entwicklung sprechen, nicht nur über dieses Jahr.“", "Der Einstieg. Er zeigt, dass du bleiben willst, und nimmt dem Gespräch die Schärfe."),
      s("2. „Diese drei Dinge habe ich übernommen, die nicht in meiner Stelle stehen.“", "Zähl sie auf. Was niemand ausspricht, sieht auch niemand."),
      s("3. „Ich hätte gern eine Zahl von Ihnen, bevor ich meine nenne.“", "Wer zuerst nennt, verhandelt nach unten. Frag ruhig und warte."),
      s("4. „Das liegt unter dem, was ich mir vorgestellt habe.“", "Kein Vorwurf, keine Rechtfertigung. Danach still sein."),
      s("5. „Was müsste passieren, damit wir in sechs Monaten dort sind?“", "Macht aus einem Nein einen Plan mit Datum."),
      s("6. „Ich brauche darauf heute keine Antwort. Aber ich brauche eine.“", "Der Satz, den die wenigsten sagen. **Er entscheidet, ob etwas passiert.**"),
    ],
    caption:
      "Die meisten Gehaltsgespräche scheitern nicht an der Leistung, sondern an den Sätzen, die niemand geübt hat.\n\nSuch dir einen aus und sag ihn einmal laut, bevor du ihn brauchst.",
    hashtags: ["gehalt", "karriere", "erfolg", "selbstwert"],
    quellen: [],
  },
};
