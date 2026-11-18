import Anthropic from "@anthropic-ai/sdk";
import { konfig } from "./konfig.js";

const MODELL = "claude-opus-5-5";

export const TYPEN = ["geschichte", "saetze"];

const text = { type: "string" };
const gemeinsam = {
  thema: { ...text, description: "Thema in 2 bis 5 Wörtern, dient der Vermeidung von Wiederholungen" },
  caption: { ...text, description: "Bildunterschrift: 2 bis 3 kurze Absätze, zusammen 150 bis 400 Zeichen, ohne Hashtags und ohne Folge-Aufruf" },
  hashtags: { type: "array", items: text, description: "3 bis 5 Hashtags ohne #" },
  bildidee: { ...text, description: "Englische Beschreibung des Titelbilds in 2 bis 3 Sätzen. Das Bild muss im Feed in einer halben Sekunde auffallen und eine Frage aufwerfen: EIN klares Hauptmotiv, nah herangeholt (Gesicht und Oberkörper oder ein Gegenstand in einer Hand), ein starker, eindeutiger Gesichtsausdruck oder eine ungewöhnliche Situation, dazu das eine Detail aus der Geschichte, das neugierig macht. Nenne Alter, Aussehen, Kleidung, Ausdruck, Ort in Deutschland und eine dramatische Lichtquelle (Handylicht im Dunkeln, Straßenlaterne, Türspalt, Gegenlicht). Höchstens zwei Personen. Keine Namen, keine Schrift im Bild." },
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
      titel: { ...text, description: "Titelseite: Zahl, für wen und welcher Nutzen, 2 kurze Sätze, höchstens 130 Zeichen. Endet gern mit Doppelpunkt." },
      saetze: {
        type: "array",
        description: "7 bis 10 Punkte, einer pro Seite",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["satz", "hervorhebung", "erklaerung"],
          properties: {
            satz: { ...text, description: "höchstens 140 Zeichen" },
            hervorhebung: { ...text, description: "1 bis 3 aufeinanderfolgende Wörter, wörtlich aus dem Satz, die farbig betont werden" },
            erklaerung: { ...text, description: "Ein bis zwei kurze Sätze darunter: wann man das sagt oder tut und was es bewirkt, höchstens 150 Zeichen" },
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

Was die meistgeteilten Beiträge der großen Kanäle in diesem Feld gemeinsam haben (ausgewertet nach Likes und Weiterleitungen):
- Der erste Satz der Titelseite ist eine einzige, konkrete Tatsache, die sofort eine Frage aufwirft, höchstens zwölf Wörter: eine ungewöhnliche Abmachung, ein Gegenstand, eine Zahl, ein Satz, den jemand gesagt hat. Erst danach kommt die Lage. Ein Einstieg wie „Ich bin 36 und arbeite als …“ ist dafür zu schwach, weil er nichts verspricht.
- Es geht fast immer um Menschen, die man beschützen oder nicht verlieren will: das eigene Kind, die alten Eltern, den Partner, die beste Freundin, auch ein Tier. Beruf und Geld tragen nur, wenn ein solcher Mensch mit im Spiel ist.
- Die Geschichte bringt etwas mit, das man noch am selben Abend nachmachen kann: eine Abmachung, eine Frage, ein kleines Ritual, einen Satz. Dieses Werkzeug wird in der Geschichte benutzt und auf einer der letzten Seiten Schritt für Schritt erklärt („Such dir … Sag deinem Kind … Stell keine Fragen.“). Daran entscheidet sich, ob jemand den Beitrag speichert und dem Partner schickt.
- Genaue Angaben erzeugen Spannung und Glaubwürdigkeit: Uhrzeiten („Um 23:47 Uhr vibrierte mein Handy.“), Alter, Anzahl, was genau auf dem Tisch stand.
- Nach der ersten Wendung kommt ein zweiter Schlag: Das Werkzeug hilft jemandem, an den keiner gedacht hat, oder die Person, vor der man Angst hatte, reagiert anders als erwartet.
- Kurze Zeilen. Selten mehr als zwölf Wörter pro Satz, oft ein Satz pro Absatz.
- Eigene Einfälle: Die Abmachungen, Fragen und Rituale dieser Kanäle werden nicht nacherzählt. Jeder Beitrag braucht ein eigenes Werkzeug.

Woran solche Geschichten scheitern, und was stattdessen trägt:
- Zu kleine Fallhöhe. Ein Tippfehler in einem Angebot bewegt niemanden. Es muss um etwas gehen, das fast jeder kennt und das wehtut: übersehen werden, sich für die eigene Herkunft schämen, den Stolz der Eltern nie gehört haben, jemanden über der Arbeit verloren haben, mit vierzig von vorn anfangen.
- Vorhersehbarkeit. Wenn die Titelseite schon verrät, dass am Ende alles gut wird, wischt niemand weiter. Die Geschichte braucht eine Wendung, die man nicht kommen sieht: ein Detail, das erst spät seinen Sinn zeigt, ein Brief Jahre später, ein Satz von jemandem, von dem man ihn nicht erwartet hätte.
- Immer dieselbe Bauform. Die weise Vorgesetzte mit der klugen Regel ist nur eine von vielen. Andere: ein Fremder im Zug, ein Kind, das eine einfache Frage stellt, eine Putzkraft, die mehr mitbekommt als der Vorstand, ein Fund beim Ausräumen der elterlichen Wohnung, ein Satz, den man zufällig mithört, eine Geste, für die niemand Dank erwartet.
- Bürosprache. Wörter wie „Vorlage“, „Abrechnung“, „Prozess“ oder „Feedback“ machen die Geschichte kalt. Erzählt wird, wie man es einer Freundin am Küchentisch erzählen würde: kurze, gesprochene Sätze, auch einmal ein halber.
- Geschliffene Sprüche. Der Satz, der bleibt, klingt nicht nach Kalender, sondern nach einem Menschen, der ihn in diesem Moment wirklich sagt, gern unbeholfen, gern zu ehrlich („Ich bin 43. Ich weiß, dass alle ihr eigenes Leben haben.“ wäre so ein Ton).
- Mindestens eine Stelle soll wehtun, bevor es gut wird.
- Namen: Die meisten Figuren brauchen keinen („meine Chefin“, „der Neue“). Wo ein Vorname nötig ist, passt er zu Alter und Herkunft der Figur und wechselt von Beitrag zu Beitrag; „Jonas“ und „Katrin“ sind verbraucht.

Liste: eine nummerierte Sammlung zum Mitnehmen, ein Punkt pro Seite. Die erfolgreichsten Beiträge dieser Art versprechen auf der Titelseite eine Zahl, einen Menschen und einen Nutzen („Deine Tochter wird Menschen begegnen, die ihr Nein nicht hören wollen. Bring ihr diese 7 Sätze bei:“).
- Die Titelseite nennt, für wen die Liste ist und in welcher Lage sie hilft. Sie macht die Lage spürbar, bevor sie die Zahl nennt.
- Jeder Punkt ist ein Satz, den man wörtlich sagen, oder ein Schritt, den man heute tun kann. Darunter steht in ein bis zwei kurzen Sätzen, wann man ihn braucht und was er bewirkt.
- Die Punkte steigern sich: der stärkste steht am Ende, nicht am Anfang.
- Kein Punkt ist eine Binsenweisheit. Wer die Liste liest, soll bei mindestens zwei Punkten denken: Das hätte ich früher wissen sollen.

Die Bildunterschrift vertieft den Gedanken in zwei bis drei kurzen Absätzen und endet mit einem kleinen Anstoß für heute.

Die Haltung des Kanals: Erfolg entsteht aus kleinen, unbequemen Schritten, die jemand doch tut, obwohl Stolz, Angst oder Bequemlichkeit dagegen sprechen. Die letzte Seite jedes Beitrags ist ein fester Abspann mit dem Kanalnamen; sie wird nicht mitgeschrieben.

Grenzen, weil der Kanal mit seinem Namen dafür einsteht:
- Alles ist frei erfunden und selbst formuliert. Keine realen Personen, keine Prominenten, keine Marken- oder Firmennamen, keine Sprüche, die bereits als bekannte Zitate im Umlauf sind.
- Die Geschichte wird nicht als wahre Begebenheit ausgegeben („wahre Geschichte“, „ist mir wirklich passiert“ kommen nicht vor).
- Keine erfundenen Zahlen, Studien oder Statistiken. Keine Gesundheits-, Rechts- oder Anlageratschläge.
- Niemanden abwerten: keine Bösewichte, keine Häme, keine Pauschalurteile über Gruppen oder Lebensentwürfe. Auch die Figur, die sich falsch verhält, bleibt ein Mensch.
- Deutsche Rechtschreibung mit echten Umlauten und ß, Anführungszeichen „so“.`;
}

function auftrag(typ, bisherigeThemen, schwerpunkt, kritik) {
  const art = typ === "geschichte" ? "eine Geschichte" : "eine Liste";
  const nachbessern = kritik
    ? `\n\nEin strenges Lektorat hat den vorigen Entwurf zum Thema „${kritik.thema}“ abgelehnt. Schwächste Stelle: ${kritik.schwaechste_stelle}\nHinweise: ${kritik.hinweise}\nSchreibe einen neuen Entwurf, der diese Schwächen nicht hat. Ein anderes Thema ist erlaubt und oft die bessere Wahl.`
    : "";
  const feld = schwerpunkt ? `\n\nSchwerpunkt dieses Beitrags: ${schwerpunkt}.` : "";
  const liste = bisherigeThemen.length
    ? `\n\nDiese Themen gab es zuletzt schon. Wähle ein deutlich anderes Thema, andere Figuren und einen anderen Schauplatz:\n${bisherigeThemen.map((t) => `- ${t}`).join("\n")}`
    : "";
  return `Schreibe ${art}.${feld}${liste}${nachbessern}\n\nFülle alle Felder aus, auch Bildunterschrift, Hashtags und Bildidee: Sie werden ungeprüft übernommen.`;
}

/** Erzeugt den Text eines Beitrags über die Claude API. */
export async function erzeugeText(typ, bisherigeThemen, schwerpunkt, kritik) {
  // Das Schema erzwingt die Felder, aber nicht ihren Inhalt. Fällt die Prüfung durch, wird neu erzeugt.
  let letzter;
  for (let versuch = 1; versuch <= 3; versuch++) {
    try {
      return await erzeugeEinmal(typ, bisherigeThemen, schwerpunkt, kritik);
    } catch (fehler) {
      letzter = fehler;
      console.log(`Text: Versuch ${versuch} verworfen (${fehler.message.split("\n").join(" ")})`);
    }
  }
  throw letzter;
}

async function erzeugeEinmal(typ, bisherigeThemen, schwerpunkt, kritik) {
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
    messages: [{ role: "user", content: auftrag(typ, bisherigeThemen, schwerpunkt, kritik) }],
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
    max(inhalt.titel, 170, "Titel");
    anzahl(inhalt.saetze, "Liste");
    inhalt.saetze.forEach((s, i) => {
      max(s.satz, 180, `Punkt ${i + 1}`);
      max(s.erklaerung ?? "", 200, `Erklärung ${i + 1}`);
    });
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
    thema: "Sätze fürs Gehaltsgespräch",
    titel: "Du leistest seit Jahren mehr, als in deinem Vertrag steht. Diese 7 Sätze helfen dir, es endlich auszusprechen:",
    saetze: [
      { satz: "Ich möchte über meine Entwicklung sprechen, nicht nur über dieses Jahr.", hervorhebung: "meine Entwicklung", erklaerung: "Der Einstieg. Er zeigt, dass du bleiben willst, und nimmt dem Gespräch die Schärfe." },
      { satz: "Diese drei Dinge habe ich übernommen, die nicht in meiner Stelle stehen.", hervorhebung: "drei Dinge", erklaerung: "Zähl sie auf. Was niemand ausspricht, sieht auch niemand." },
      { satz: "Ich hätte gern eine Zahl von Ihnen, bevor ich meine nenne.", hervorhebung: "eine Zahl", erklaerung: "Wer zuerst nennt, verhandelt nach unten. Frag ruhig und warte." },
      { satz: "Das liegt unter dem, was ich mir vorgestellt habe.", hervorhebung: "unter dem", erklaerung: "Kein Vorwurf, keine Rechtfertigung. Danach still sein." },
      { satz: "Was müsste passieren, damit wir in sechs Monaten dort sind?", hervorhebung: "in sechs Monaten", erklaerung: "Macht aus einem Nein einen Plan mit Datum." },
      { satz: "Können wir das schriftlich festhalten?", hervorhebung: "schriftlich", erklaerung: "Freundlich gefragt, aber unverzichtbar. Zusagen ohne Papier verblassen." },
      { satz: "Ich brauche darauf heute keine Antwort. Aber ich brauche eine.", hervorhebung: "Aber ich brauche eine", erklaerung: "Der Satz, den die wenigsten sagen. Er entscheidet, ob etwas passiert." },
    ],
    abschluss: "Speicher dir die Liste für dein nächstes Gespräch. Und schick sie jemandem, der zu lange wartet.",
    caption:
      "Die meisten Gehaltsgespräche scheitern nicht an der Leistung, sondern an den Sätzen, die niemand geübt hat.\n\nSuch dir einen aus und sag ihn einmal laut, bevor du ihn brauchst.",
    hashtags: ["gehalt", "karriere", "erfolg", "selbstwert"],
    bildidee: "A woman in her mid thirties stands in a hallway by a half-open front door, looking back over her shoulder with a calm, determined expression. Soft evening light from the doorway.",
  },
};
