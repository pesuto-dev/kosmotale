"use client";

import * as THREE from "three";
import { getObject } from "@/lib/catalog";
import { AU_M, LY_M } from "@/lib/constants";
import { toVisualRadius } from "@/lib/coords";
import { unwarpVisual, warpMeters } from "@/lib/coords";
import { visualBodyRadius, visualOf } from "@/lib/positions";
import type { Vec } from "@/lib/types";

export const _forward = new THREE.Vector3();
export const _right = new THREE.Vector3();
export const _up = new THREE.Vector3();
export const _z = new THREE.Vector3();
export const _look = new THREE.Vector3();
export const _proj = new THREE.Vector3();
export const _tmp = new THREE.Vector3();

export function toV3(v: Vec, out = new THREE.Vector3()) {
  return out.set(v.x, v.y, v.z);
}

export function yawPitchFromDir(dir: THREE.Vector3) {
  const yaw = Math.atan2(dir.y, dir.x);
  const pitch = Math.asin(THREE.MathUtils.clamp(dir.z / (dir.length() || 1), -1, 1));
  return { yaw, pitch };
}

export function shortest(a: number, b: number) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d;
}

export type Flight = {
  from: THREE.Vector3;
  to: THREE.Vector3;
  sy: number;
  sp: number;
  ey: number;
  ep: number;
  t: number;
  dur: number;
};

export function approach(id: string, from: THREE.Vector3, jd: number) {
  const obj = getObject(id);
  const target = toV3(visualOf(id, jd));
  const look = target.clone();
  if (!obj) return { pos: from.clone(), look };

  if (id === "cmb" || id === "rand" || id === "donkere-energie") {
    const ly = id === "donkere-energie" ? 2.2e10 : 4.65e10;
    const R = toVisualRadius(ly * LY_M);
    const dir =
      id === "rand"
        ? new THREE.Vector3(0.2, 0.9, 0.15).normalize()
        : id === "donkere-energie"
          ? new THREE.Vector3(-0.3, 0.2, 0.9).normalize()
          : new THREE.Vector3(0.55, -0.25, 0.25).normalize();
    // Dicht bij de schil. Een kleiner deel van de visuele straal blijft,
    // door de logschaal, nog binnen de Melkweg.
    const pos = dir.clone().multiplyScalar(R * 0.972);
    return { pos, look: dir.multiplyScalar(R * 0.998) };
  }
  if (id === "oortwolk") {
    const R = toVisualRadius(25000 * AU_M);
    const pos = new THREE.Vector3(R * 0.25, -R * 0.18, R * 0.12);
    return { pos, look: new THREE.Vector3(R, 0, 0) };
  }
  if (id === "melkweg" || id === "donkere-materie") {
    const gc = toV3(visualOf("sagittarius-a", jd));
    const pos = gc.clone().multiplyScalar(0.12).add(new THREE.Vector3(0, -18, 26));
    return { pos, look: gc };
  }
  if (id === "laniakea" || id === "kosmisch-web") {
    const dir = target.clone();
    if (dir.lengthSq() < 1) dir.set(0.35, 0.85, 0.25);
    const reach = Math.max(dir.length(), 1);
    dir.normalize();
    // Niet bodyR gebruiken: die schil omvat de zon, en * 1,8 trekt de camera
    // terug het zonnestelsel in.
    const frac = id === "kosmisch-web" ? 0.8 : 0.93;
    const pos = dir.clone().multiplyScalar(Math.max(160, reach * frac));
    const side = new THREE.Vector3(-dir.y, dir.x, 0.2).normalize();
    pos.addScaledVector(side, 6);
    return { pos, look: target.lengthSq() > 1 ? target : pos.clone().add(dir) };
  }

  const away = from.clone().sub(target);
  if (away.lengthSq() < 1e-10) away.set(0.4, -0.3, 0.2);
  away.normalize();
  const bodyR = visualBodyRadius(id, jd);
  let stop = Math.max(bodyR * 7, 0.00018);
  if (obj.kind === "maan") stop = Math.max(bodyR * 14, 3e-6);
  if (obj.kind === "ringen") stop = Math.max(bodyR * 3.4, 0.0022);
  if (obj.kind === "ster") stop = 0.55;
  if (obj.kind === "zon") stop = Math.max(bodyR * 10, 0.04);
  if (obj.kind === "stelsel" || obj.kind === "cluster") stop = Math.max(bodyR * 3.2, 4);
  if (obj.kind === "structuur" || obj.kind === "zwart-gat") stop = Math.max(bodyR * 4, 2.2);
  if (obj.kind === "gordel") stop = Math.max(8, bodyR);
  return { pos: target.clone().add(away.multiplyScalar(stop)), look };
}

export function translateTrue(visual: THREE.Vector3, dir: THREE.Vector3, meters: number) {
  if (meters <= 0) return;
  const origin = unwarpVisual({ x: visual.x, y: visual.y, z: visual.z });
  const probe = Math.max(1e-6, visual.length() * 1e-5);
  const ahead = unwarpVisual({
    x: visual.x + dir.x * probe,
    y: visual.y + dir.y * probe,
    z: visual.z + dir.z * probe,
  });
  let dx = ahead.x - origin.x;
  let dy = ahead.y - origin.y;
  let dz = ahead.z - origin.z;
  let len = Math.hypot(dx, dy, dz);
  if (len < 1e-3) {
    dx = dir.x;
    dy = dir.y;
    dz = dir.z;
    len = Math.hypot(dx, dy, dz) || 1;
  }
  const k = meters / len;
  const next = warpMeters({
    x: origin.x + dx * k,
    y: origin.y + dy * k,
    z: origin.z + dz * k,
  });
  visual.set(next.x, next.y, next.z);
}

export function applyLook(camera: THREE.PerspectiveCamera, yaw: number, pitch: number) {
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  _look.set(cp * Math.cos(yaw), cp * Math.sin(yaw), sp);
  camera.up.set(0, 0, 1);
  camera.lookAt(camera.position.x + _look.x, camera.position.y + _look.y, camera.position.z + _look.z);
}
