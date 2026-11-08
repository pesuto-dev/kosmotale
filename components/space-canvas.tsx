"use client";

import { Canvas } from "@react-three/fiber";
import { Component, useState } from "react";
import { FlightRig } from "@/components/flight-rig";
import { VIEW_FOV_DEG } from "@/lib/constants";
import { UniverseScene } from "@/components/universe-scene";

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
          De scène liep vast. Herlaad de pagina.
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
        WebGL doet het hier niet. Zonder WebGL kan de ruimte niet draaien.
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
      </Canvas>
    </SceneBoundary>
  );
}
