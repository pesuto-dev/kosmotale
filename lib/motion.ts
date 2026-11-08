import { getObject, moonById, planetById } from "@/lib/catalog";
import { SATURN_RING_ID } from "@/lib/rings";
import { formatSpeed } from "@/lib/format";
import { trueMeters } from "@/lib/positions";
import type { Vec } from "@/lib/types";

const STEP_DAYS = 10 / 86400;

function hypot(v: Vec) {
  return Math.hypot(v.x, v.y, v.z);
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function separation(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Snelheid in m/s langs de baan. Manen ten opzichte van hun planeet, de rest om de zon. */
export function orbitalSpeedMps(id: string, jd: number) {
  if (id === "zon") return 0;
  const moon = moonById.get(id);
  const moves = moon || planetById.has(id) || id === "pluto";
  if (!moves) return null;
  const at = (t: number) => {
    if (moon) return sub(trueMeters(id, t), trueMeters(moon.parent, t));
    return trueMeters(id, t);
  };
  const a = at(jd);
  const b = at(jd + STEP_DAYS);
  return separation(a, b) / (STEP_DAYS * 86400);
}

export function speedPhrase(id: string, jd: number) {
  if (id === SATURN_RING_ID) return "mee met Saturnus, geen eigen baan";
  if (id === "zon") return "0 km/s, het middelpunt";
  const mps = orbitalSpeedMps(id, jd);
  if (mps == null) return "beweegt niet met de klok";
  const moon = moonById.get(id);
  if (moon) {
    const name = getObject(moon.parent)?.name ?? moon.parent;
    const om = moon.parent === "aarde" ? "om de aarde" : `om ${name}`;
    return `${formatSpeed(mps)} ${om}`;
  }
  return `${formatSpeed(mps)} om de zon`;
}

export function relativeAngleDeg(id: string, jd: number, days: number) {
  const moon = moonById.get(id);
  const at = (t: number) => {
    if (moon) return sub(trueMeters(id, t), trueMeters(moon.parent, t));
    return trueMeters(id, t);
  };
  const a = at(jd);
  const b = at(jd + days);
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  const c = Math.min(1, Math.max(-1, dot / (hypot(a) * hypot(b) || 1)));
  return (Math.acos(c) * 180) / Math.PI;
}
