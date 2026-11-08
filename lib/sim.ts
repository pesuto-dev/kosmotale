import { INITIAL_JD } from "@/lib/constants";

export const sim = {
  jd: INITIAL_JD,
  playing: false,
  /** 1 = ware tijd. Hoger speelt elke baan even veel sneller. */
  clockFactor: 1,
  /** 1 = 1 km/s. Hoger is een veelvoud van die snelheid. */
  flightFactor: 1,
  selectedId: "aarde" as string | null,
  hoverId: null as string | null,
  flyNonce: 1,
  suppressClick: false,
  keys: {
    forward: false,
    back: false,
    left: false,
    right: false,
    up: false,
    down: false,
    boost: false,
  },
};

export type UiSnap = {
  jd: number;
  playing: boolean;
  clockFactor: number;
  flightFactor: number;
  selectedId: string | null;
  version: number;
};

let version = 1;
let snap: UiSnap = take();
const listeners = new Set<() => void>();

function take(): UiSnap {
  return {
    jd: sim.jd,
    playing: sim.playing,
    clockFactor: sim.clockFactor,
    flightFactor: sim.flightFactor,
    selectedId: sim.selectedId,
    version,
  };
}

export function subscribeUi(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUiSnap() {
  return snap;
}

export function emitUi() {
  version += 1;
  snap = take();
  listeners.forEach((fn) => fn());
}

export function selectObject(id: string, fly = true) {
  sim.selectedId = id;
  if (fly) sim.flyNonce += 1;
  emitUi();
}

export function setSimTime(jd: number) {
  sim.jd = jd;
  sim.playing = false;
  emitUi();
}

export function setClockFactor(factor: number) {
  sim.clockFactor = Math.min(100 * 365.25 * 86400, Math.max(1, factor));
  emitUi();
}

export function setFlightFactor(factor: number) {
  sim.flightFactor = Math.min(1e12, Math.max(1, factor));
  emitUi();
}

/** Dagen die de klok per echte seconde opschuift. */
export function clockDaysPerSecond() {
  return sim.clockFactor / 86400;
}

/** Meters per seconde, inclusief de tijdelijke shift-versnelling. */
export function flightMetersPerSecond() {
  return sim.flightFactor * (sim.keys.boost ? 10 : 1) * 1000;
}
