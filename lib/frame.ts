import type { Evidence } from "@/lib/types";
import type { Realm } from "@/lib/types";

export type SkyLabel = {
  id: string;
  name: string;
  evidence: Evidence;
  x: number;
  y: number;
  detail: string;
  selected: boolean;
};

export type FrameSnap = {
  labels: SkyLabel[];
  trueM: number;
  realm: Realm;
  compressed: boolean;
  flightFactor: number;
  boost: boolean;
  speedMps: number;
  viewW: number;
  viewH: number;
  scaleDepthM: number;
  camera: { x: number; y: number; z: number };
  version: number;
};

const empty: FrameSnap = {
  labels: [],
  trueM: 1.495978707e11,
  realm: "zonnestelsel",
  compressed: false,
  flightFactor: 1,
  boost: false,
  speedMps: 1000,
  viewW: 1280,
  viewH: 800,
  scaleDepthM: 1.495978707e11,
  camera: { x: 1, y: 0, z: 0 },
  version: 0,
};

let frame = empty;
const listeners = new Set<() => void>();

export function subscribeFrame(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getFrameSnap() {
  return frame;
}

export function publishFrame(next: Omit<FrameSnap, "version">) {
  frame = { ...next, version: frame.version + 1 };
  listeners.forEach((fn) => fn());
}
