"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { visualOf } from "@/lib/positions";
import { flightMetersPerSecond, setFlightFactor, sim } from "@/lib/sim";
import {
  _forward,
  _right,
  _tmp,
  _up,
  _z,
  applyLook,
  approach,
  shortest,
  toV3,
  translateTrue,
  yawPitchFromDir,
  type Flight,
} from "@/components/flight-math";
import { publishLabels } from "@/components/flight-labels";

export function FlightRig() {
  const { gl } = useThree();
  const yaw = useRef(0.6);
  const pitch = useRef(0.35);
  const flight = useRef<Flight | null>(null);
  const seenNonce = useRef(0);
  const booted = useRef(false);
  const lastPublish = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(0);

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
        flight.current = null;
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
        yaw.current -= e.movementX * 0.0045;
        pitch.current = THREE.MathUtils.clamp(
          pitch.current - e.movementY * 0.0045,
          -1.35,
          1.35,
        );
        flight.current = null;
        sim.suppressClick = true;
      }
    };
    const onPointerUp = () => {
      dragging.current = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      setFlightFactor(sim.flightFactor * factor);
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
  }, [gl]);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const stepDt = Math.min(0.12, dt);
    if (!booted.current) {
      const earth = toV3(visualOf("aarde", sim.jd));
      cam.position.set(earth.x + 0.0015, earth.y - 0.0021, earth.z + 0.0011);
      cam.up.set(0, 0, 1);
      const dir = earth.clone().sub(cam.position);
      const yp = yawPitchFromDir(dir);
      yaw.current = yp.yaw;
      pitch.current = yp.pitch;
      booted.current = true;
      seenNonce.current = sim.flyNonce;
    }

    const moving =
      sim.keys.forward ||
      sim.keys.back ||
      sim.keys.left ||
      sim.keys.right ||
      sim.keys.up ||
      sim.keys.down;
    if (moving) flight.current = null;

    if (sim.flyNonce !== seenNonce.current && sim.selectedId) {
      seenNonce.current = sim.flyNonce;
      const dest = approach(sim.selectedId, cam.position, sim.jd);
      const dir = dest.look.clone().sub(dest.pos);
      const yp = yawPitchFromDir(dir);
      const dist = cam.position.distanceTo(dest.pos);
      flight.current = {
        from: cam.position.clone(),
        to: dest.pos,
        sy: yaw.current,
        sp: pitch.current,
        ey: yp.yaw,
        ep: yp.pitch,
        t: 0,
        dur: THREE.MathUtils.clamp(1.15 + Math.log10(dist + 1.2) * 1.55, 1.25, 8.5),
      };
    }

    const fly = flight.current;
    if (fly) {
      fly.t += Math.min(dt, 0.5) / fly.dur;
      const t = THREE.MathUtils.clamp(fly.t, 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      cam.position.lerpVectors(fly.from, fly.to, e);
      yaw.current = fly.sy + (shortest(fly.sy, fly.ey) - fly.sy) * e;
      pitch.current = fly.sp + (fly.ep - fly.sp) * e;
      if (t >= 1) flight.current = null;
    } else {
      applyLook(cam, yaw.current, pitch.current);
      if (moving) {
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
    }

    applyLook(cam, yaw.current, pitch.current);
    const solar = Math.max(1e-4, cam.position.length());
    let nearest = solar;
    for (const id of ["zon", "aarde", "maan", "jupiter", "saturnus", "mars", "venus"]) {
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
