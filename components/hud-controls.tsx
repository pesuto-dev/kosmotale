"use client";

import { unwarpVisual } from "@/lib/coords";
import { sim } from "@/lib/sim";

function hold(key: keyof typeof sim.keys, down: boolean) {
  sim.keys[key] = down;
  if (down) sim.flyNonce += 0;
}

export function HoldButton({
  label,
  code,
}: {
  label: string;
  code: keyof typeof sim.keys;
}) {
  return (
    <button
      type="button"
      className="rounded-md border border-white/10 bg-white/5 px-2 py-2 text-xs text-[#f3eadc]"
      onPointerDown={(event) => {
        event.preventDefault();
        hold(code, true);
      }}
      onPointerUp={() => hold(code, false)}
      onPointerLeave={() => hold(code, false)}
    >
      {label}
    </button>
  );
}

export function distanceMeters(
  cameraVisual: { x: number; y: number; z: number },
  objectTrue: { x: number; y: number; z: number },
) {
  const cam = unwarpVisual(cameraVisual);
  const dx = cam.x - objectTrue.x;
  const dy = cam.y - objectTrue.y;
  const dz = cam.z - objectTrue.z;
  return Math.hypot(dx, dy, dz);
}
