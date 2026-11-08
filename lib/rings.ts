/** Hoofdringen van Saturnus, km vanaf het midden. C tot en met A, NASA-ringgrenzen. */
export const SATURN_RING_ID = "saturnus-ringen";

export const SATURN_RINGS_KM = {
  cInner: 74658,
  cOuter: 92000,
  bInner: 92000,
  bOuter: 117580,
  aInner: 122170,
  aOuter: 136775,
} as const;

/** Noordpool van Saturnus, IAU, J2000. */
export const SATURN_POLE = { raDeg: 40.589, decDeg: 83.537 };

type Zone = { from: number; to: number; tau: number | [number, number]; color: string; ripple: number };

/**
 * Optische diepte (loodrecht) per zone. Grenzen en gaten: NASA Saturnian Rings Fact Sheet
 * en PDS Rings Node. De waarden binnen een zone en de fijne ribbels zijn een benadering
 * van de Voyager- en Cassini-occultatieprofielen, geen meting per kilometer.
 */
const ZONES: Zone[] = [
  { from: 74658, to: 77800, tau: 0.06, color: "#8a7e70", ripple: 0.2 },
  { from: 77800, to: 77950, tau: 0.01, color: "#8a7e70", ripple: 0 },
  { from: 77950, to: 84750, tau: [0.07, 0.1], color: "#8f8373", ripple: 0.2 },
  { from: 84750, to: 85650, tau: 0.3, color: "#9a8e7c", ripple: 0.1 },
  { from: 85650, to: 86400, tau: 0.1, color: "#8f8373", ripple: 0.2 },
  { from: 86400, to: 86600, tau: 0.35, color: "#9a8e7c", ripple: 0.1 },
  { from: 86600, to: 87340, tau: 0.1, color: "#8f8373", ripple: 0.2 },
  { from: 87340, to: 87460, tau: 0.005, color: "#8f8373", ripple: 0 },
  { from: 87460, to: 87520, tau: 1.0, color: "#a39684", ripple: 0 },
  { from: 87520, to: 87610, tau: 0.005, color: "#8f8373", ripple: 0 },
  { from: 87610, to: 88450, tau: 0.1, color: "#8f8373", ripple: 0.2 },
  { from: 88450, to: 88720, tau: 0.35, color: "#9a8e7c", ripple: 0.1 },
  { from: 88720, to: 89190, tau: 0.12, color: "#8f8373", ripple: 0.2 },
  { from: 89190, to: 89780, tau: 0.4, color: "#9a8e7c", ripple: 0.1 },
  { from: 89780, to: 90200, tau: 0.12, color: "#8f8373", ripple: 0.2 },
  { from: 90200, to: 90620, tau: 0.35, color: "#9a8e7c", ripple: 0.1 },
  { from: 90620, to: 92000, tau: [0.12, 0.25], color: "#968a79", ripple: 0.2 },
  { from: 92000, to: 99000, tau: [0.9, 1.6], color: "#d9c6a4", ripple: 0.3 },
  { from: 99000, to: 104500, tau: [2.2, 3.6], color: "#e9d8b8", ripple: 0.25 },
  { from: 104500, to: 110000, tau: [4, 5], color: "#efdfc0", ripple: 0.15 },
  { from: 110000, to: 117580, tau: [2.4, 1.6], color: "#e3d0ac", ripple: 0.3 },
  { from: 117580, to: 117680, tau: 0.1, color: "#6f675d", ripple: 0.1 },
  { from: 117680, to: 117800, tau: 0.005, color: "#6f675d", ripple: 0 },
  { from: 117800, to: 117840, tau: 0.8, color: "#8d8374", ripple: 0 },
  { from: 117840, to: 117960, tau: 0.005, color: "#6f675d", ripple: 0 },
  { from: 117960, to: 118183, tau: 0.1, color: "#6f675d", ripple: 0.2 },
  { from: 118183, to: 118285, tau: 0.01, color: "#6f675d", ripple: 0 },
  { from: 118285, to: 118597, tau: 0.12, color: "#6f675d", ripple: 0.2 },
  { from: 118597, to: 118630, tau: 0.01, color: "#6f675d", ripple: 0 },
  { from: 118630, to: 118931, tau: 0.12, color: "#6f675d", ripple: 0.2 },
  { from: 118931, to: 118969, tau: 0.01, color: "#6f675d", ripple: 0 },
  { from: 118969, to: 119845, tau: 0.1, color: "#6f675d", ripple: 0.2 },
  { from: 119845, to: 120086, tau: 0.01, color: "#6f675d", ripple: 0 },
  { from: 120086, to: 120900, tau: 0.12, color: "#716a60", ripple: 0.2 },
  { from: 120900, to: 122170, tau: [0.12, 0.35], color: "#8a8172", ripple: 0.15 },
  { from: 122170, to: 126000, tau: [0.55, 0.9], color: "#cfc2a8", ripple: 0.15 },
  { from: 126000, to: 133423, tau: [0.8, 0.55], color: "#cbbea4", ripple: 0.15 },
  { from: 133423, to: 133745, tau: 0.002, color: "#cbbea4", ripple: 0 },
  { from: 133745, to: 136485, tau: 0.5, color: "#c6b9a0", ripple: 0.1 },
  { from: 136485, to: 136527, tau: 0.002, color: "#c6b9a0", ripple: 0 },
  { from: 136527, to: 136775, tau: 0.3, color: "#c2b59c", ripple: 0.05 },
];

/** Hoogste optische diepte die in de ringtextuur past. */
export const RING_TAU_MAX = 5;

function ripple(km: number) {
  return (
    Math.sin(km / 41.3) * 0.35 +
    Math.sin(km / 113.7 + 1.3) * 0.3 +
    Math.sin(km / 331.9 + 2.1) * 0.22 +
    Math.sin(km / 947.1 + 0.4) * 0.13
  );
}

function hex(color: string) {
  const n = Number.parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Radiaal profiel van C tot A: RGB is de kleur (sRGB), alfa is √(τ / RING_TAU_MAX),
 * zodat de dunne C-ring genoeg precisie houdt.
 */
export function saturnRingProfile(samples = 4096) {
  const data = new Uint8Array(samples * 4);
  const span = SATURN_RINGS_KM.aOuter - SATURN_RINGS_KM.cInner;
  let z = 0;
  for (let i = 0; i < samples; i += 1) {
    const km = SATURN_RINGS_KM.cInner + ((i + 0.5) / samples) * span;
    while (z < ZONES.length - 1 && km > ZONES[z].to) z += 1;
    const zone = ZONES[z];
    const f = (km - zone.from) / (zone.to - zone.from);
    const base = Array.isArray(zone.tau) ? zone.tau[0] + (zone.tau[1] - zone.tau[0]) * f : zone.tau;
    const wobble = 1 + zone.ripple * ripple(km);
    const tau = Math.min(RING_TAU_MAX, Math.max(0, base * wobble));
    const [r, g, b] = hex(zone.color);
    const shade = 1 + zone.ripple * 0.25 * ripple(km * 0.7);
    data[i * 4] = Math.min(255, r * shade);
    data[i * 4 + 1] = Math.min(255, g * shade);
    data[i * 4 + 2] = Math.min(255, b * shade);
    data[i * 4 + 3] = Math.round(Math.sqrt(tau / RING_TAU_MAX) * 255);
  }
  return data;
}
