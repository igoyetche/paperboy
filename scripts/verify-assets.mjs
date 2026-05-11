/**
 * verify-assets.mjs — Postbuild asset presence guard.
 *
 * Asserts that the required bundled assets were copied into dist/ after
 * `npm run build`. Exits with code 1 and a descriptive message if any
 * asset is missing or empty, so CI fails fast instead of deploying a
 * container that crashes at first thumbnail render.
 *
 * Implements OQ-5 (PB-026): postbuild validation of bundled assets.
 *
 * Wired into package.json as part of the `postbuild` script.
 */

import { existsSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const distAssets = join(projectRoot, "dist", "infrastructure", "converter", "assets");

const requiredAssets = [
  {
    path: join(distAssets, "cover-icon.png"),
    description: "cover icon PNG (dist/infrastructure/converter/assets/cover-icon.png)",
  },
  {
    path: join(distAssets, "fonts", "source-serif-regular.ttf"),
    description: "Source Serif 4 font TTF (dist/infrastructure/converter/assets/fonts/source-serif-regular.ttf)",
  },
  {
    path: join(projectRoot, "dist", "infrastructure", "converter", "flavors", "brutalist", "assets", "main-icon-inverted.png"),
    description: "brutalist icon PNG (dist/infrastructure/converter/flavors/brutalist/assets/main-icon-inverted.png)",
  },
  {
    path: join(projectRoot, "dist", "infrastructure", "converter", "flavors", "brutalist", "assets", "fonts", "inter-bold.ttf"),
    description: "Inter Bold font TTF (dist/infrastructure/converter/flavors/brutalist/assets/fonts/inter-bold.ttf)",
  },
];

let allPresent = true;

for (const asset of requiredAssets) {
  if (!existsSync(asset.path)) {
    console.error(`[verify-assets] MISSING: ${asset.description}`);
    console.error(`  Expected at: ${asset.path}`);
    console.error(`  Check that the asset-copy step in postbuild ran successfully.`);
    allPresent = false;
    continue;
  }

  const stat = statSync(asset.path);
  if (stat.size === 0) {
    console.error(`[verify-assets] EMPTY: ${asset.description}`);
    console.error(`  File at ${asset.path} exists but has 0 bytes.`);
    console.error(`  The source asset in src/infrastructure/converter/assets/ may be corrupted.`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.error(
    "\n[verify-assets] Build validation failed. The EPUB cover renderer requires these assets" +
    " at runtime. Add them to src/infrastructure/converter/assets/ and rebuild.\n",
  );
  process.exit(1);
}

console.log("[verify-assets] All required assets present in dist/.");
