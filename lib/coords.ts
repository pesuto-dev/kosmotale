import { AU_M, DEG, LINEAR_AU, LOG_SCALE, LY_M, OBLIQUITY } from "@/lib/constants";
import type { Vec } from "@/lib/types";

const LY_EDGE = (LINEAR_AU * AU_M) / LY_M;

export function hypot(v: Vec) {
  return Math.hypot(v.x, v.y, v.z);
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(v: Vec, k: number): Vec {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}

export function norm(v: Vec): Vec {
  const h = hypot(v) || 1;
  return scale(v, 1 / h);
}

export function toVisualRadius(meters: number) {
  const au = meters / AU_M;
  if (au <= LINEAR_AU) return au;
  const ly = meters / LY_M;
  return LINEAR_AU + Math.log10(ly / LY_EDGE) * LOG_SCALE;
}

export function visualToMeters(visualRadius: number) {
  if (visualRadius <= LINEAR_AU) return visualRadius * AU_M;
  const decades = (visualRadius - LINEAR_AU) / LOG_SCALE;
  return LY_EDGE * 10 ** decades * LY_M;
}

export function warpMeters(v: Vec): Vec {
  const r = hypot(v);
  if (r === 0) return { x: 0, y: 0, z: 0 };
  return scale(v, toVisualRadius(r) / r);
}

export function unwarpVisual(v: Vec): Vec {
  const r = hypot(v);
  if (r === 0) return { x: 0, y: 0, z: 0 };
  return scale(v, visualToMeters(r) / r);
}

export function eclipticToEquatorial(x: number, y: number, z: number): Vec {
  const c = Math.cos(OBLIQUITY);
  const s = Math.sin(OBLIQUITY);
  return { x, y: c * y - s * z, z: s * y + c * z };
}

export function raDecMeters(raDeg: number, decDeg: number, meters: number): Vec {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const c = Math.cos(dec);
  return {
    x: meters * c * Math.cos(ra),
    y: meters * c * Math.sin(ra),
    z: meters * Math.sin(dec),
  };
}

/** Hipparcos-matrix: galactische eenheidsvector (l, b) naar equatoriale ICRS. */
const GAL = [
  [-0.0548755604162154, -0.873437090234885, -0.4838350155487132],
  [0.4941094278755837, -0.4448296299600112, 0.7469822444972189],
  [-0.8676661490190047, -0.1980763734312015, 0.4559837761750669],
];

export function galacticToEquatorial(lDeg: number, bDeg: number, meters: number): Vec {
  const l = lDeg * DEG;
  const b = bDeg * DEG;
  const cosb = Math.cos(b);
  const g0 = cosb * Math.cos(l);
  const g1 = cosb * Math.sin(l);
  const g2 = Math.sin(b);
  // GAL zet equatoriale coördinaten om naar galactische; terug is de getransponeerde.
  const x = GAL[0][0] * g0 + GAL[1][0] * g1 + GAL[2][0] * g2;
  const y = GAL[0][1] * g0 + GAL[1][1] * g1 + GAL[2][1] * g2;
  const z = GAL[0][2] * g0 + GAL[1][2] * g1 + GAL[2][2] * g2;
  return { x: x * meters, y: y * meters, z: z * meters };
}

export function equatorialToGalacticLat(v: Vec) {
  const u = norm(v);
  const gx = GAL[0][0] * u.x + GAL[0][1] * u.y + GAL[0][2] * u.z;
  const gy = GAL[1][0] * u.x + GAL[1][1] * u.y + GAL[1][2] * u.z;
  const gz = GAL[2][0] * u.x + GAL[2][1] * u.y + GAL[2][2] * u.z;
  const b = Math.asin(Math.max(-1, Math.min(1, gz)));
  const l = Math.atan2(gy, gx);
  return { l, b };
}
