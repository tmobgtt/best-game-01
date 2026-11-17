// Aetherkeep — Tower Defense of the Last Crystal: the hand-in program.
//
// It copies the playable game and its screenshots into the output
// directory and writes dossier.json with the kit's buildDossier, then
// rebuilds the dossier from the copied tree and refuses to hand in if
// the bytes differ — the same rebuild the scorer performs, so a dossier
// that leaves here is a dossier that matches.

import { cpSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = fileURLToPath(new URL(".", import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

for (const name of ["game", "screenshots"]) {
  const target = join(outputDir, name);
  rmSync(target, { recursive: true, force: true });
  cpSync(join(repoRoot, name), target, { recursive: true });
}

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
};

const dossier = buildDossier(outputDir, caps);
writeFileSync(join(outputDir, "dossier.json"), dossier);

const rebuilt = buildDossier(outputDir, caps);
if (!Buffer.from(rebuilt).equals(Buffer.from(dossier))) {
  throw new Error("aetherkeep: dossier rebuild mismatch — refusing to hand in");
}

const gameFiles = readdirSync(join(outputDir, "game"), { recursive: true }).length;
const shotFiles = readdirSync(join(outputDir, "screenshots")).length;
console.log(
  `aetherkeep: dossier written (${dossier.byteLength} bytes, verified) to ${outputDir} ` +
  `with ${gameFiles} game files and ${shotFiles} screenshots`,
);
