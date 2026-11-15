/**
 * Neemt de kosmotale-demo lokaal op, headed, met de GPU van de machine.
 *
 * De paginacursor staat uit (`cursor: none`). Playwright legt het OS-cursor
 * niet vast, dus het beeld leest als een camerabeweging.
 *
 * Pad (standaard 15 s), vast aan de aarde tot de klik op Sirius:
 *   aarde laten zien, slepen om eromheen te draaien, scrollen om uit te zoomen
 *   tot de sterren het beeld vullen, daarna Sirius in de lijst met infokaart.
 *
 *   npm run record-demo
 *   npm run record-demo -- --url http://127.0.0.1:43127
 *   npm run record-demo -- --duration 15 --lang nl
 *   npm run record-demo -- --prod
 */

import { spawn, type ChildProcess } from "node:child_process";
import { copyFile, mkdir, rename, rm, unlink } from "node:fs/promises";
import { createReadStream, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEV_PORT = 43127;
const DEV_URL = `http://127.0.0.1:${DEV_PORT}`;
const VIEW_W = 1280;
const VIEW_H = 800;

type Options = {
  url: string | null;
  duration: number;
  lang: string;
  prod: boolean;
};

type ServerHandle = {
  url: string;
  stop: () => Promise<void>;
};

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ease(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function quote(value: string) {
  if (process.platform === "win32") {
    return /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
  }
  return /[^A-Za-z0-9_./:-]/.test(value) ? `'${value.replace(/'/g, `'\\''`)}'` : value;
}

function nextBin() {
  return path.join(root, "node_modules", "next", "dist", "bin", "next");
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { url: null, duration: 15, lang: "nl", prod: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i] ?? "";
    const take = (flag: string) => {
      const eq = arg.startsWith(`${flag}=`) ? arg.slice(flag.length + 1) : null;
      if (eq != null) return eq;
      i += 1;
      const value = argv[i];
      if (!value || value.startsWith("--")) throw new Error(`${flag} heeft een waarde nodig.`);
      return value;
    };
    if (arg === "--help" || arg === "-h") {
      console.log(`npm run record-demo -- [--url URL] [--duration SEC] [--lang nl] [--prod]

  --url        al draaiende server, bijvoorbeeld http://127.0.0.1:${DEV_PORT}
  --duration   lengte van het camerapad in seconden (8–60, standaard 15)
  --lang       alleen nl doet iets; de interface is Nederlands
  --prod       next build, daarna de statische export in out/ serveren
`);
      process.exit(0);
    } else if (arg === "--url" || arg.startsWith("--url=")) {
      opts.url = take("--url");
    } else if (arg === "--duration" || arg.startsWith("--duration=")) {
      opts.duration = Number(take("--duration"));
    } else if (arg === "--lang" || arg.startsWith("--lang=")) {
      opts.lang = take("--lang");
    } else if (arg === "--prod") {
      opts.prod = true;
    } else {
      throw new Error(`Onbekende optie: ${arg}`);
    }
  }
  if (!Number.isFinite(opts.duration) || opts.duration < 8 || opts.duration > 60) {
    throw new Error("--duration moet een getal van 8 tot en met 60 seconden zijn.");
  }
  if (opts.url) {
    let parsed: URL;
    try {
      parsed = new URL(opts.url);
    } catch {
      throw new Error(`--url is geen geldige URL: ${opts.url}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("--url moet http of https zijn.");
    }
  }
  if (opts.url && opts.prod) throw new Error("Gebruik --url of --prod, niet allebei.");
  return opts;
}

function run(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: root, stdio: "inherit", env: process.env });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(cmd)} stopte (${code ?? signal}).`));
    });
  });
}

function stopChild(child: ChildProcess) {
  if (child.pid == null || child.exitCode != null) return;
  if (process.platform === "win32") {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    killer.once("error", () => {
      child.kill();
    });
    return;
  }
  child.kill("SIGTERM");
}

function waitForExit(child: ChildProcess) {
  return new Promise<void>((resolve) => {
    if (child.exitCode != null || child.signalCode != null) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, 5000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function isUp(url: string) {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(2500) });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitForHttp(url: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let last = "geen verbinding";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(2500) });
      if (res.status < 500) return;
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = err instanceof Error ? err.message : "geen verbinding";
    }
    await sleep(400);
  }
  throw new Error(`Server niet bereikbaar op ${url} (${last}).`);
}

function watchChild(child: ChildProcess, isReady: () => boolean) {
  const crashed = new Promise<never>((_, reject) => {
    child.once("error", (err) => {
      if (!isReady()) reject(err);
    });
    child.once("exit", (code, signal) => {
      if (!isReady()) {
        reject(new Error(`next dev stopte (${code ?? signal}) voordat de server luisterde.`));
      }
    });
  });
  crashed.catch(() => undefined);
  return crashed;
}

function insideRoot(dir: string, file: string) {
  const rel = path.relative(dir, file);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function resolveStatic(dir: string, urlPath: string) {
  let decoded = "/";
  try {
    decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  } catch {
    return null;
  }
  if (decoded.includes("\0")) return null;
  const rel = decoded.replace(/^[/\\]+/, "");
  const candidates = [path.resolve(dir, rel)];
  if (!path.extname(rel)) {
    candidates.push(path.resolve(dir, rel, "index.html"), path.resolve(dir, `${rel}.html`));
  }
  if (rel === "") candidates.unshift(path.resolve(dir, "index.html"));
  for (const file of candidates) {
    if (!insideRoot(dir, file)) continue;
    try {
      if (statSync(file).isFile()) return file;
    } catch {
      // volgende kandidaat
    }
  }
  return null;
}

function listenStatic(dir: string, port: number) {
  const server = http.createServer((req, res) => {
    const file = resolveStatic(dir, req.url ?? "/");
    if (!file) {
      res.writeHead(404);
      res.end();
      return;
    }
    const type = MIME[path.extname(file).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    const stream = createReadStream(file);
    stream.once("error", () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  });
  return new Promise<http.Server>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function ensureServer(opts: Options): Promise<ServerHandle> {
  if (opts.url) {
    if (!(await isUp(opts.url))) {
      throw new Error(`Geen server op ${opts.url}. Start er een, of laat --url weg.`);
    }
    console.log(`Gebruik ${opts.url}`);
    return { url: opts.url, stop: async () => undefined };
  }

  if (opts.prod) {
    if (await isUp(DEV_URL)) {
      throw new Error(`Poort ${DEV_PORT} is al in gebruik. Stop die server, of neem op met --url.`);
    }
    console.log("Productie-export: next build, daarna out/ serveren.");
    await run(process.execPath, [path.join(root, "scripts", "export-licenses.mjs")]);
    await run(process.execPath, [nextBin(), "build"]);
    const server = await listenStatic(path.join(root, "out"), DEV_PORT);
    console.log(`Statische export op ${DEV_URL}`);
    return {
      url: DEV_URL,
      stop: () =>
        new Promise((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        }),
    };
  }

  if (await isUp(DEV_URL)) {
    console.log(`Hergebruik de server op ${DEV_URL}`);
    return { url: DEV_URL, stop: async () => undefined };
  }

  console.log(`Start de ontwikkelserver op ${DEV_URL}`);
  await run(process.execPath, [path.join(root, "scripts", "export-licenses.mjs")]);
  const child = spawn(
    process.execPath,
    [nextBin(), "dev", "--hostname", "0.0.0.0", "--port", String(DEV_PORT)],
    { cwd: root, stdio: "inherit", env: process.env },
  );
  let ready = false;
  try {
    await Promise.race([waitForHttp(DEV_URL, 120_000), watchChild(child, () => ready)]);
    ready = true;
  } catch (err) {
    stopChild(child);
    await waitForExit(child);
    throw err;
  }
  return {
    url: DEV_URL,
    stop: async () => {
      stopChild(child);
      await waitForExit(child);
    },
  };
}

async function dragOrbit(page: Page, ms: number) {
  const x0 = 560;
  const y0 = 280;
  const x1 = 760;
  const y1 = 190;
  const started = Date.now();
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  const steps = Math.max(18, Math.round(ms / 30));
  for (let i = 1; i <= steps; i += 1) {
    const t = ease(i / steps);
    const wobble = Math.sin((i / steps) * Math.PI) * 16;
    await page.mouse.move(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + wobble);
    const target = started + ms * (i / steps);
    const left = target - Date.now();
    if (left > 0) await sleep(left);
  }
  await page.mouse.up();
}

async function zoomOut(page: Page, ms: number) {
  // Scrollen omlaag vergroot de afstand tot de aarde (niet de vliegsnelheid).
  // ~10500 px deltaY brengt een gevulde aarde naar ongeveer 30 AE, met sterren eromheen.
  const total = 10500;
  await page.mouse.move(640, 280);
  const steps = Math.max(28, Math.round(ms / 40));
  const started = Date.now();
  for (let i = 1; i <= steps; i += 1) {
    const delta = Math.max(40, Math.round(total * (ease(i / steps) - ease((i - 1) / steps))));
    await page.mouse.wheel(0, delta);
    const left = started + ms * (i / steps) - Date.now();
    if (left > 0) await sleep(left);
  }
}

async function showSirius(page: Page) {
  const search = page.locator("#zoek");
  await search.click();
  await search.fill("");
  await search.pressSequentially("Sirius", { delay: 55 });
  const row = page.locator("ul button", { hasText: "Sirius" }).first();
  await row.waitFor({ state: "visible", timeout: 8000 });
  await row.click();
  await page.getByRole("heading", { level: 2, name: "Sirius" }).waitFor({ timeout: 8000 });
}

async function playPath(page: Page, durationSec: number) {
  const total = durationSec * 1000;
  const started = Date.now();
  const until = async (fraction: number) => {
    const wait = started + total * fraction - Date.now();
    if (wait > 20) await sleep(wait);
  };
  await until(0.18);
  await dragOrbit(page, total * 0.22);
  await until(0.44);
  await zoomOut(page, total * 0.28);
  await until(0.74);
  await showSirius(page);
  await until(1);
}

function videoKbps(seconds: number) {
  const kbps = Math.round((2_200_000 * 8) / seconds / 1000);
  return Math.min(1600, Math.max(500, kbps));
}

function commandExists(cmd: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(cmd, ["-version"], { stdio: "ignore" });
    child.once("error", () => resolve(false));
    child.once("exit", (code) => resolve(code === 0));
  });
}

function printFfmpegRecipe(raw: string, trimSec: number, durationSec: number) {
  const kbps = videoKbps(durationSec);
  const mp4 = path.join(root, "demo-output", "kosmotale-demo.mp4");
  const webm = path.join(root, "demo-output", "kosmotale-demo.webm");
  const png = path.join(root, "demo-output", "kosmotale-demo.png");
  const poster = (trimSec + Math.min(1, durationSec * 0.08)).toFixed(3);
  const ss = trimSec.toFixed(3);
  const dur = durationSec.toFixed(3);
  console.error(`ffmpeg staat niet op PATH, of de omzetting is mislukt.
De ruwe opname blijft staan:
  ${raw}

Installeer ffmpeg en zet het op PATH:
  winget install Gyan.FFmpeg
  brew install ffmpeg
  sudo apt install ffmpeg

Daarna:

  ffmpeg -y -ss ${ss} -i ${quote(raw)} -t ${dur} -an -vf scale=${VIEW_W}:${VIEW_H}:flags=lanczos,format=yuv420p -c:v libx264 -pix_fmt yuv420p -b:v ${kbps}k -maxrate ${Math.round(kbps * 1.35)}k -bufsize ${kbps * 2}k -movflags +faststart ${quote(mp4)}
  ffmpeg -y -ss ${ss} -i ${quote(raw)} -t ${dur} -an -vf scale=${VIEW_W}:${VIEW_H}:flags=lanczos,format=yuv420p -c:v libvpx-vp9 -pix_fmt yuv420p -b:v ${kbps}k -row-mt 1 -deadline good ${quote(webm)}
  ffmpeg -y -i ${quote(raw)} -ss ${poster} -frames:v 1 ${quote(png)}
`);
}

async function moveFile(from: string, to: string) {
  await mkdir(path.dirname(to), { recursive: true });
  try {
    await rename(from, to);
  } catch {
    await copyFile(from, to);
    await unlink(from);
  }
}

async function encode(raw: string, trimSec: number, durationSec: number) {
  const outDir = path.join(root, "demo-output");
  const mp4 = path.join(outDir, "kosmotale-demo.mp4");
  const webm = path.join(outDir, "kosmotale-demo.webm");
  const png = path.join(outDir, "kosmotale-demo.png");
  const kbps = videoKbps(durationSec);
  const ss = trimSec.toFixed(3);
  const dur = durationSec.toFixed(3);
  const scale = `scale=${VIEW_W}:${VIEW_H}:flags=lanczos,format=yuv420p`;
  const poster = (trimSec + Math.min(1, durationSec * 0.08)).toFixed(3);
  if (!(await commandExists("ffmpeg"))) {
    printFfmpegRecipe(raw, trimSec, durationSec);
    return false;
  }
  await run("ffmpeg", [
    "-y",
    "-ss",
    ss,
    "-i",
    raw,
    "-t",
    dur,
    "-an",
    "-vf",
    scale,
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    `${kbps}k`,
    "-maxrate",
    `${Math.round(kbps * 1.35)}k`,
    "-bufsize",
    `${kbps * 2}k`,
    "-movflags",
    "+faststart",
    mp4,
  ]);
  await run("ffmpeg", [
    "-y",
    "-ss",
    ss,
    "-i",
    raw,
    "-t",
    dur,
    "-an",
    "-vf",
    scale,
    "-c:v",
    "libvpx-vp9",
    "-pix_fmt",
    "yuv420p",
    "-b:v",
    `${kbps}k`,
    "-row-mt",
    "1",
    "-deadline",
    "good",
    webm,
  ]);
  await run("ffmpeg", ["-y", "-i", raw, "-ss", poster, "-frames:v", "1", png]);
  await rm(path.join(outDir, "raw"), { recursive: true, force: true });
  console.log(`Klaar:\n  ${mp4}\n  ${webm}\n  ${png}`);
  return true;
}

async function hideCursor(context: BrowserContext) {
  await context.addInitScript(() => {
    const apply = () => {
      if (document.querySelector("style[data-kosmotale-demo]")) return;
      const style = document.createElement("style");
      style.setAttribute("data-kosmotale-demo", "cursor");
      style.textContent = "html, html * { cursor: none !important; }";
      (document.head || document.documentElement).appendChild(style);
    };
    if (document.head) apply();
    else document.addEventListener("DOMContentLoaded", apply);
  });
}

async function record(url: string, opts: Options) {
  const rawDir = path.join(root, "demo-output", "raw");
  await mkdir(rawDir, { recursive: true });
  let browser: Browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ["--enable-gpu", "--ignore-gpu-blocklist"],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `${message}\n\nChromium ontbreekt of start niet. Eenmalig: npx playwright install chromium`,
    );
  }
  const context = await browser.newContext({
    viewport: { width: VIEW_W, height: VIEW_H },
    deviceScaleFactor: 2,
    locale: opts.lang.toLowerCase().startsWith("nl") ? "nl-NL" : opts.lang,
    colorScheme: "dark",
    recordVideo: { dir: rawDir, size: { width: VIEW_W, height: VIEW_H } },
  });
  await hideCursor(context);
  const page = await context.newPage();
  try {
    const mark = Date.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector("canvas");
        const ready = (window as Window & { __kosmotaleReady?: boolean }).__kosmotaleReady;
        return Boolean(canvas && canvas.width > 0 && ready);
      },
      undefined,
      { timeout: 90_000 },
    );
    const trimSec = Math.max(0, (Date.now() - mark) / 1000 - 0.05);
    console.log(`Scène staat. Camerapad ${opts.duration}s, opwarmtijd ${trimSec.toFixed(2)}s wordt weggesneden.`);
    await playPath(page, opts.duration);
    const video = page.video();
    if (!video) throw new Error("Playwright heeft geen video opgenomen.");
    await page.close();
    await context.close();
    const recorded = await video.path();
    const raw = path.join(rawDir, "take.webm");
    await moveFile(recorded, raw);
    await browser.close();
    try {
      const encoded = await encode(raw, trimSec, opts.duration);
      if (!encoded) process.exitCode = 2;
    } catch (err) {
      printFfmpegRecipe(raw, trimSec, opts.duration);
      throw err;
    }
  } finally {
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.lang.toLowerCase().startsWith("nl")) {
    console.log(`--lang ${opts.lang} doet niets: de interface is alleen Nederlands. De opname blijft Nederlands.`);
  }
  const server = await ensureServer(opts);
  try {
    await record(server.url, opts);
  } finally {
    await server.stop();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
