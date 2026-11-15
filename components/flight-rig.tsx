"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { visualBodyRadius, visualOf } from "@/lib/positions";
import { canTopDown, flightMetersPerSecond, setFlightFactor, setTopDown, sim } from "@/lib/sim";
import {
  _forward,
  _right,
  _tmp,
  _up,
  _z,
  applyLook,
  approach,
  framedBodyDistance,
  shortest,
  toV3,
  translateTrue,
  yawPitchFromDir,
  type Flight,
} from "@/components/flight-math";
import { publishLabels } from "@/components/flight-labels";
import {
  ECLIPTIC_NORTH,
  ECLIPTIC_UP,
  applyTopDelta,
  arrivalOffset,
  attachFollow,
  captureTopPose,
  followable,
  lookAtFocus,
  nudgeOffset,
  orbitActive,
  orbitLimits,
  placeTopCamera,
  takeOrbitInput,
  topDownDistance,
  topDownFocus,
  type OrbitDelta,
  type TopDownFrame,
  type TopPose,
} from "@/components/orbit-camera";

const _focus = new THREE.Vector3();
const _goal = new THREE.Vector3();

type Ride = Flight & {
  id: string;
  /** Aankomstpositie ten opzichte van de wereld; volgt de wereld als de klok loopt. */
  offset: THREE.Vector3 | null;
};

export function FlightRig() {
  const { gl } = useThree();
  const yaw = useRef(0.6);
  const pitch = useRef(0.35);
  const flight = useRef<Ride | null>(null);
  /** Na een nadering: blijf op deze afstand bij de wereld tot de gebruiker zelf stuurt. */
  const follow = useRef<{ id: string; offset: THREE.Vector3 } | null>(null);
  const topFrame = useRef<TopDownFrame | null>(null);
  const topPose = useRef<TopPose>({ id: "", hold: false, azimuth: 0, polar: 0, radius: 0 });
  const orbitInput = useRef<OrbitDelta>({ az: 0, polar: 0, zoom: 1 });
  const wasFree = useRef(false);
  const wasTop = useRef(false);
  const seenNonce = useRef(0);
  const booted = useRef(false);
  const lastPublish = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(0);

  /** Los navigeren: een sleep of toets laat de nadering, het volgen en het bovenaanzicht los. */
  const steer = useCallback(() => {
    flight.current = null;
    follow.current = null;
    if (sim.topDown) setTopDown(false);
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    const isTyping = () => {
      const tag = document.activeElement?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA";
    };
    const down = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const map: Record<string, keyof typeof sim.keys> = {
        KeyW: "forward",
        ArrowUp: "forward",
        KeyS: "back",
        ArrowDown: "back",
        KeyA: "left",
        ArrowLeft: "left",
        KeyD: "right",
        ArrowRight: "right",
        KeyE: "up",
        KeyQ: "down",
      };
      const slot = map[e.code];
      if (slot) {
        sim.keys[slot] = true;
        if (sim.freeNav) steer();
        e.preventDefault();
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sim.keys.boost = true;
      if (e.code === "Space") {
        sim.playing = !sim.playing;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const map: Record<string, keyof typeof sim.keys> = {
        KeyW: "forward",
        ArrowUp: "forward",
        KeyS: "back",
        ArrowDown: "back",
        KeyA: "left",
        ArrowLeft: "left",
        KeyD: "right",
        ArrowRight: "right",
        KeyE: "up",
        KeyQ: "down",
      };
      const slot = map[e.code];
      if (slot) sim.keys[slot] = false;
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sim.keys.boost = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      moved.current = 0;
      sim.suppressClick = false;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      moved.current += Math.abs(e.movementX) + Math.abs(e.movementY);
      if (moved.current > 4) {
        if (sim.freeNav) {
          yaw.current -= e.movementX * 0.0045;
          pitch.current = THREE.MathUtils.clamp(
            pitch.current - e.movementY * 0.0045,
            -1.35,
            1.35,
          );
          steer();
        } else {
          // Slepen draait om de focus. Naar rechts is negatief, omlaag tilt naar de pool.
          orbitInput.current.az -= e.movementX * 0.0045;
          orbitInput.current.polar -= e.movementY * 0.0045;
        }
        sim.suppressClick = true;
      }
    };
    const onPointerUp = () => {
      dragging.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (sim.freeNav) {
        setFlightFactor(sim.flightFactor * Math.exp(-e.deltaY * 0.0015));
        return;
      }
      // Omlaag scrollen vergroot de afstand tot de focus.
      orbitInput.current.zoom *= Math.exp(e.deltaY * 0.0012);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    el.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl, steer]);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const stepDt = Math.min(0.12, dt);
    if (!booted.current) {
      const earth = toV3(visualOf("aarde", sim.jd));
      const dist = framedBodyDistance(visualBodyRadius("aarde", sim.jd), cam.aspect);
      cam.position.copy(earth).addScaledVector(_goal.set(0.45, -0.78, 0.42).normalize(), dist);
      cam.up.set(0, 0, 1);
      const dir = earth.clone().sub(cam.position);
      const yp = yawPitchFromDir(dir);
      yaw.current = yp.yaw;
      pitch.current = yp.pitch;
      booted.current = true;
      seenNonce.current = sim.flyNonce;
      // Bij de start hang je al vlak bij de aarde; blijf erbij als de klok gaat lopen.
      follow.current = { id: "aarde", offset: cam.position.clone().sub(earth) };
    }

    const moving =
      sim.keys.forward ||
      sim.keys.back ||
      sim.keys.left ||
      sim.keys.right ||
      sim.keys.up ||
      sim.keys.down;
    if (moving && sim.freeNav) steer();

    const topDown = sim.topDown && sim.selectedId != null && canTopDown(sim.selectedId);

    if (sim.flyNonce !== seenNonce.current && sim.selectedId) {
      seenNonce.current = sim.flyNonce;
      follow.current = null;
      // In bovenaanzicht geen nadering: de camera herkadert op de nieuwe baan.
      if (topDown) {
        topPose.current.hold = false;
        topPose.current.azimuth = 0;
        topPose.current.polar = 0;
        topPose.current.id = sim.selectedId;
      } else {
        const dest = approach(sim.selectedId, cam.position, sim.jd, cam.aspect);
        const dir = dest.look.clone().sub(dest.pos);
        const yp = yawPitchFromDir(dir);
        const dist = cam.position.distanceTo(dest.pos);
        const offset = followable(sim.selectedId)
          ? dest.pos.clone().sub(toV3(visualOf(sim.selectedId, sim.jd)))
          : null;
        flight.current = {
          id: sim.selectedId,
          from: cam.position.clone(),
          to: dest.pos,
          offset,
          sy: yaw.current,
          sp: pitch.current,
          ey: yp.yaw,
          ep: yp.pitch,
          t: 0,
          dur: THREE.MathUtils.clamp(1.15 + Math.log10(dist + 1.2) * 1.55, 1.25, 8.5),
        };
      }
    }

    // Los navigeren laat het volgen los. Uitzetten haakt de camera weer aan de selectie.
    if (sim.freeNav && !wasFree.current) {
      follow.current = null;
      flight.current = null;
      topPose.current.hold = false;
    }
    if (!sim.freeNav && wasFree.current && !topDown && sim.selectedId) {
      follow.current = attachFollow(cam, sim.selectedId, sim.jd);
    }
    wasFree.current = sim.freeNav;
    if (wasTop.current && !topDown && !sim.freeNav && sim.selectedId) {
      follow.current = attachFollow(cam, sim.selectedId, sim.jd);
      topPose.current.hold = false;
    }
    wasTop.current = topDown;

    const input = takeOrbitInput(orbitInput.current, stepDt);
    const turning = !sim.freeNav && orbitActive(input) && sim.selectedId != null;
    if (turning && sim.selectedId && !topDown) {
      flight.current = null;
      if (!follow.current || follow.current.id !== sim.selectedId) {
        follow.current = attachFollow(cam, sim.selectedId, sim.jd);
      }
      const limits = orbitLimits(sim.selectedId, sim.jd, null);
      nudgeOffset(follow.current.offset, input, limits.minR, limits.maxR);
    }

    if (topDown && sim.selectedId) {
      flight.current = null;
      follow.current = null;
      // Focus is de zon, of de moederplaneet bij een maan. Zonder eigen draai
      // blijft de camera recht erboven, op de afstand waarop de baan in beeld past.
      const frame = topDownFocus(sim.selectedId, sim.jd, topFrame.current, _focus);
      topFrame.current = frame;
      const dist = topDownDistance(frame.radius, cam.aspect);
      const pose = topPose.current;
      if (pose.id !== sim.selectedId) {
        pose.id = sim.selectedId;
        pose.hold = false;
        pose.azimuth = 0;
        pose.polar = 0;
      }
      if (turning && pose.id === sim.selectedId) {
        if (!pose.hold) captureTopPose(cam, _focus, pose);
        const limits = orbitLimits(sim.selectedId, sim.jd, dist);
        applyTopDelta(pose, input, limits.minR, limits.maxR);
      }
      if (pose.hold) {
        placeTopCamera(cam, _focus, pose);
      } else {
        _goal.copy(_focus).addScaledVector(ECLIPTIC_NORTH, dist);
        if (cam.position.distanceTo(_goal) < dist * 1e-4) cam.position.copy(_goal);
        else cam.position.lerp(_goal, 1 - Math.exp(-stepDt * 3.5));
        cam.up.copy(ECLIPTIC_UP);
        cam.lookAt(_focus);
      }
      // Houd yaw/pitch bij, zodat los navigeren zonder sprong verdergaat.
      const yp = yawPitchFromDir(_tmp.copy(_focus).sub(cam.position));
      yaw.current = yp.yaw;
      pitch.current = yp.pitch;
    } else {
      const fly = flight.current;
      if (fly) {
        fly.t += Math.min(dt, 0.5) / fly.dur;
        const t = THREE.MathUtils.clamp(fly.t, 0, 1);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        // De wereld beweegt met de klok; het doel schuift mee.
        if (fly.offset) fly.to.copy(toV3(visualOf(fly.id, sim.jd), _tmp)).add(fly.offset);
        cam.position.lerpVectors(fly.from, fly.to, e);
        yaw.current = fly.sy + (shortest(fly.sy, fly.ey) - fly.sy) * e;
        pitch.current = fly.sp + (fly.ep - fly.sp) * e;
        if (t >= 1) {
          flight.current = null;
          follow.current = { id: fly.id, offset: arrivalOffset(fly.id, fly.offset, cam, sim.jd) };
        }
        applyLook(cam, yaw.current, pitch.current);
      } else if (follow.current && !sim.freeNav) {
        const f = follow.current;
        const body = toV3(visualOf(f.id, sim.jd), _focus);
        cam.position.copy(body).add(f.offset);
        lookAtFocus(cam, body);
        const yp = yawPitchFromDir(_tmp.copy(body).sub(cam.position));
        yaw.current = yp.yaw;
        pitch.current = yp.pitch;
      } else {
        applyLook(cam, yaw.current, pitch.current);
        if (moving && sim.freeNav) {
          cam.updateMatrixWorld();
          cam.matrixWorld.extractBasis(_right, _up, _z);
          _forward.copy(_z).multiplyScalar(-1);
          _tmp.set(0, 0, 0);
          if (sim.keys.forward) _tmp.add(_forward);
          if (sim.keys.back) _tmp.addScaledVector(_forward, -1);
          if (sim.keys.right) _tmp.add(_right);
          if (sim.keys.left) _tmp.addScaledVector(_right, -1);
          if (sim.keys.up) _tmp.z += 1;
          if (sim.keys.down) _tmp.z -= 1;
          if (_tmp.lengthSq() > 0) {
            _tmp.normalize();
            translateTrue(cam.position, _tmp, flightMetersPerSecond() * stepDt);
          }
        }
        applyLook(cam, yaw.current, pitch.current);
      }
    }

    const solar = Math.max(1e-4, cam.position.length());
    let nearest = solar;
    // De gevolgde of geselecteerde wereld telt mee, anders knipt het near-vlak hem weg.
    const nearIds = ["zon", "aarde", "maan", "jupiter", "saturnus", "mars", "venus"];
    const held = follow.current?.id ?? sim.selectedId;
    if (held && followable(held) && !nearIds.includes(held)) nearIds.push(held);
    for (const id of nearIds) {
      const p = visualOf(id, sim.jd);
      _tmp.set(p.x, p.y, p.z);
      nearest = Math.min(nearest, Math.max(1e-6, cam.position.distanceTo(_tmp)));
    }
    cam.near = THREE.MathUtils.clamp(nearest * 0.06, 1e-6, 0.05);
    cam.far = Math.max(2500, solar * 40);
    cam.updateProjectionMatrix();

    const now = performance.now();
    if (now - lastPublish.current > 70) {
      lastPublish.current = now;
      publishLabels(cam, state.size.width, state.size.height);
    }
  });

  return null;
}
