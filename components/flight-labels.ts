"use client";

import * as THREE from "three";
import { cosmosById, getObject, objects } from "@/lib/catalog";
import { AU_M, LINEAR_AU, LY_M } from "@/lib/constants";
import { toVisualRadius, unwarpVisual, visualToMeters } from "@/lib/coords";
import { publishFrame } from "@/lib/frame";
import { formatDistance, formatSize } from "@/lib/format";
import { copy } from "@/lib/messages";
import { objectName, objectSizeNote } from "@/lib/present";
import { realmForDistance, sunDistanceM, trueMeters, visualBodyRadius, visualOf } from "@/lib/positions";
import { SATURN_RING_ID, SATURN_RINGS_KM } from "@/lib/rings";
import { speedPhrase } from "@/lib/motion";
import { flightMetersPerSecond, sim } from "@/lib/sim";
import { _forward, _proj, _right, _tmp, _up, _z, toV3 } from "@/components/flight-math";

export function labelWorthy(id: string, trueM: number, selected: boolean, hover: boolean) {
  if (selected || hover) return true;
  const obj = getObject(id);
  if (!obj) return false;
  const au = trueM / AU_M;
  const ly = trueM / LY_M;
  if (obj.kind === "ster") return false;
  if (
    obj.kind === "zon" ||
    obj.kind === "planeet" ||
    obj.kind === "maan" ||
    obj.kind === "dwergplaneet" ||
    obj.kind === "ringen"
  ) {
    return au < 400;
  }
  if (id === "planetoidengordel" || id === "kuipergordel") return au < 180;
  if (id === "oortwolk") return au > 80 && ly < 8;
  if (id === "sagittarius-a" || id === "sagittarius-a-binnenste" || id === "donkere-materie") {
    return ly > 8 && ly < 8e6;
  }
  if (id === "melkweg") return ly > 20 && ly < 2e7;
  if (obj.kind === "stelsel") return ly > 80 && ly < 4e7;
  if (obj.realms.includes("supercluster")) return ly > 2e5 && ly < 8e9;
  if (obj.realms.includes("heelal")) return ly > 3e6;
  return false;
}

export function publishLabels(camera: THREE.PerspectiveCamera, width: number, height: number) {
  camera.updateMatrixWorld();
  camera.matrixWorld.extractBasis(_right, _up, _z);
  _forward.copy(_z).multiplyScalar(-1);
  const trueM = visualToMeters(camera.position.length());
  const realm = realmForDistance(trueM);
  const compressed = trueM > LINEAR_AU * AU_M;
  const jd = sim.jd;
  const selected = sim.selectedId;
  const hover = sim.hoverId;

  type Candidate = {
    id: string;
    x: number;
    y: number;
    priority: number;
    name: string;
    evidence: "waargenomen" | "model";
    detail: string;
  };
  const candidates: Candidate[] = [];

  for (const obj of objects) {
    const isHover = hover === obj.id;
    const isSel = selected === obj.id;
    let show = labelWorthy(obj.id, trueM, isSel, isHover);
    if (obj.kind === "ster") {
      const v = visualOf(obj.id, jd);
      _tmp.set(v.x, v.y, v.z);
      const d = camera.position.distanceTo(_tmp);
      const bright = (obj.mag ?? 9) <= 1.2 && trueM / LY_M < 30;
      show = isSel || isHover || d < 20 || bright;
    }
    if (!show) continue;
    const anchor = labelAnchor(obj.id, camera.position, _forward, _right, jd);
    _proj.copy(anchor);
    const to = _tmp.copy(anchor).sub(camera.position);
    if (to.dot(_forward) <= 0.2) continue;
    _proj.project(camera);
    if (_proj.z > 1) continue;
    const x = (_proj.x * 0.5 + 0.5) * width;
    const y = (-_proj.y * 0.5 + 0.5) * height;
    if (x < -80 || y < -40 || x > width + 80 || y > height + 40) continue;
    const m = copy();
    const dist = obj.id === "zon" ? m.center : formatDistance(sunDistanceM(obj.id, jd));
    const evidence = obj.evidence === "model" ? m.model : m.observed;
    let priority = 30;
    if (isSel) priority = 100;
    else if (isHover) priority = 90;
    else if (obj.kind === "ringen") priority = 72;
    else if (obj.kind === "zon" || obj.kind === "planeet") priority = 70;
    else if (obj.kind === "maan" || obj.kind === "dwergplaneet") priority = 64;
    else if (obj.kind !== "ster") priority = 58;
    else priority = 40 - (obj.mag ?? 4);
    candidates.push({
      id: obj.id,
      x,
      y,
      priority,
      name: objectName(obj),
      evidence: obj.evidence,
      detail: m.labelDetail(evidence, dist, formatSize(obj.radiusM, objectSizeNote(obj)), speedPhrase(obj.id, jd)),
    });
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const kept: Candidate[] = [];
  for (const c of candidates) {
    if (kept.length >= 36 && c.priority < 95) break;
    const crowded = kept.some((k) => (k.x - c.x) ** 2 + (k.y - c.y) ** 2 < 28 * 28);
    if (crowded && c.priority < 95) continue;
    kept.push(c);
  }

  publishFrame({
    labels: kept.map((c) => ({
      id: c.id,
      name: c.name,
      evidence: c.evidence,
      x: c.x,
      y: c.y,
      detail: c.detail,
      selected: c.id === selected,
    })),
    trueM,
    realm,
    compressed,
    flightFactor: sim.flightFactor,
    boost: sim.keys.boost,
    speedMps: flightMetersPerSecond(),
    viewW: width,
    viewH: height,
    scaleDepthM: nearestWorldM(camera.position, jd),
    camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
  });
}

export function nearestWorldM(visual: THREE.Vector3, jd: number) {
  const origin = unwarpVisual({ x: visual.x, y: visual.y, z: visual.z });
  let best = Math.hypot(origin.x, origin.y, origin.z);
  for (const obj of objects) {
    if (
      obj.kind !== "zon" &&
      obj.kind !== "planeet" &&
      obj.kind !== "maan" &&
      obj.kind !== "dwergplaneet" &&
      obj.kind !== "ringen"
    ) {
      continue;
    }
    const p = trueMeters(obj.id, jd);
    const d = Math.hypot(origin.x - p.x, origin.y - p.y, origin.z - p.z);
    if (d < best) best = d;
  }
  return Math.max(best, 5e5);
}

export function labelAnchor(
  id: string,
  cam: THREE.Vector3,
  forward: THREE.Vector3,
  right: THREE.Vector3,
  jd: number,
) {
  const base = toV3(visualOf(id, jd));
  if (id === SATURN_RING_ID) {
    const edge = (SATURN_RINGS_KM.aOuter * 1000) / AU_M;
    return base.add(right.clone().multiplyScalar(edge));
  }
  const c = cosmosById.get(id);
  if (c?.place === "ring") {
    const flat = cam.clone();
    flat.z *= 0.15;
    if (flat.length() < 0.15) flat.set(1, 0.2, 0);
    return flat.normalize().multiplyScalar(c.au ?? 2.7);
  }
  if (id === "oortwolk" || id === "cmb" || id === "rand" || id === "donkere-energie") {
    const R =
      id === "oortwolk"
        ? toVisualRadius(40000 * AU_M)
        : id === "donkere-energie"
          ? toVisualRadius(2.5e10 * LY_M)
          : toVisualRadius(4.65e10 * LY_M);
    if (cam.length() < R * 0.98) {
      const dir =
        id === "rand"
          ? right.clone()
          : id === "donkere-energie"
            ? forward.clone().add(new THREE.Vector3(0, 0, 0.55)).normalize()
            : forward.clone();
      const dist = THREE.MathUtils.clamp((R - cam.length()) * 0.18, 7, 42);
      return cam.clone().add(dir.multiplyScalar(dist));
    }
  }
  if (c?.place === "shell-at" && c.radius_ly) {
    const radius = visualBodyRadius(id, jd);
    const from = cam.clone().sub(base);
    if (from.length() < radius * 1.15) {
      if (from.length() < 0.2) from.copy(forward);
      return cam.clone().add(from.normalize().multiplyScalar(Math.min(30, Math.max(8, radius * 0.12))));
    }
  }
  return base;
}
