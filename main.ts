// Mothlight's hand-in program. Copies the playable game and its screenshots
// from this repository into the output directory, then writes the dossier
// with the kit's own library so the bytes match the scorer's rebuild.

import { cpSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-game.ts";

const repoRoot = dirname(fileURLToPath(import.meta.url));
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

// Self-check, the same rebuild the scorer performs: the dossier on disk must
// be byte for byte what the library writes again from the copied tree.
// (buildDossier returns the dossier as a Uint8Array of canonical JSON bytes.)
const rebuilt = buildDossier(outputDir, caps);
if (!Buffer.from(rebuilt).equals(Buffer.from(dossier))) {
  throw new Error("mothlight: dossier rebuild mismatch — refusing to hand in");
}

const gameFiles = readdirSync(join(outputDir, "game"), { recursive: true }).length;
const shotFiles = readdirSync(join(outputDir, "screenshots")).length;
console.log(
  `mothlight: dossier written (${dossier.byteLength} bytes, verified) to ${outputDir} ` +
  `with ${gameFiles} game files and ${shotFiles} screenshots`,
);
