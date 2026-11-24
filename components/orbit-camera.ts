import * as THREE from "three";
import { getObject, moonById } from "@/lib/catalog";
import { eclipticToEquatorial } from "@/lib/coords";
import { orbitVisual, visualBodyRadius, visualOf } from "@/lib/positions";
import { sim } from "@/lib/sim";
import { toV3, viewHalfAngle } from "@/components/flight-math";

const _body = new THREE.Vector3();
const _point = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _view = new THREE.Vector3();
const _up = new THREE.Vector3();
const _proj = new THREE.Vector3();

/** Noordpool van de ecliptica in het visuele (equatoriale) frame. */
export const ECLIPTIC_NORTH = toV3(eclipticToEquatorial(0, 0, 1)).normalize();
/** Een richting in het eclipticavlak, zodat het bovenaanzicht niet rolt. */
export const ECLIPTIC_UP = toV3(eclipticToEquatorial(0, 1, 0)).normalize();
/** Oost in het eclipticavlak, voor draaien om de noordpool. */
export const ECLIPTIC_EAST = new THREE.Vector3().crossVectors(ECLIPTIC_UP, ECLIPTIC_NORTH).normalize();
export const WORLD_UP = new THREE.Vector3(0, 0, 1);
/** De baan vult dit deel van de halve beeldhoek, zodat er wat lucht omheen blijft. */
const TOP_DOWN_FILL = 0.72;

/** Werelden die met sim.jd meebewegen; alleen die zijn na een nadering te volgen. */
export function followable(id: string) {
  const kind = getObject(id)?.kind;
  return (
    kind === "zon" ||
    kind === "planeet" ||
    kind === "maan" ||
    kind === "dwergplaneet" ||
    kind === "ringen"
  );
}

export type TopDownFrame = { id: string; epoch: number; radius: number };

/**
 * Focus (zon of moederplaneet) en grootste visuele baanstraal om die focus.
 * De straal wordt per baan-epoche herbruikt; die verandert nauwelijks.
 */
export function topDownFocus(id: string, jd: number, cache: TopDownFrame | null, out: THREE.Vector3) {
  const moon = moonById.get(id);
  if (moon) toV3(visualOf(moon.parent, jd), out);
  else out.set(0, 0, 0);
  const epoch = Math.floor(jd / 30);
  if (cache && cache.id === id && cache.epoch === epoch) return cache;
  let radius = 0;
  for (const p of orbitVisual(id, jd)) {
    radius = Math.max(radius, _point.set(p.x, p.y, p.z).distanceTo(out));
  }
  return { id, epoch, radius: Math.max(radius, 1e-6) };
}

/** Afstand boven de focus waarop de baanstraal in de kleinste beeldas past. */
export function topDownDistance(radius: number, aspect: number) {
  return radius / Math.tan(viewHalfAngle(aspect) * TOP_DOWN_FILL);
}

export type OrbitDelta = { az: number; polar: number; zoom: number };

export function orbitActive(d: OrbitDelta) {
  return d.az !== 0 || d.polar !== 0 || Math.abs(d.zoom - 1) > 1e-8;
}

/** Kleinste en grootste afstand tot de focus. `fit` is de afstand waarop een baan in beeld past. */
export function orbitLimits(id: string, jd: number, fit: number | null) {
  const body = Math.max(visualBodyRadius(id, jd), 1e-6);
  const minR = Math.max(body * 1.3, 1e-6);
  const maxR = fit != null ? Math.max(fit * 8, minR * 4) : Math.max(minR * 40, 1200);
  return { minR, maxR };
}

/** Zoomen voorbij de gewone grens blijft staan; verder inzoomen klapt niet terug. */
function clampDistance(current: number, zoom: number, minR: number, maxR: number) {
  const ceiling = Math.max(maxR, current);
  const cap = zoom > 1 && current > maxR ? current : ceiling;
  return THREE.MathUtils.clamp(current * zoom, minR, cap);
}

/**
 * Draai `offset` om de wereld-opwaartse as en kantel hem, en schaal de lengte.
 * `az` volgt het slepen: naar rechts is negatief. `polar` telt vanaf de opwaartse as.
 */
export function nudgeOffset(offset: THREE.Vector3, d: OrbitDelta, minR: number, maxR: number) {
  if (offset.lengthSq() < 1e-16) offset.set(minR, 0, minR * 0.35);
  if (d.az !== 0) offset.applyAxisAngle(WORLD_UP, d.az);
  if (d.polar !== 0) {
    const len = offset.length() || 1;
    const polarNow = Math.acos(THREE.MathUtils.clamp(offset.z / len, -1, 1));
    const polarNext = THREE.MathUtils.clamp(polarNow + d.polar, 0.04, Math.PI - 0.04);
    _axis.crossVectors(WORLD_UP, offset);
    if (_axis.lengthSq() > 1e-10 && Math.abs(polarNext - polarNow) > 1e-6) {
      _axis.normalize();
      offset.applyAxisAngle(_axis, polarNext - polarNow);
    }
  }
  offset.setLength(clampDistance(offset.length() || minR, d.zoom, minR, maxR));
}

export type TopPose = {
  id: string;
  hold: boolean;
  azimuth: number;
  polar: number;
  radius: number;
};

/** Huidige camera om de focus, zodat de eerste draai niet verspringt. */
export function captureTopPose(cam: THREE.PerspectiveCamera, focus: THREE.Vector3, pose: TopPose) {
  _view.copy(cam.position).sub(focus);
  const radius = Math.max(_view.length(), 1e-6);
  const along = _view.dot(ECLIPTIC_NORTH);
  const polar = Math.acos(THREE.MathUtils.clamp(along / radius, -1, 1));
  _proj.copy(_view).addScaledVector(ECLIPTIC_NORTH, -along);
  const azimuth =
    _proj.lengthSq() < radius * radius * 1e-6
      ? pose.azimuth
      : Math.atan2(_proj.dot(ECLIPTIC_EAST), _proj.dot(ECLIPTIC_UP));
  pose.hold = true;
  pose.radius = radius;
  pose.polar = polar;
  pose.azimuth = azimuth;
}

export function applyTopDelta(pose: TopPose, d: OrbitDelta, minR: number, maxR: number) {
  pose.azimuth += d.az;
  pose.polar = THREE.MathUtils.clamp(pose.polar + d.polar, 0.001, Math.PI - 0.08);
  pose.radius = clampDistance(pose.radius, d.zoom, minR, maxR);
}

export function placeTopCamera(cam: THREE.PerspectiveCamera, focus: THREE.Vector3, pose: TopPose) {
  const sp = Math.sin(pose.polar);
  const cp = Math.cos(pose.polar);
  const ca = Math.cos(pose.azimuth);
  const sa = Math.sin(pose.azimuth);
  const r = pose.radius;
  cam.position.copy(focus);
  cam.position.addScaledVector(ECLIPTIC_NORTH, cp * r);
  cam.position.addScaledVector(ECLIPTIC_UP, sp * ca * r);
  cam.position.addScaledVector(ECLIPTIC_EAST, sp * sa * r);
  _view.copy(focus).sub(cam.position);
  if (_view.lengthSq() < 1e-12) _view.copy(ECLIPTIC_NORTH).multiplyScalar(-1);
  else _view.normalize();
  // Bovenkant volgt de draaiing. Recht van boven is dat de kaart; schuin erboven blijft die richting.
  _up.copy(ECLIPTIC_UP).multiplyScalar(ca);
  _up.addScaledVector(ECLIPTIC_EAST, sa);
  _up.addScaledVector(_view, -_up.dot(_view));
  if (_up.lengthSq() < 1e-4) _up.copy(ECLIPTIC_NORTH).multiplyScalar(cp >= 0 ? -1 : 1);
  else _up.normalize();
  cam.up.copy(_up);
  cam.lookAt(focus);
}

export function takeOrbitInput(pending: OrbitDelta, stepDt: number): OrbitDelta {
  const d = { az: pending.az, polar: pending.polar, zoom: pending.zoom };
  pending.az = 0;
  pending.polar = 0;
  pending.zoom = 1;
  if (sim.freeNav) return { az: 0, polar: 0, zoom: 1 };
  const turn = (sim.keys.boost ? 1.7 : 0.85) * stepDt;
  const dolly = (sim.keys.boost ? 1.5 : 0.65) * stepDt;
  // Zelfde richting als slepen: rechts en omlaag zijn negatief.
  if (sim.keys.left) d.az += turn;
  if (sim.keys.right) d.az -= turn;
  if (sim.keys.up) d.polar -= turn;
  if (sim.keys.down) d.polar += turn;
  if (sim.keys.forward) d.zoom *= Math.exp(-dolly);
  if (sim.keys.back) d.zoom *= Math.exp(dolly);
  return d;
}

export function attachFollow(cam: THREE.PerspectiveCamera, id: string, jd: number) {
  const body = toV3(visualOf(id, jd), _body);
  const offset = cam.position.clone().sub(body);
  if (offset.lengthSq() < 1e-10) {
    offset.set(0.4, -0.3, 0.2).setLength(Math.max(visualBodyRadius(id, jd) * 8, 0.02));
  }
  return { id, offset };
}

export function arrivalOffset(
  id: string,
  offset: THREE.Vector3 | null,
  cam: THREE.PerspectiveCamera,
  jd: number,
) {
  if (offset && offset.lengthSq() > 1e-12) return offset.clone();
  const body = toV3(visualOf(id, jd), _body);
  const next = cam.position.clone().sub(body);
  if (next.lengthSq() < 1e-10) {
    next.set(0.4, -0.3, 0.2).setLength(Math.max(visualBodyRadius(id, jd) * 8, 0.02));
  }
  return next;
}

/** Kijk naar de focus. Recht erboven blijft een horizontale bovenkant, zodat het beeld niet omklapt. */
export function lookAtFocus(camera: THREE.PerspectiveCamera, focus: THREE.Vector3) {
  _view.copy(focus).sub(camera.position);
  if (_view.lengthSq() < 1e-12) _view.set(0, 1, 0);
  else _view.normalize();
  _up.copy(WORLD_UP).addScaledVector(_view, -WORLD_UP.dot(_view));
  if (_up.lengthSq() < 1e-4) {
    _up.copy(camera.up).addScaledVector(_view, -camera.up.dot(_view));
    if (_up.lengthSq() < 1e-6) _up.set(0, 1, 0);
  }
  camera.up.copy(_up.normalize());
  camera.lookAt(focus);
}
