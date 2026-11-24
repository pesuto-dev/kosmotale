"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Component, useEffect, useRef, useState } from "react";
import { FlightRig } from "@/components/flight-rig";
import { VIEW_FOV_DEG } from "@/lib/constants";
import { copy } from "@/lib/messages";
import { UniverseScene } from "@/components/universe-scene";

declare global {
  interface Window {
    /** True nadat het WebGL-canvas een paar frames heeft getekend. Leest `scripts/record-demo.ts`. */
    __kosmotaleReady?: boolean;
  }
}

/** Eerste bruikbare frames: het canvas heeft een buffer en de camera staat op de aarde. */
function MarkReady() {
  const frames = useRef(0);
  useEffect(() => {
    return () => {
      window.__kosmotaleReady = false;
    };
  }, []);
  useFrame((state) => {
    if (window.__kosmotaleReady) return;
    const canvas = state.gl.domElement;
    if (canvas.width < 2 || canvas.height < 2) return;
    frames.current += 1;
    if (frames.current >= 8) window.__kosmotaleReady = true;
  });
  return null;
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-items-center px-6 text-center text-sm text-[#f0e6d4]">
          {copy().sceneCrashed}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SpaceCanvas() {
  const [ready] = useState(hasWebGL);
  if (!ready) {
    return (
      <div className="grid h-full place-items-center px-6 text-center text-sm text-[#f0e6d4]">
        {copy().noWebgl}
      </div>
    );
  }
  return (
    <SceneBoundary>
      <Canvas
        className="h-full w-full touch-none"
        camera={{
          position: [0.2, -1.2, 0.4],
          up: [0, 0, 1],
          fov: VIEW_FOV_DEG,
          near: 0.00005,
          far: 8000,
        }}
        gl={{
          antialias: true,
          alpha: false,
          logarithmicDepthBuffer: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.75]}
      >
        <UniverseScene />
        <FlightRig />
        <MarkReady />
      </Canvas>
    </SceneBoundary>
  );
}
