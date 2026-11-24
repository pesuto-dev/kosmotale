"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { moonById, moons, planets, pluto, sun } from "@/lib/catalog";
import { AU_KM, AU_M } from "@/lib/constants";
import { SATURN_RING_ID, SATURN_RINGS_KM } from "@/lib/rings";
import { FLATTENING, lockedFrame, poleOf, spinFrame, type BodyFrame } from "@/lib/rotation";
import {
  planetMaterial,
  ringMaterial,
  saturnRingTexture,
  sunMaterial,
  type PlanetLook,
} from "@/components/scene-materials";
import { Sky } from "@/components/sky-backdrop";
import { Starfield } from "@/components/starfield";
import { Belts, Dust, Oort } from "@/components/dust-field";
import { CosmosMeshes } from "@/components/cosmos-meshes";
import { radialTexture } from "@/components/radial-texture";
import { orbitVisual, visualOf } from "@/lib/positions";
import { canTopDown, getUiSnap, selectObject, sim, subscribeUi } from "@/lib/sim";

const AU = AU_M;

function noRaycast() {
  return;
}

function clickable(id: string) {
  return (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
    if (sim.suppressClick) return;
    selectObject(id);
  };
}


/** Hoe de bol eruitziet. Kaarten staan in public/textures; bronnen in de README. */
const LOOKS: Record<string, Omit<PlanetLook, "color">> = {
  mercurius: { map: "mercurius", regolith: 0.7 },
  venus: { map: "venus", atmo: "#f6dfae", atmoStrength: 0.45 },
  aarde: { map: "aarde-dag", earth: true, atmo: "#6fb2ff", atmoStrength: 1.1 },
  maan: { map: "maan", regolith: 0.85 },
  mars: { map: "mars", regolith: 0.4, atmo: "#e6a47c", atmoStrength: 0.25 },
  jupiter: { map: "jupiter", atmo: "#efe0c2", atmoStrength: 0.2 },
  saturnus: { map: "saturnus", atmo: "#f1e2bb", atmoStrength: 0.2 },
  uranus: { map: "uranus", atmo: "#c8f4f2", atmoStrength: 0.3 },
  neptunus: { map: "neptunus", atmo: "#86a6ff", atmoStrength: 0.35 },
  pluto: { map: "pluto", regolith: 0.6 },
  titan: { map: "titan", atmo: "#f0b25a", atmoStrength: 0.5 },
};

function lookFor(id: string, color: string): PlanetLook {
  const look = LOOKS[id] ?? (moons.some((m) => m.id === id) ? { map: id, regolith: 0.8 } : {});
  return { color, ...look };
}

const SATURN_POLE_V = (() => {
  const p = poleOf("saturnus");
  return p ? new THREE.Vector3(p.x, p.y, p.z) : new THREE.Vector3(0, 0, 1);
})();

const _m = new THREE.Matrix4();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _zAxis = new THREE.Vector3();

function orient(mesh: THREE.Object3D, frame: BodyFrame) {
  _x.set(frame.meridian.x, frame.meridian.y, frame.meridian.z);
  _y.set(frame.pole.x, frame.pole.y, frame.pole.z);
  _zAxis.crossVectors(_x, _y);
  _m.makeBasis(_x, _y, _zAxis);
  mesh.quaternion.setFromRotationMatrix(_m);
}




const ORBIT_IDS = [
  ...planets.map((p) => p.id),
  "pluto",
  ...moons.map((m) => m.id),
];

function Orbits() {
  const [stamp, setStamp] = useState(() => sim.jd);
  const epochRef = useRef(Math.floor(sim.jd / 30));
  // In bovenaanzicht licht de baan van de selectie op; dit volgt alleen UI-events, niet elk frame.
  const ui = useSyncExternalStore(subscribeUi, getUiSnap, getUiSnap);
  const highlight = ui.topDown ? ui.selectedId : null;
  useFrame(() => {
    const next = Math.floor(sim.jd / 30);
    if (next !== epochRef.current) {
      epochRef.current = next;
      setStamp(sim.jd);
    }
  });
  const lines = useMemo(
    () =>
      ORBIT_IDS.map((id) => {
        const pts = orbitVisual(id, stamp);
        // Een maanbaan hoort om de planeet van nú, niet die van de epoche: binnen de
        // lineaire zone is de warp lineair, dus de baan mag relatief aan de planeet.
        const parent = moonById.get(id)?.parent ?? null;
        const c = parent ? visualOf(parent, stamp) : { x: 0, y: 0, z: 0 };
        return {
          id,
          parent,
          points: pts.map((p) => [p.x - c.x, p.y - c.y, p.z - c.z] as [number, number, number]),
        };
      }),
    [stamp],
  );
  return (
    <>
      {lines.map((line) => {
        const isMoon = line.parent != null;
        const lit = line.id === highlight;
        const orbit = (
          <Line
            points={line.points}
            color={lit ? "#fff1c8" : isMoon ? "#d9d3c5" : "#f0d7a2"}
            transparent
            opacity={lit ? 0.9 : isMoon ? 0.22 : 0.28}
            lineWidth={lit ? 2 : 1}
          />
        );
        return line.parent ? (
          <AtBody key={line.id} id={line.parent}>
            {orbit}
          </AtBody>
        ) : (
          <group key={line.id}>{orbit}</group>
        );
      })}
    </>
  );
}

/** Groep die elk frame op de visuele plek van een wereld staat. */
function AtBody({ id, children }: { id: string; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const p = visualOf(id, sim.jd);
    ref.current?.position.set(p.x, p.y, p.z);
  });
  return <group ref={ref}>{children}</group>;
}

/** Witte zachte schijf; de spritekleur maakt er de catalogkleur van het gevolgde lichaam van. */
const followDot = () =>
  radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.45, "rgba(255,255,255,0.9)"],
    [1, "rgba(255,255,255,0)"],
  ]);

const sunHalo = () =>
  radialTexture([
    [0, "rgba(255,236,190,0.7)"],
    [0.12, "rgba(255,214,150,0.35)"],
    [0.35, "rgba(255,190,100,0.08)"],
    [1, "rgba(255,180,60,0)"],
  ]);

const _toParent = new THREE.Vector3();

function Body({
  id,
  color,
  radiusM,
  parent,
  ring,
  dot,
}: {
  id: string;
  color: string;
  radiusM: number;
  parent?: string;
  ring?: boolean;
  /** Schijfje dat in bovenaanzicht op de selectie ligt; de zon heeft al zijn eigen halo. */
  dot?: THREE.Texture;
}) {
  const group = useRef<THREE.Group>(null);
  const hit = useRef<THREE.Mesh>(null);
  const spin = useRef<THREE.Mesh>(null);
  const dotRef = useRef<THREE.Sprite>(null);
  const radiusAu = radiusM / AU;
  const flattening = FLATTENING[id] ?? 0;
  const isSun = id === "zon";
  const hasDot = dot != null && !isSun && canTopDown(id);
  const material = useMemo(() => {
    if (isSun) return sunMaterial();
    const look = lookFor(id, color);
    if (ring) {
      look.ringShadow = {
        pole: SATURN_POLE_V,
        innerAu: SATURN_RINGS_KM.cInner / AU_KM,
        outerAu: SATURN_RINGS_KM.aOuter / AU_KM,
        tex: saturnRingTexture(),
      };
    }
    return planetMaterial(look);
  }, [id, color, ring, isSun]);
  const halo = useMemo(() => (isSun ? sunHalo() : null), [isSun]);
  useEffect(
    () => () => {
      material.dispose();
      halo?.dispose();
    },
    [material, halo],
  );
  const lockedPole = useMemo(() => poleOf(id, parent), [id, parent]);

  useFrame((state) => {
    const p = visualOf(id, sim.jd);
    group.current?.position.set(p.x, p.y, p.z);
    hit.current?.position.set(p.x, p.y, p.z);
    const dist = state.camera.position.distanceTo(hit.current?.position ?? new THREE.Vector3());
    const hitR = Math.min(Math.max(radiusAu * 4, dist * 0.014), Math.max(radiusAu * 8, dist * 0.06));
    hit.current?.scale.setScalar(Math.max(hitR, radiusAu * 1.4));
    if (dotRef.current) dotRef.current.visible = sim.topDown && sim.selectedId === id;
    if (!spin.current) return;
    const own = spinFrame(id, sim.jd);
    if (own) {
      orient(spin.current, own);
    } else if (parent && lockedPole) {
      const q = visualOf(parent, sim.jd);
      _toParent.set(q.x - p.x, q.y - p.y, q.z - p.z).normalize();
      orient(spin.current, lockedFrame(lockedPole, _toParent));
    }
  });

  const big = isSun || planets.some((pl) => pl.id === id);
  return (
    <>
      <group ref={group}>
        <mesh ref={spin} material={material} scale={[1, 1 - flattening, 1]} raycast={noRaycast}>
          <sphereGeometry args={[Math.max(radiusAu, 1e-6), big ? 72 : 40, big ? 48 : 28]} />
        </mesh>
        {ring ? <SaturnRings planetAu={radiusAu} flattening={flattening} /> : null}
        {hasDot ? (
          // Vaste schermgrootte, boven de bol getekend: de ware bol is van boven af vaak kleiner dan een pixel.
          <sprite ref={dotRef} visible={false} scale={[0.012, 0.012, 1]} renderOrder={10} raycast={noRaycast}>
            <spriteMaterial
              map={dot}
              color={color}
              sizeAttenuation={false}
              transparent
              opacity={0.9}
              depthTest={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </sprite>
        ) : null}
        {halo ? (
          <>
            <sprite scale={[radiusAu * 10, radiusAu * 10, 1]} raycast={noRaycast}>
              <spriteMaterial map={halo} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            <sprite scale={[0.05, 0.05, 1]} raycast={noRaycast}>
              <spriteMaterial
                map={halo}
                sizeAttenuation={false}
                transparent
                opacity={0.8}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </sprite>
          </>
        ) : null}
      </group>
      <mesh ref={hit} onClick={clickable(id)}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  );
}

function SaturnRings({ planetAu, flattening }: { planetAu: number; flattening: number }) {
  const au = (km: number) => km / AU_KM;
  const quat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), SATURN_POLE_V),
    [],
  );
  const material = useMemo(
    () =>
      ringMaterial({
        pole: SATURN_POLE_V,
        innerAu: au(SATURN_RINGS_KM.cInner),
        outerAu: au(SATURN_RINGS_KM.aOuter),
        planetAu,
        flattening,
      }),
    [planetAu, flattening],
  );
  useEffect(() => () => material.dispose(), [material]);
  return (
    <group quaternion={quat}>
      <mesh material={material} onClick={clickable(SATURN_RING_ID)}>
        <ringGeometry args={[au(SATURN_RINGS_KM.cInner), au(SATURN_RINGS_KM.aOuter), 360, 1]} />
      </mesh>
    </group>
  );
}

export function UniverseScene() {
  const dot = useMemo(() => followDot(), []);
  useEffect(() => () => dot.dispose(), [dot]);
  return (
    <>
      <color attach="background" args={["#03040c"]} />
      <Sky />
      <Dust />
      <Starfield />
      <Oort />
      <Belts />
      <Orbits />
      <CosmosMeshes />
      <Body id="zon" color={sun.color} radiusM={sun.radius_km * 1000} />
      {planets.map((p) => (
        <Body
          key={p.id}
          id={p.id}
          color={p.color}
          radiusM={p.radius_km * 1000}
          ring={p.id === "saturnus"}
          dot={dot}
        />
      ))}
      <Body id="pluto" color={pluto.color} radiusM={pluto.radius_km * 1000} dot={dot} />
      {moons.map((m) => (
        <Body key={m.id} id={m.id} color={m.color} radiusM={m.radius_km * 1000} parent={m.parent} dot={dot} />
      ))}
    </>
  );
}
