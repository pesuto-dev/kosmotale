"use client";

import { useSyncExternalStore } from "react";
import { getFrameSnap, subscribeFrame } from "@/lib/frame";

export function SkyLabels() {
  const frame = useSyncExternalStore(subscribeFrame, getFrameSnap, getFrameSnap);
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {frame.labels.map((label) => (
        <div
          key={label.id}
          className="absolute max-w-[220px] -translate-x-1/2 -translate-y-full"
          style={{ left: label.x, top: label.y - 10 }}
        >
          <div
            className={`rounded-md border px-2 py-1 text-[11px] leading-snug shadow-lg backdrop-blur-sm ${
              label.selected
                ? "border-[#f0d7a2] bg-black/75 text-[#f7efe0]"
                : "border-white/15 bg-black/55 text-[#efe8da]"
            }`}
          >
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={`size-1.5 rounded-full ${
                  label.evidence === "model" ? "bg-[#c4b0ff]" : "bg-[#f0d7a2]"
                }`}
              />
              {label.name}
            </div>
            <div className="mt-0.5 text-[10px] text-[#d9d0c2]">{label.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
