import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const POSTS_ORDNER = path.join(WURZEL, "posts");

export const konfig = JSON.parse(fs.readFileSync(path.join(WURZEL, "config.json"), "utf8"));

/** Alle bisherigen Posts, älteste zuerst. */
export function ladePosts() {
  if (!fs.existsSync(POSTS_ORDNER)) return [];
  return fs
    .readdirSync(POSTS_ORDNER)
    .filter((name) => fs.existsSync(path.join(POSTS_ORDNER, name, "post.json")))
    .sort()
    .map((name) => ({
      id: name,
      ordner: path.join(POSTS_ORDNER, name),
      ...JSON.parse(fs.readFileSync(path.join(POSTS_ORDNER, name, "post.json"), "utf8")),
    }));
}

export function speicherePost(ordner, post) {
  const { id, ordner: _weg, ...daten } = post;
  fs.mkdirSync(ordner, { recursive: true });
  fs.writeFileSync(path.join(ordner, "post.json"), JSON.stringify(daten, null, 2) + "\n");
}
