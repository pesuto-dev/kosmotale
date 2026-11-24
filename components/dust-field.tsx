"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { softPointsMaterial } from "@/components/point-material";
import { skyFade } from "@/components/sky-backdrop";
import { buildMilkyWay, buildOort, fillBelt } from "@/lib/decor";
import { sim } from "@/lib/sim";

function noRaycast() {
  return;
}

/** Het 3D-model van de Melkweg komt op zodra de SVS-hemel dooft. */
export function Dust() {
  const { positions, colors } = useMemo(() => buildMilkyWay(), []);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [positions, colors]);
  const mat = useMemo(
    () => softPointsMaterial({ size: 36, maxPx: 26, opacity: 0.55, vertexColors: true, core: 0 }),
    [],
  );
  const ref = useRef<THREE.Points>(null);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(() => {
    const m = ref.current?.material as THREE.ShaderMaterial | undefined;
    if (m) m.uniforms.uOpacity.value = 0.55 * (0.05 + 0.95 * skyFade.value);
  });
  return (
    <points ref={ref} geometry={geom} raycast={noRaycast}>
      <primitive object={mat} attach="material" />
    </points>
  );
}

export function Oort() {
  const positions = useMemo(() => buildOort(), []);
  const mat = useMemo(() => softPointsMaterial({ size: 14, maxPx: 5, opacity: 0.45, color: "#9eb4ce" }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [positions]);
  return (
    <points geometry={geom} raycast={noRaycast}>
      <primitive object={mat} attach="material" />
    </points>
  );
}

export function Belts() {
  const asteroids = useMemo(() => new Float32Array(700 * 3), []);
  const kuiper = useMemo(() => new Float32Array(900 * 3), []);
  const aRef = useRef<THREE.BufferAttribute>(null);
  const kRef = useRef<THREE.BufferAttribute>(null);
  const aMat = useMemo(() => softPointsMaterial({ size: 0.045, maxPx: 4, opacity: 0.9, color: "#b7aa96", core: 0.8 }), []);
  const kMat = useMemo(() => softPointsMaterial({ size: 0.12, maxPx: 4, opacity: 0.8, color: "#9eb0c4", core: 0.8 }), []);
  useEffect(
    () => () => {
      aMat.dispose();
      kMat.dispose();
    },
    [aMat, kMat],
  );
  useFrame(() => {
    fillBelt(asteroids, sim.jd, "planetoidengordel", 3);
    fillBelt(kuiper, sim.jd, "kuipergordel", 9);
    if (aRef.current) aRef.current.needsUpdate = true;
    if (kRef.current) kRef.current.needsUpdate = true;
  });
  return (
    <>
      <points raycast={noRaycast}>
        <bufferGeometry>
          <bufferAttribute ref={aRef} attach="attributes-position" args={[asteroids, 3]} />
        </bufferGeometry>
        <primitive object={aMat} attach="material" />
      </points>
      <points raycast={noRaycast}>
        <bufferGeometry>
          <bufferAttribute ref={kRef} attach="attributes-position" args={[kuiper, 3]} />
        </bufferGeometry>
        <primitive object={kMat} attach="material" />
      </points>
    </>
  );
}
