import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
const out = "out";
const required = ["LICENSE", "NOTICE", "LICENSES/hipparcos.txt", "LICENSES/sterrenkaart.txt"];
const uri = "https://creativecommons.org/licenses/by-nc/3.0/igo/legalcode";

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const file of required) {
  const exported = join(out, file);
  if (!existsSync(exported)) fail(`export mist ${exported}`);
  const canon = readFileSync(file);
  const copy = readFileSync(exported);
  if (!canon.equals(copy)) fail(`export wijkt af van de bron: ${file}`);
}

const hip = readFileSync(join(out, "LICENSES/hipparcos.txt"), "utf8");
for (const needle of [
  uri,
  "Credit: ESA",
  "The Hipparcos and Tycho Catalogues (ESA 1997)",
  "0,15",
  "3,261563777",
  "I/239",
]) {
  if (!hip.includes(needle)) fail(`hipparcos.txt mist: ${needle}`);
}

const notice = readFileSync(join(out, "NOTICE"), "utf8");
for (const needle of ["VTAD", "edition 3", "IAU", "USGS", "CC BY-NC 3.0 IGO", "SVS 4851", "Gaia DR2", "sterren.jpg"]) {
  if (!notice.includes(needle)) fail(`NOTICE mist: ${needle}`);
}

const sky = readFileSync(join(out, "LICENSES/sterrenkaart.txt"), "utf8");
for (const needle of [
  uri,
  "SVS 4851",
  "starmap_2020_4k.exr",
  "NASA/Goddard Space Flight Center Scientific Visualization Studio",
  "Gaia DR2: ESA/Gaia/DPAC",
  "Credit: ESA",
  "4096",
  "sterrenbeeldfiguren",
]) {
  if (!sky.includes(needle)) fail(`sterrenkaart.txt mist: ${needle}`);
}

const skyImage = join(out, "textures/sterren.jpg");
if (!existsSync(skyImage)) fail(`export mist ${skyImage}`);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) walk(path, acc);
    else if (/\.(html|js|txt)$/.test(name)) acc.push(path);
  }
  return acc;
}

const texts = walk(out).map((path) => readFileSync(path, "utf8")).join("\n");
if (!texts.includes(uri)) fail("export bevat de CC BY-NC 3.0 IGO-URI niet");
if (base && !texts.includes(JSON.stringify(base))) {
  fail(`export mist het basePath-voorvoegsel ${base}`);
}
for (const file of required) {
  const arg = JSON.stringify(`/${file}`);
  if (!texts.includes(arg)) fail(`export mist de licentielink ${arg}`);
}

console.log("export-licenties ok");
