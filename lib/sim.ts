import { getObject } from "@/lib/catalog";
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
  /** Bovenaanzicht: camera boven de ecliptica, baan van de selectie als cirkel in beeld. */
  topDown: false,
  /**
   * Uit: slepen en scrollen draaien en zoomen om de selectie.
   * Aan: zelf vliegen, kijken en de vliegsnelheid met het wiel zetten.
   */
  freeNav: false,
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
  topDown: boolean;
  freeNav: boolean;
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
    topDown: sim.topDown,
    freeNav: sim.freeNav,
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
  // Focussen zet de camera weer vast aan die wereld. Zelf vliegen is een aparte stand.
  sim.freeNav = false;
  // Buiten planeet, maan en dwergplaneet is er geen leesbare baan om van boven te tonen.
  if (sim.topDown && !canTopDown(id)) sim.topDown = false;
  if (fly) sim.flyNonce += 1;
  emitUi();
}

/** Alleen een planeet, maan of dwergplaneet heeft een baan die als cirkel in beeld past. */
export function canTopDown(id: string | null) {
  if (!id) return false;
  const kind = getObject(id)?.kind;
  return kind === "planeet" || kind === "maan" || kind === "dwergplaneet";
}

export function setTopDown(on: boolean) {
  const next = on && canTopDown(sim.selectedId);
  if (next === sim.topDown) return;
  sim.topDown = next;
  if (next) sim.freeNav = false;
  emitUi();
}

export function setFreeNav(on: boolean) {
  if (sim.freeNav === on) return;
  sim.freeNav = on;
  if (on) sim.topDown = false;
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
