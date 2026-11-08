import assert from "node:assert/strict";
import { test } from "node:test";
import { AU_M, DEG, J2000_JD, LINEAR_AU, LY_M } from "../lib/constants";
import {
  toVisualRadius,
  visualToMeters,
  warpMeters,
} from "../lib/coords";
import {
  eccentricAnomaly,
  osculatingPositionAu,
  secularPositionAu,
  type OsculatingOrbit,
  type SecularOrbit,
} from "../lib/kepler";
import { lockedFrame, poleOf, spinFrame } from "../lib/rotation";
import { scaleBar } from "../lib/scale";

const circle: SecularOrbit = {
  a0: 1,
  adot: 0,
  e0: 0,
  edot: 0,
  I0: 0,
  Idot: 0,
  L0: 0,
  Ldot: 0,
  varpi0: 0,
  varpidot: 0,
  Omega0: 0,
  Omegadot: 0,
  b: 0,
  c: 0,
  s: 0,
  f: 0,
};

function len(v: { x: number; y: number; z: number }) {
  return Math.hypot(v.x, v.y, v.z);
}

function dot(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

test("cirkelbaan op J2000 ligt op 1 AE in het vlak", () => {
  const p = secularPositionAu(circle, J2000_JD);
  assert.ok(Math.abs(len(p) - 1) < 1e-9);
  assert.ok(Math.abs(p.x - 1) < 1e-9);
  assert.ok(Math.abs(p.z) < 1e-12);
});

test("Kepler-vergelijking sluit voor hoge excentriciteit", () => {
  const e = 0.85;
  const mean = 123.4;
  const E = eccentricAnomaly(mean, e);
  const residual = E / DEG - e * (180 / Math.PI) * Math.sin(E) - (((mean + 180) % 360) + 360) % 360 + 180;
  assert.ok(Math.abs(residual) < 1e-4);
});

test("randen van de excentrische anomalie", () => {
  assert.ok(Math.abs(eccentricAnomaly(0, 0)) < 1e-12);
  const half = eccentricAnomaly(180, 0);
  assert.ok(Math.abs(Math.sin(half)) < 1e-8);
  assert.ok(Math.abs(Math.cos(half) + 1) < 1e-8);
  assert.ok(Number.isFinite(eccentricAnomaly(10, 0.99)));
});

test("osculerende baan komt na één periode terug", () => {
  const el: OsculatingOrbit = {
    a_km: 384400,
    e: 0.0549,
    i_deg: 5.145,
    om_deg: 125,
    w_deg: 318,
    ma_deg: 40,
    period_days: 27.321661,
    epoch_jd: J2000_JD,
  };
  const a = osculatingPositionAu(el, el.epoch_jd);
  const b = osculatingPositionAu(el, el.epoch_jd + el.period_days);
  assert.ok(Math.abs(a.x - b.x) < 1e-8);
  assert.ok(Math.abs(a.y - b.y) < 1e-8);
  assert.ok(Math.abs(a.z - b.z) < 1e-8);
  assert.ok(len(a) > 0);
});

test("aardpool wijst naar +Z en de meridiaan staat er loodrecht op", () => {
  const pole = poleOf("aarde");
  assert.ok(pole);
  assert.ok(Math.abs(pole.z - 1) < 1e-12);
  const frame = spinFrame("aarde", J2000_JD);
  assert.ok(frame);
  assert.ok(Math.abs(len(frame.meridian) - 1) < 1e-9);
  assert.ok(Math.abs(dot(frame.meridian, frame.pole)) < 1e-9);
  assert.equal(spinFrame("geen-lichaam", J2000_JD), null);
});

test("één dag draait de aarde ongeveer één siderische slag", () => {
  const a = spinFrame("aarde", J2000_JD);
  const b = spinFrame("aarde", J2000_JD + 1);
  assert.ok(a && b);
  const cross = len({
    x: a.meridian.y * b.meridian.z - a.meridian.z * b.meridian.y,
    y: a.meridian.z * b.meridian.x - a.meridian.x * b.meridian.z,
    z: a.meridian.x * b.meridian.y - a.meridian.y * b.meridian.x,
  });
  const angle = Math.atan2(cross, dot(a.meridian, b.meridian)) / DEG;
  const expected = 360.9856235 % 360;
  assert.ok(Math.abs(angle - expected) < 1e-4);
});

test("retrograde pool van Uranus blijft een eenheidsvector", () => {
  const frame = spinFrame("uranus", J2000_JD + 10);
  assert.ok(frame);
  assert.ok(Math.abs(len(frame.pole) - 1) < 1e-9);
  assert.ok(frame.pole.z < 0);
  assert.ok(Math.abs(dot(frame.pole, frame.meridian)) < 1e-8);
});

test("gebonden rotatie wijst de nulmeridiaan naar de planeet", () => {
  const pole = { x: 0, y: 0, z: 1 };
  const toParent = { x: 3, y: 4, z: 1 };
  const frame = lockedFrame(pole, toParent);
  assert.ok(Math.abs(dot(frame.pole, frame.meridian)) < 1e-12);
  assert.ok(frame.meridian.x > 0 && frame.meridian.y > 0);
  assert.ok(Math.abs(len(frame.meridian) - 1) < 1e-12);
});

test("schaal is lineair tot de knik en daarna omkeerbaar", () => {
  assert.equal(toVisualRadius(AU_M), 1);
  assert.equal(visualToMeters(1), AU_M);
  const edge = LINEAR_AU * AU_M;
  assert.ok(Math.abs(toVisualRadius(edge) - LINEAR_AU) < 1e-9);
  assert.ok(Math.abs(visualToMeters(LINEAR_AU) - edge) < 1);
  for (const meters of [AU_M * 10, edge * 1.001, 100 * LY_M, 1e6 * LY_M]) {
    const back = visualToMeters(toVisualRadius(meters));
    assert.ok(Math.abs(back - meters) / meters < 1e-9);
  }
  assert.ok(toVisualRadius(10 * LY_M) > toVisualRadius(LY_M));
});

test("warp behoudt de richting en laat de nulvector met rust", () => {
  const zero = warpMeters({ x: 0, y: 0, z: 0 });
  assert.deepEqual(zero, { x: 0, y: 0, z: 0 });
  const v = warpMeters({ x: 3 * LY_M, y: 4 * LY_M, z: 0 });
  assert.ok(Math.abs(v.x / v.y - 3 / 4) < 1e-9);
  assert.ok(Math.abs(v.z) < 1e-9);
});

test("schaalstrook weigert een leeg beeld en blijft binnen de strook", () => {
  assert.equal(scaleBar(0, 800, 600), null);
  assert.equal(scaleBar(AU_M, 10, 600), null);
  const bar = scaleBar(2 * AU_M, 1000, 600);
  assert.ok(bar);
  assert.ok(bar.px >= 48 && bar.px <= 260);
  assert.ok(bar.label.length > 0);
});
