import { AU_M, LY_M } from "@/lib/constants";
import { cosmosById, filaments } from "@/lib/catalog";
import { galacticToEquatorial, norm, raDecMeters, warpMeters } from "@/lib/coords";
import { trueMeters } from "@/lib/positions";
import type { Vec } from "@/lib/types";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cross(a: Vec, b: Vec): Vec {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v: Vec, k: number): Vec {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

export function buildMilkyWay(count = 4200) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rng = mulberry32(2026);
  const gc = norm(raDecMeters(266.4168, -29.0078, 1));
  const ngp = norm(galacticToEquatorial(0, 90, 1));
  const toSun = scale(gc, -1);
  const rot = norm(cross(ngp, toSun));
  const R0 = 26670 * LY_M;
  let i = 0;
  let guard = 0;
  while (i < count && guard < count * 20) {
    guard += 1;
    const bulge = rng() < 0.12;
    const rhoLy = bulge
      ? Math.abs(rng() + rng() - 1) * 2800
      : Math.min(52000, -10500 * Math.log(1 - rng() * 0.97));
    const phi = rng() * Math.PI * 2;
    const zLy = bulge
      ? (rng() - 0.5) * 1800
      : (rng() + rng() + rng() - 1.5) * 380;
    const arm =
      0.5 + 0.5 * Math.cos(2 * (phi - Math.log(rhoLy / 1400 + 1) * 3.1));
    if (!bulge && rng() > 0.18 + 0.82 * arm * arm) continue;
    const fromGc = add(
      add(scale(toSun, rhoLy * LY_M * Math.cos(phi)), scale(rot, rhoLy * LY_M * Math.sin(phi))),
      scale(ngp, zLy * LY_M),
    );
    const fromSun = sub(fromGc, scale(toSun, R0));
    const w = warpMeters(fromSun);
    positions[i * 3] = w.x;
    positions[i * 3 + 1] = w.y;
    positions[i * 3 + 2] = w.z;
    const warm = bulge ? 0.95 : 0.75 + arm * 0.25;
    colors[i * 3] = warm;
    colors[i * 3 + 1] = warm * (bulge ? 0.82 : 0.9);
    colors[i * 3 + 2] = bulge ? 0.62 : 0.78;
    i += 1;
  }
  return {
    positions: positions.slice(0, i * 3),
    colors: colors.slice(0, i * 3),
    count: i,
  };
}

export function buildOort(count = 1600) {
  const positions = new Float32Array(count * 3);
  const rng = mulberry32(11);
  const r1 = 5000 * AU_M;
  const r2 = 80000 * AU_M;
  for (let i = 0; i < count; i += 1) {
    const r = r1 * (r2 / r1) ** rng();
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const w = warpMeters({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
    });
    positions[i * 3] = w.x;
    positions[i * 3 + 1] = w.y;
    positions[i * 3 + 2] = w.z;
  }
  return positions;
}

export function buildFilaments() {
  return filaments.map(([a, b]) => {
    const A = trueMeters(a, 2451545);
    const B = trueMeters(b, 2451545);
    const rng = mulberry32(a.length * 13 + b.length);
    const points: [number, number, number][] = [];
    for (let i = 0; i <= 28; i += 1) {
      const t = i / 28;
      const p = {
        x: A.x + (B.x - A.x) * t,
        y: A.y + (B.y - A.y) * t,
        z: A.z + (B.z - A.z) * t,
      };
      const len = Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z) || 1;
      const wobble = Math.sin(t * Math.PI) * len * 0.045 * (rng() - 0.5);
      const w = warpMeters({
        x: p.x + wobble,
        y: p.y + wobble * 0.6,
        z: p.z + wobble * 0.35,
      });
      points.push([w.x, w.y, w.z]);
    }
    return points;
  });
}

export function fillBelt(
  target: Float32Array,
  jd: number,
  which: "planetoidengordel" | "kuipergordel",
  seed: number,
) {
  const c = cosmosById.get(which);
  const min = c?.au_min ?? 2;
  const max = c?.au_max ?? 3;
  const rng = mulberry32(seed);
  const n = target.length / 3;
  const tilt = Math.cos((23.43928 * Math.PI) / 180);
  const st = Math.sin((23.43928 * Math.PI) / 180);
  for (let i = 0; i < n; i += 1) {
    const a = min + (max - min) * rng();
    const inc = rng() * (which === "kuipergordel" ? 0.22 : 0.12);
    const m0 = rng() * Math.PI * 2;
    const node = rng() * Math.PI * 2;
    const period = 365.25 * a ** 1.5;
    const ang = m0 + ((jd - 2451545) / period) * Math.PI * 2;
    const xE = a * Math.cos(ang);
    const yE = a * Math.sin(ang) * Math.cos(inc);
    const zE = a * Math.sin(ang) * Math.sin(inc);
    const cO = Math.cos(node);
    const sO = Math.sin(node);
    const xe = cO * xE - sO * yE;
    const ye = sO * xE + cO * yE;
    const ze = zE;
    const x = xe;
    const y = tilt * ye - st * ze;
    const z = st * ye + tilt * ze;
    target[i * 3] = x;
    target[i * 3 + 1] = y;
    target[i * 3 + 2] = z;
  }
}
