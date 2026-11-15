"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LY_M } from "@/lib/constants";
import { visualToMeters } from "@/lib/coords";
import { sim } from "@/lib/sim";
import { pointView } from "@/components/point-material";
import { skyMaterial } from "@/components/sky-material";

function noRaycast() {
  return;
}

/** 0 bij de zon, 1 zodra de lokale stijlhemel moet wijken voor het 3D-model. */
export const skyFade = { value: 0 };
/** In bovenaanzicht dooft de sterrenhemel tot dit deel, zodat de baan het beeld draagt. */
const TOP_DOWN_STARS = 0.2;
/** 1 in vrije vlucht, TOP_DOWN_STARS in bovenaanzicht; loopt mee met de camerazwaai. */
export const starDim = { value: 1 };

const SKY_BRIGHT = 1.15;

/**
 * Stijlhemel, geen sterrenkaart. Dooft uit tussen 60 en 4000 lichtjaar,
 * waar het 3D-model van de Melkweg het overneemt.
 */
export function Sky() {
  const mat = useMemo(() => skyMaterial(), []);
  const mesh = useRef<THREE.Mesh>(null);
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state, delta) => {
    pointView.halfHeight.value = state.size.height / 2;
    pointView.dpr.value = state.viewport.dpr;
    const ly = Math.max(1e-9, visualToMeters(state.camera.position.length()) / LY_M);
    const t = THREE.MathUtils.clamp((Math.log10(ly) - Math.log10(60)) / (Math.log10(4000) - Math.log10(60)), 0, 1);
    skyFade.value = t * t * (3 - 2 * t);
    // Bovenaanzicht dimt de sterren los van de afstandsfade; buiten bovenaanzicht is de factor 1.
    const target = sim.topDown ? TOP_DOWN_STARS : 1;
    starDim.value =
      Math.abs(target - starDim.value) < 1e-3
        ? target
        : starDim.value + (target - starDim.value) * (1 - Math.exp(-Math.min(delta, 0.1) * 6));
    const sky = mesh.current?.material as THREE.ShaderMaterial | undefined;
    if (sky) sky.uniforms.uBright.value = SKY_BRIGHT * (1 - skyFade.value) * starDim.value;
  });
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1000} frustumCulled={false} raycast={noRaycast}>
      <sphereGeometry args={[1, 192, 96]} />
    </mesh>
  );
}
