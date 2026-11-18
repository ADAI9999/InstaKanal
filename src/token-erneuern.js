// Verlängert das Instagram-Token und schreibt das neue Token auf die Standardausgabe.
// Wird im Workflow direkt an `gh secret set` weitergereicht und erscheint in keinem Log.
import { erneuereToken } from "./instagram.js";

erneuereToken()
  .then((neu) => process.stdout.write(neu))
  .catch((fehler) => {
    console.error(`Fehler: ${fehler.message}`);
    process.exit(1);
  });
