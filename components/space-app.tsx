"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Hud } from "@/components/hud";
import { SkyLabels } from "@/components/sky-labels";
import { MAX_YEAR, MIN_YEAR, yearFloatToJd } from "@/lib/constants";
import { clockDaysPerSecond, emitUi, sim } from "@/lib/sim";

const SpaceCanvas = dynamic(() => import("@/components/space-canvas"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-sm text-[#f0e6d4]">
      De ruimte wordt opgebouwd…
    </div>
  ),
});

export function SpaceApp() {
  useEffect(() => {
    const min = yearFloatToJd(MIN_YEAR);
    const max = yearFloatToJd(MAX_YEAR);
    let last = performance.now();
    let acc = 0;
    let frame = 0;
    const loop = (now: number) => {
      const dt = Math.min(1, Math.max(0, (now - last) / 1000));
      last = now;
      if (sim.playing) {
        sim.jd = Math.min(max, Math.max(min, sim.jd + clockDaysPerSecond() * dt));
        if (sim.jd <= min || sim.jd >= max) sim.playing = false;
      }
      acc += dt;
      if (acc > 0.16) {
        acc = 0;
        emitUi();
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#03040c] text-[#f3eadc]">
      <div className="absolute inset-0">
        <SpaceCanvas />
      </div>
      <SkyLabels />
      <Hud />
    </main>
  );
}
