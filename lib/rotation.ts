import { DEG } from "@/lib/constants";
import type { Vec } from "@/lib/types";

/**
 * Noordpool (ICRF, J2000) en nulmeridiaan W = w0 + wd·d, met d in dagen sinds J2000.
 * IAU WGCCRE 2015 (Archinal e.a. 2018), zonder de kleine periodieke termen.
 */
type Spin = { ra: number; dec: number; w0: number; wd: number };

const SPIN: Record<string, Spin> = {
  zon: { ra: 286.13, dec: 63.87, w0: 84.176, wd: 14.1844 },
  mercurius: { ra: 281.0103, dec: 61.4155, w0: 329.5988, wd: 6.1385108 },
  venus: { ra: 272.76, dec: 67.16, w0: 160.2, wd: -1.4813688 },
  aarde: { ra: 0, dec: 90, w0: 190.147, wd: 360.9856235 },
  maan: { ra: 269.9949, dec: 66.5392, w0: 38.3213, wd: 13.17635815 },
  mars: { ra: 317.269202, dec: 54.432516, w0: 176.049863, wd: 350.891982443297 },
  jupiter: { ra: 268.056595, dec: 64.495303, w0: 284.95, wd: 870.536 },
  saturnus: { ra: 40.589, dec: 83.537, w0: 38.9, wd: 810.7939024 },
  uranus: { ra: 257.311, dec: -15.175, w0: 203.81, wd: -501.1600928 },
  neptunus: { ra: 299.36, dec: 43.46, w0: 249.978, wd: 541.1397757 },
  pluto: { ra: 132.993, dec: -6.163, w0: 302.695, wd: -56.3625225 },
};

/** Afplatting (1 − poolstraal/equatorstraal), NASA Planetary Fact Sheet. */
export const FLATTENING: Record<string, number> = {
  aarde: 0.00335,
  mars: 0.00589,
  jupiter: 0.06487,
  saturnus: 0.09796,
  uranus: 0.02293,
  neptunus: 0.01708,
};

function unit(raDeg: number, decDeg: number): Vec {
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  return { x: Math.cos(dec) * Math.cos(ra), y: Math.cos(dec) * Math.sin(ra), z: Math.sin(dec) };
}

function cross(a: Vec, b: Vec): Vec {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function normalize(v: Vec): Vec {
  const h = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / h, y: v.y / h, z: v.z / h };
}

export function poleOf(id: string, parent?: string): Vec | null {
  const s = SPIN[id] ?? (parent ? SPIN[parent] : undefined);
  return s ? unit(s.ra, s.dec) : null;
}

/** Nulmeridiaan (lengte 0) en noordpool van een lichaam, ICRF. */
export type BodyFrame = { meridian: Vec; pole: Vec };

export function spinFrame(id: string, jd: number): BodyFrame | null {
  const s = SPIN[id];
  if (!s) return null;
  const pole = unit(s.ra, s.dec);
  const node: Vec = { x: -Math.sin(s.ra * DEG), y: Math.cos(s.ra * DEG), z: 0 };
  const w = ((s.w0 + s.wd * (jd - 2451545)) % 360) * DEG;
  const q = cross(pole, node);
  return {
    pole,
    meridian: {
      x: node.x * Math.cos(w) + q.x * Math.sin(w),
      y: node.y * Math.cos(w) + q.y * Math.sin(w),
      z: node.z * Math.cos(w) + q.z * Math.sin(w),
    },
  };
}

/** Gebonden rotatie: lengte 0 wijst naar de planeet. */
export function lockedFrame(pole: Vec, toParent: Vec): BodyFrame {
  const d = toParent.x * pole.x + toParent.y * pole.y + toParent.z * pole.z;
  const meridian = normalize({
    x: toParent.x - pole.x * d,
    y: toParent.y - pole.y * d,
    z: toParent.z - pole.z * d,
  });
  return { pole, meridian };
}
