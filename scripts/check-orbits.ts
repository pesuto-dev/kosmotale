import { calendarToJd, J2000_JD } from "../lib/constants";
import { hypot, toVisualRadius, visualToMeters, galacticToEquatorial } from "../lib/coords";
import { AU_M, LY_M } from "../lib/constants";
import { orbitalSpeedMps, relativeAngleDeg } from "../lib/motion";
import { sunDistanceM, trueMeters } from "../lib/positions";
import { SATURN_RINGS_KM } from "../lib/rings";

const j2000 = calendarToJd(2000, 1, 1.5);
if (Math.abs(j2000 - J2000_JD) > 0.01) {
  throw new Error(`J2000 klopt niet: ${j2000}`);
}

const earth = sunDistanceM("aarde", J2000_JD) / AU_M;
if (earth < 0.97 || earth > 1.0) {
  throw new Error(`Aarde op J2000 is ${earth} AE, verwacht ~0,983`);
}

const later = trueMeters("aarde", J2000_JD + 365.25);
const now = trueMeters("aarde", J2000_JD);
const drift = Math.hypot(later.x - now.x, later.y - now.y, later.z - now.z) / AU_M;
if (drift > 0.05) {
  throw new Error(`Aarde staat na een jaar ${drift} AE van de start`);
}

const quarter = trueMeters("aarde", J2000_JD + 91.3);
const dot =
  now.x * quarter.x + now.y * quarter.y + now.z * quarter.z;
const ang = Math.acos(dot / (hypot(now) * hypot(quarter))) * (180 / Math.PI);
if (ang < 70 || ang > 110) {
  throw new Error(`Kwart jaar draait de aarde ${ang} graden`);
}

const nep = sunDistanceM("neptunus", J2000_JD) / AU_M;
if (nep < 29 || nep > 31.5) {
  throw new Error(`Neptunus is ${nep} AE`);
}

const moon = trueMeters("maan", J2000_JD);
const earthV = trueMeters("aarde", J2000_JD);
const moonAu = Math.hypot(moon.x - earthV.x, moon.y - earthV.y, moon.z - earthV.z) / AU_M;
if (moonAu < 0.002 || moonAu > 0.0032) {
  throw new Error(`Maan staat ${moonAu} AE van de aarde`);
}

const sirius = sunDistanceM("hip-32349", J2000_JD) / LY_M;
if (sirius < 8.4 || sirius > 8.8) {
  throw new Error(`Sirius is ${sirius} lichtjaar`);
}

const gc = galacticToEquatorial(0, 0, 1);
const ra = (Math.atan2(gc.y, gc.x) * 180) / Math.PI;
const dec = (Math.asin(gc.z) * 180) / Math.PI;
const ra360 = ra < 0 ? ra + 360 : ra;
if (Math.abs(ra360 - 266.4) > 1 || Math.abs(dec + 28.94) > 1) {
  throw new Error(`Galactisch centrum wijst naar ${ra360}, ${dec}`);
}

const back = visualToMeters(toVisualRadius(4.65e10 * LY_M));
if (Math.abs(back - 4.65e10 * LY_M) / (4.65e10 * LY_M) > 1e-6) {
  throw new Error("Schaal heen en terug klopt niet");
}

const inside = toVisualRadius(30 * AU_M);
if (Math.abs(inside - 30) > 1e-6) {
  throw new Error("Binnen de Kuipergordel hoort de schaal lineair te zijn");
}

const earthKms = (orbitalSpeedMps("aarde", J2000_JD) ?? 0) / 1000;
const moonKms = (orbitalSpeedMps("maan", J2000_JD) ?? 0) / 1000;
const ioKms = (orbitalSpeedMps("io", J2000_JD) ?? 0) / 1000;
if (earthKms < 29 || earthKms > 31) throw new Error(`Aarde gaat ${earthKms} km/s`);
if (moonKms < 0.9 || moonKms > 1.15) throw new Error(`Maan gaat ${moonKms} km/s om de aarde`);
if (ioKms < 15 || ioKms < moonKms * 10) throw new Error(`Io gaat ${ioKms} km/s, te traag tegen de maan`);

const moonTurn = relativeAngleDeg("maan", J2000_JD, 13.5);
const earthTurn = relativeAngleDeg("aarde", J2000_JD, 13.5);
if (moonTurn < 150) throw new Error(`Maan draait in een halve maand maar ${moonTurn} graden`);
if (earthTurn > 20) throw new Error(`Aarde draait in een halve maand ${earthTurn} graden`);

const phobos = trueMeters("phobos", J2000_JD);
const mars = trueMeters("mars", J2000_JD);
const phobosKm = Math.hypot(phobos.x - mars.x, phobos.y - mars.y, phobos.z - mars.z) / 1000;
if (phobosKm < 9000 || phobosKm > 9800) throw new Error(`Phobos staat ${phobosKm} km van Mars`);
const phobosTurn = relativeAngleDeg("phobos", J2000_JD, 0.16);
const marsTurn = relativeAngleDeg("mars", J2000_JD, 0.16);
if (phobosTurn < 140) throw new Error(`Phobos draait in een halve omloop maar ${phobosTurn} graden`);
if (marsTurn > 2) throw new Error(`Mars draait in diezelfde tijd ${marsTurn} graden`);

const ringRatio = SATURN_RINGS_KM.aOuter / 60268;
if (ringRatio < 2.2 || ringRatio > 2.35) throw new Error(`Ringverhouding is ${ringRatio}`);
const charon = trueMeters("charon", J2000_JD);
const plutoV = trueMeters("pluto", J2000_JD);
const charonKm = Math.hypot(charon.x - plutoV.x, charon.y - plutoV.y, charon.z - plutoV.z) / 1000;
if (charonKm < 16000 || charonKm > 23000) throw new Error(`Charon staat ${charonKm} km van Pluto`);

console.log("Banen en schaal kloppen.");
console.log({ earth, nep, moonAu, sirius, ang, ra: ra360, dec, earthKms, moonKms, ioKms, moonTurn, earthTurn });
