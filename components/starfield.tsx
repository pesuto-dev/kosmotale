"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { stars } from "@/lib/catalog";
import { visualOf } from "@/lib/positions";
import { selectObject, sim } from "@/lib/sim";
import { softPointsMaterial } from "@/components/point-material";

export function Starfield() {
  const geom = useMemo(() => {
    const positions = new Float32Array(stars.length * 3);
    const colors = new Float32Array(stars.length * 3);
    const maxPx = new Float32Array(stars.length);
    const color = new THREE.Color();
    stars.forEach((star, i) => {
      const p = visualOf(`hip-${star.hip}`, sim.jd);
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      color.set(spectralFrom(star.spect));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      maxPx[i] = THREE.MathUtils.clamp(3.4 - 0.55 * star.mag, 1.3, 4.5);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.setAttribute("aMax", new THREE.BufferAttribute(maxPx, 1));
    return g;
  }, []);
  const mat = useMemo(
    () => softPointsMaterial({ size: 90, maxPx: 4.5, opacity: 0.95, vertexColors: true, perPointMax: true, core: 0.25 }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);

  return (
    <points
      geometry={geom}
      onClick={(event) => {
        event.stopPropagation();
        if (sim.suppressClick) return;
        const index = event.index;
        if (index == null) return;
        const star = stars[index];
        if (star) selectObject(`hip-${star.hip}`);
      }}
      onPointerMove={(event) => {
        const index = event.index;
        if (index == null) return;
        const star = stars[index];
        sim.hoverId = star ? `hip-${star.hip}` : null;
      }}
      onPointerOut={() => {
        sim.hoverId = null;
      }}
    >
      <primitive object={mat} attach="material" />
    </points>
  );
}

function spectralFrom(spect: string) {
  const c = spect.trim()[0]?.toUpperCase();
  switch (c) {
    case "O":
    case "B":
      return "#b9cdff";
    case "A":
      return "#e4ecff";
    case "F":
      return "#fff6ea";
    case "G":
      return "#ffd7a1";
    case "K":
      return "#ffb36a";
    case "M":
      return "#ff8d66";
    default:
      return "#ffe7cc";
  }
}
