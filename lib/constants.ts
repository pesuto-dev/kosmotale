export const AU_M = 1.495978707e11;
export const LY_M = 9.4607304725808e15;
export const AU_KM = 149597870.7;
export const DEG = Math.PI / 180;
export const OBLIQUITY = 23.43928 * DEG;
export const J2000_JD = 2451545.0;
/** Lineair tot voorbij de Kuipergordel, daarna logaritmisch. */
export const LINEAR_AU = 55;
export const LOG_SCALE = 32;

export const REALM_LABEL: Record<
  | "zonnestelsel"
  | "buitengebied"
  | "sterren"
  | "melkweg"
  | "lokale-groep"
  | "supercluster"
  | "heelal",
  string
> = {
  zonnestelsel: "Zonnestelsel",
  buitengebied: "Oortgebied",
  sterren: "Sterren",
  melkweg: "Melkweg",
  "lokale-groep": "Lokale Groep",
  supercluster: "Superclusters",
  heelal: "Waarneembaar heelal",
};

export const KIND_LABEL: Record<string, string> = {
  zon: "ster",
  planeet: "planeet",
  maan: "maan",
  dwergplaneet: "dwergplaneet",
  gordel: "gordel",
  ringen: "ringen",
  ster: "ster",
  stelsel: "sterrenstelsel",
  cluster: "cluster",
  structuur: "structuur",
  "zwart-gat": "zwart gat",
};

const MONTHS = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

/** JD om 12:00 UT, dag mag een breuk zijn. */
export function calendarToJd(year: number, month: number, day: number) {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5
  );
}

export function jdToCalendar(jd: number) {
  const Z = Math.floor(jd + 0.5);
  const F = jd + 0.5 - Z;
  let A = Z;
  if (Z >= 2299161) {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  return { year, month, day: Math.floor(day) };
}

export function formatDutchDate(jd: number) {
  const { year, month, day } = jdToCalendar(jd);
  const monthName = MONTHS[month - 1] ?? "";
  if (year <= 0) {
    return `${day} ${monthName} ${1 - year} v.Chr.`;
  }
  return `${day} ${monthName} ${year}`;
}

export function jdToYearFloat(jd: number) {
  return 2000 + (jd - J2000_JD) / 365.25;
}

export function yearFloatToJd(year: number) {
  return J2000_JD + (year - 2000) * 365.25;
}

export const MIN_YEAR = -2999;
export const MAX_YEAR = 2999;
export const INITIAL_JD = calendarToJd(2026, 9, 26.5);

/** 1× vlucht is 1 km/s. Hoger is hetzelfde, alleen een veelvoud. */
export const VIEW_FOV_DEG = 62;
export const EARTH_RADIUS_KM = 6378.1;

export const FLIGHT_1X_MPS = 1000;
export const FLIGHT_MAX = 1e12;

const YEAR_SECONDS = 365.25 * 86400;

/** 1× klok is één echte seconde. De factor versnelt alle banen even hard. */
export const CLOCK_PRESETS = [
  { factor: 3600, label: "1 uur/s" },
  { factor: 86400, label: "1 dag/s" },
  { factor: 30 * 86400, label: "30 dagen/s" },
  { factor: YEAR_SECONDS, label: "1 jaar/s" },
  { factor: 10 * YEAR_SECONDS, label: "10 jaar/s" },
  { factor: 100 * YEAR_SECONDS, label: "100 jaar/s" },
];

export const FLIGHT_PRESETS = [
  { factor: 10, label: "10×" },
  { factor: 100, label: "100×" },
  { factor: 1_000, label: "1.000×" },
  { factor: 1_000_000, label: "1 miljoen×" },
  { factor: 1_000_000_000, label: "1 miljard×" },
  { factor: FLIGHT_MAX, label: "1 biljoen×" },
];
