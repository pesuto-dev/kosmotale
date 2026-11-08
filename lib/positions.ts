import { AU_M, LY_M } from "@/lib/constants";
import { SATURN_RING_ID, SATURN_RINGS_KM } from "@/lib/rings";
import {
  eclipticToEquatorial,
  raDecMeters,
  warpMeters,
} from "@/lib/coords";
import {
  cosmosById,
  filaments,
  moonById,
  planetById,
  pluto,
  starById,
  stars,
} from "@/lib/catalog";
import {
  osculatingPositionAu,
  sampleOsculatingAu,
  sampleSecularAu,
  secularPositionAu,
} from "@/lib/kepler";
import type { Realm, Vec } from "@/lib/types";

const ZERO: Vec = { x: 0, y: 0, z: 0 };

function auToMeters(v: Vec): Vec {
  return { x: v.x * AU_M, y: v.y * AU_M, z: v.z * AU_M };
}

function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function planetEclipticAu(id: string, jd: number): Vec {
  if (id === "pluto") return osculatingPositionAu(pluto, jd);
  const p = planetById.get(id);
  if (!p) return ZERO;
  return secularPositionAu(p, jd);
}

export function trueMeters(id: string, jd: number): Vec {
  if (id === "zon") return ZERO;
  if (id === SATURN_RING_ID) return trueMeters("saturnus", jd);
  if (planetById.has(id) || id === "pluto") {
    return eclipticToEquatorialVec(auToMeters(planetEclipticAu(id, jd)));
  }
  const moon = moonById.get(id);
  if (moon) {
    const parent = planetEclipticAu(moon.parent, jd);
    const rel = osculatingPositionAu(moon, jd);
    return eclipticToEquatorialVec(
      auToMeters({
        x: parent.x + rel.x,
        y: parent.y + rel.y,
        z: parent.z + rel.z,
      }),
    );
  }
  const star = starById(id);
  if (star) return raDecMeters(star.ra, star.dec, star.ly * LY_M);
  const c = cosmosById.get(id);
  if (!c) return ZERO;
  if (c.place === "ring") {
    const au = c.au ?? 2.7;
    return eclipticToEquatorialVec({ x: au * AU_M, y: 0, z: 0 });
  }
  if (c.place === "shell" && c.au_max && !c.ly) {
    return { x: ((c.au_min ?? 2000) + c.au_max) * 0.5 * AU_M, y: 0, z: 0 };
  }
  if (c.place === "shell" && c.ly) {
    return { x: c.ly * LY_M, y: 0, z: 0 };
  }
  if (c.place === "field" && c.ly) {
    return { x: 0, y: 0, z: c.ly * LY_M * 0.25 };
  }
  if (c.place === "web") {
    const ids = [...new Set(filaments.flat())];
    const pts = ids.map((fid) => trueMeters(fid, jd));
    const n = pts.length || 1;
    const sum = pts.reduce((acc, p) => add(acc, p), { x: 0, y: 0, z: 0 });
    return { x: sum.x / n, y: sum.y / n, z: sum.z / n };
  }
  if (c.ra != null && c.dec != null && c.ly != null) {
    return raDecMeters(c.ra, c.dec, c.ly * LY_M);
  }
  return ZERO;
}

function eclipticToEquatorialVec(v: Vec): Vec {
  return eclipticToEquatorial(v.x, v.y, v.z);
}

export function visualOf(id: string, jd: number): Vec {
  return warpMeters(trueMeters(id, jd));
}

export function sunDistanceM(id: string, jd: number) {
  const p = trueMeters(id, jd);
  return Math.hypot(p.x, p.y, p.z);
}

export function orbitVisual(id: string, jd: number): Vec[] {
  const moon = moonById.get(id);
  if (moon) {
    const parent = planetEclipticAu(moon.parent, jd);
    return sampleOsculatingAu(moon).map((rel) =>
      warpMeters(
        eclipticToEquatorial(
          (parent.x + rel.x) * AU_M,
          (parent.y + rel.y) * AU_M,
          (parent.z + rel.z) * AU_M,
        ),
      ),
    );
  }
  if (id === "pluto") {
    return sampleOsculatingAu(pluto).map((p) =>
      warpMeters(eclipticToEquatorial(p.x * AU_M, p.y * AU_M, p.z * AU_M)),
    );
  }
  const planet = planetById.get(id);
  if (!planet) return [];
  return sampleSecularAu(planet, jd).map((p) =>
    warpMeters(eclipticToEquatorial(p.x * AU_M, p.y * AU_M, p.z * AU_M)),
  );
}

export function realmForDistance(meters: number): Realm {
  const au = meters / AU_M;
  const ly = meters / LY_M;
  if (au < 120) return "zonnestelsel";
  if (ly < 1.2) return "buitengebied";
  if (ly < 20000) return "sterren";
  if (ly < 500000) return "melkweg";
  if (ly < 6e6) return "lokale-groep";
  if (ly < 8e8) return "supercluster";
  return "heelal";
}

export function visualBodyRadius(id: string, jd: number) {
  void jd;
  if (id === "zon") return (695700 * 1000) / AU_M;
  if (id === SATURN_RING_ID) return (SATURN_RINGS_KM.aOuter * 1000) / AU_M;
  const planet = planetById.get(id);
  if (planet) return (planet.radius_km * 1000) / AU_M;
  const moon = moonById.get(id);
  if (moon) return (moon.radius_km * 1000) / AU_M;
  if (id === "pluto") return (pluto.radius_km * 1000) / AU_M;
  const c = cosmosById.get(id);
  if (c?.radius_ly && c.ly) {
    const center = c.ly * LY_M;
    const radius = c.radius_ly * LY_M;
    const outer = warpMeters({ x: center + radius, y: 0, z: 0 }).x;
    const inner = warpMeters({ x: Math.max(1, center - radius), y: 0, z: 0 }).x;
    return Math.max(0.35, Math.abs(outer - inner) / 2);
  }
  if (c?.radius_m && c.ly) {
    return 0.4;
  }
  if (starById(id)) return 0.08;
  return 0.5;
}

export const starRecords = stars;
