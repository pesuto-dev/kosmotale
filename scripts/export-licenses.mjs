import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

/** Canonieke teksten blijven in de wortels. Deze kopieën dienen Next (dev én export). */
const files = ["LICENSE", "NOTICE", "LICENSES/hipparcos.txt", "LICENSES/sterrenkaart.txt"];
const destRoot = "public";

for (const file of files) {
  const dest = join(destRoot, file);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(file, dest);
}
