import { AU_KM, DEG, J2000_JD } from "@/lib/constants";
import type { Vec } from "@/lib/types";

export type SecularOrbit = {
  a0: number;
  adot: number;
  e0: number;
  edot: number;
  I0: number;
  Idot: number;
  L0: number;
  Ldot: number;
  varpi0: number;
  varpidot: number;
  Omega0: number;
  Omegadot: number;
  b: number;
  c: number;
  s: number;
  f: number;
};

export type OsculatingOrbit = {
  a_km: number;
  e: number;
  i_deg: number;
  om_deg: number;
  w_deg: number;
  ma_deg: number;
  period_days: number;
  epoch_jd: number;
};

function wrap180(deg: number) {
  const x = (((deg + 180) % 360) + 360) % 360;
  return x - 180;
}

/** Excentrische anomalie in radialen. M in graden, e dimensieloos. */
export function eccentricAnomaly(meanDeg: number, e: number) {
  const eStar = e * (180 / Math.PI);
  const M = wrap180(meanDeg);
  let E = M + eStar * Math.sin(M * DEG);
  for (let n = 0; n < 12; n += 1) {
    const Er = E * DEG;
    const dM = M - (E - eStar * Math.sin(Er));
    const dE = dM / (1 - e * Math.cos(Er));
    E += dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E * DEG;
}

function rotateOrbit(xp: number, yp: number, wDeg: number, iDeg: number, omDeg: number): Vec {
  const w = wDeg * DEG;
  const I = iDeg * DEG;
  const O = omDeg * DEG;
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);
  const cosO = Math.cos(O);
  const sinO = Math.sin(O);
  return {
    x: (cosw * cosO - sinw * sinO * cosI) * xp + (-sinw * cosO - cosw * sinO * cosI) * yp,
    y: (cosw * sinO + sinw * cosO * cosI) * xp + (-sinw * sinO + cosw * cosO * cosI) * yp,
    z: sinw * sinI * xp + cosw * sinI * yp,
  };
}

function place(aAu: number, e: number, meanDeg: number, wDeg: number, iDeg: number, omDeg: number): Vec {
  const E = eccentricAnomaly(meanDeg, e);
  const xp = aAu * (Math.cos(E) - e);
  const yp = aAu * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
  return rotateOrbit(xp, yp, wDeg, iDeg, omDeg);
}

/** Heliocentrisch, ecliptica J2000, in AE. */
export function secularPositionAu(el: SecularOrbit, jd: number): Vec {
  const T = (jd - J2000_JD) / 36525;
  const a = el.a0 + el.adot * T;
  const e = Math.min(0.9, Math.max(0, el.e0 + el.edot * T));
  const I = el.I0 + el.Idot * T;
  const L = el.L0 + el.Ldot * T;
  const varpi = el.varpi0 + el.varpidot * T;
  const Omega = el.Omega0 + el.Omegadot * T;
  const fT = el.f * T * DEG;
  const M =
    L -
    varpi +
    el.b * T * T +
    el.c * Math.cos(fT) +
    el.s * Math.sin(fT);
  const w = varpi - Omega;
  return place(a, e, M, w, I, Omega);
}

/** Ecliptisch, in AE, ten opzichte van het middelpunt van de baan. */
export function osculatingPositionAu(el: OsculatingOrbit, jd: number): Vec {
  const aAu = el.a_km / AU_KM;
  const M = el.ma_deg + (360 * (jd - el.epoch_jd)) / el.period_days;
  return place(aAu, el.e, M, el.w_deg, el.i_deg, el.om_deg);
}

export function sampleSecularAu(el: SecularOrbit, jd: number, steps = 160): Vec[] {
  const T = (jd - J2000_JD) / 36525;
  const a = el.a0 + el.adot * T;
  const e = Math.min(0.9, Math.max(0, el.e0 + el.edot * T));
  const I = el.I0 + el.Idot * T;
  const varpi = el.varpi0 + el.varpidot * T;
  const Omega = el.Omega0 + el.Omegadot * T;
  const w = varpi - Omega;
  const pts: Vec[] = [];
  for (let i = 0; i <= steps; i += 1) {
    pts.push(place(a, e, (i / steps) * 360, w, I, Omega));
  }
  return pts;
}

export function sampleOsculatingAu(el: OsculatingOrbit, steps = 96): Vec[] {
  const aAu = el.a_km / AU_KM;
  const pts: Vec[] = [];
  for (let i = 0; i <= steps; i += 1) {
    pts.push(place(aAu, el.e, (i / steps) * 360, el.w_deg, el.i_deg, el.om_deg));
  }
  return pts;
}
