// One-off icon generator: rasterizes scripts/icon-source.svg into the PNG
// sizes referenced by public/manifest.webmanifest and index.html.
// Run manually after changing icon-source.svg: `node scripts/generate-icons.mjs`
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(path.join(__dirname, "icon-source.svg"));
const outDir = path.join(__dirname, "..", "public", "icons");

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "maskable-icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, file));
  console.log(`wrote ${file} (${size}x${size})`);
}
