"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cosmos, cosmosById } from "@/lib/catalog";
import { LY_M } from "@/lib/constants";
import { toVisualRadius, visualToMeters, warpMeters } from "@/lib/coords";
import { buildFilaments } from "@/lib/decor";
import { trueMeters, visualBodyRadius, visualOf } from "@/lib/positions";
import { selectObject, sim } from "@/lib/sim";
import { radialTexture } from "@/components/radial-texture";
import { Line } from "@react-three/drei";
import type { Vec } from "@/lib/types";

function noRaycast() {
  return;
}

function warpSphere(center: Vec, radiusM: number, width = 48, height = 32) {
  const geo = new THREE.SphereGeometry(1, width, height);
  const pos = geo.attributes.position;
  const dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 1) {
    dir.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    const w = warpMeters({
      x: center.x + dir.x * radiusM,
      y: center.y + dir.y * radiusM,
      z: center.z + dir.z * radiusM,
    });
    pos.setXYZ(i, w.x, w.y, w.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}


export function CosmosMeshes() {
  const sunGlow = useMemo(
    () =>
      radialTexture([
        [0, "rgba(255,220,170,0.9)"],
        [1, "rgba(255,180,80,0)"],
      ]),
    [],
  );
  const shell = useMemo(() => {
    const dark = cosmosById.get("donkere-materie");
    const laniakea = cosmosById.get("laniakea");
    const darkGeo =
      dark?.radius_ly != null
        ? warpSphere(trueMeters("donkere-materie", sim.jd), dark.radius_ly * LY_M, 42, 28)
        : null;
    const laniakeaGeo =
      laniakea?.radius_ly != null
        ? warpSphere(trueMeters("laniakea", sim.jd), laniakea.radius_ly * LY_M, 36, 24)
        : null;
    const cmbR = toVisualRadius(4.65e10 * LY_M);
    const energyR = toVisualRadius(3e10 * LY_M);
    const laniakeaEdges = laniakeaGeo ? new THREE.EdgesGeometry(laniakeaGeo) : null;
    return { darkGeo, laniakeaEdges, cmbR, energyR };
  }, []);
  const threads = useMemo(() => buildFilaments(), []);
  const cmb = useRef<THREE.Mesh>(null);
  // De achtergrondstraling ligt om alles heen, maar is geen licht dat je ziet. Ze komt op
  // naarmate je naar de rand vliegt, anders kleurt ze de hele hemel vanuit het zonnestelsel.
  const web = useRef<THREE.Group>(null);
  const edges = useRef<THREE.LineSegments>(null);
  useFrame((state) => {
    const m = cmb.current?.material as THREE.MeshBasicMaterial | undefined;
    if (m) {
      const t = THREE.MathUtils.smoothstep(state.camera.position.length() / shell.cmbR, 0.7, 0.93);
      m.opacity = 0.42 * t;
      m.visible = t > 0.001;
    }
    // Het web en de rand van Laniakea zijn lijnen op megaparsecschaal. Vanuit het
    // zonnestelsel snijden ze als raster door de hemel, zonder label; ze komen op
    // zodra je ver genoeg weg bent om ze als structuur te zien.
    const ly = visualToMeters(state.camera.position.length()) / LY_M;
    const s = THREE.MathUtils.smoothstep(Math.log10(Math.max(ly, 1e-9)), 3, 5);
    for (const child of web.current?.children ?? []) {
      const lm = (child as THREE.Mesh).material as THREE.Material & { opacity: number };
      lm.opacity = 0.45 * s;
      child.visible = s > 0.001;
    }
    const em = edges.current?.material as THREE.LineBasicMaterial | undefined;
    if (em && edges.current) {
      em.opacity = 0.35 * s;
      edges.current.visible = s > 0.001;
    }
  });
  const galaxies = cosmos.filter((c) => c.kind === "stelsel" && c.id !== "melkweg");
  const clusters = cosmos.filter((c) => c.kind === "cluster" || c.id === "grote-aantrekker");

  return (
    <>
      {shell.darkGeo ? (
        <mesh geometry={shell.darkGeo} raycast={noRaycast}>
          <meshBasicMaterial
            color="#6d62e6"
            transparent
            opacity={0.045}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ) : null}
      {shell.laniakeaEdges ? (
        <lineSegments ref={edges} geometry={shell.laniakeaEdges} raycast={noRaycast}>
          <lineBasicMaterial color="#f0c27a" transparent opacity={0.35} />
        </lineSegments>
      ) : null}
      <mesh raycast={noRaycast}>
        <sphereGeometry args={[shell.energyR, 48, 32]} />
        <meshBasicMaterial
          color="#b9a6ff"
          transparent
          opacity={0.035}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={cmb} raycast={noRaycast}>
        <sphereGeometry args={[shell.cmbR, 64, 48]} />
        <meshBasicMaterial
          color="#e4c7a2"
          side={THREE.BackSide}
          transparent
          opacity={0.42}
        />
      </mesh>
      <group ref={web}>
        {threads.map((points, i) => (
          <Line
            key={i}
            points={points}
            color="#9eb0ff"
            transparent
            opacity={0.45}
            lineWidth={1}
          />
        ))}
      </group>
      {galaxies.map((g) => {
        const p = visualOf(g.id, sim.jd);
        const r = Math.max(0.8, visualBodyRadius(g.id, sim.jd));
        return (
          <mesh key={g.id} position={[p.x, p.y, p.z]} scale={[1, 1, 0.28]} onClick={clickable(g.id)}>
            <sphereGeometry args={[r, 28, 16]} />
            <meshBasicMaterial color={g.color} transparent opacity={0.9} />
          </mesh>
        );
      })}
      {clusters.map((g) => {
        const p = visualOf(g.id, sim.jd);
        const r = Math.max(1.2, visualBodyRadius(g.id, sim.jd) * 0.35);
        return (
          <mesh key={g.id} position={[p.x, p.y, p.z]} onClick={clickable(g.id)}>
            <sphereGeometry args={[r, 20, 14]} />
            <meshBasicMaterial color={g.color} transparent opacity={0.75} />
          </mesh>
        );
      })}
      <Marker id="sagittarius-a" color="#ffb15a" size={1.15} />
      <Marker id="sagittarius-a-binnenste" color="#e4c6ff" size={0.42} />
      <SunGlow map={sunGlow} />
    </>
  );
}

function clickable(id: string) {
  return (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    if (sim.suppressClick) return;
    selectObject(id);
  };
}

function Marker({
  id,
  color,
  size,
}: {
  id: string;
  color: string;
  size: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = visualOf(id, sim.jd);
    ref.current?.position.set(p.x, p.y, p.z);
  });
  return (
    <mesh ref={ref} onClick={clickable(id)}>
      <sphereGeometry args={[size, 24, 16]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function SunGlow({ map }: { map: THREE.Texture }) {
  return (
    <sprite position={[0, 0, 0]} scale={[0.05, 0.05, 1]}>
      <spriteMaterial map={map} transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
    </sprite>
  );
}
