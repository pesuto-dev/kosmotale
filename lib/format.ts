import { AU_M, LY_M, jdToCalendar } from "@/lib/constants";
import { getLang } from "@/lib/lang";
import { copy } from "@/lib/messages";

function fmt(n: number, digits: number) {
  const locale = getLang() === "nl" ? "nl-NL" : "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

function fmtLoose(n: number) {
  const digits = n < 10 && Math.abs(n - Math.round(n)) > 0.05 ? 1 : 0;
  return fmt(n, digits);
}

export function formatDistance(meters: number) {
  const m = copy();
  if (!Number.isFinite(meters)) return m.unknown;
  const abs = Math.abs(meters);
  if (abs < 1e6) return m.here;
  const au = abs / AU_M;
  const ly = abs / LY_M;
  if (au < 0.05) return `${fmt(abs / 1000, 0)} km`;
  if (au < 150) return `${fmt(au, au < 10 ? 2 : 1)} ${m.unitAu}`;
  if (ly < 0.2) return `${fmt(au, 0)} ${m.unitAu}`;
  if (ly < 1000) return `${fmt(ly, ly < 10 ? 2 : 1)} ${m.unitLy}`;
  if (ly < 1e6) return `${fmt(ly, 0)} ${m.unitLy}`;
  if (ly < 1e9) return `${fmt(ly / 1e6, ly < 1e7 ? 2 : 1)} ${m.unitMillion} ${m.unitLy}`;
  return `${fmt(ly / 1e9, 2)} ${m.unitBillion} ${m.unitLy}`;
}

export function formatSize(radiusM: number | null, sizeNote: string | null) {
  const m = copy();
  if (sizeNote) return sizeNote;
  if (radiusM == null) return m.sizeMissing;
  const d = radiusM * 2;
  if (d < 0.5 * AU_M) return `⌀ ${fmt(d / 1000, 0)} km`;
  const dLy = d / LY_M;
  const dAu = d / AU_M;
  if (dAu < 200) return `⌀ ${fmt(dAu, dAu < 10 ? 2 : 1)} ${m.unitAu}`;
  if (dLy < 1e6) return `⌀ ${fmt(dLy, 0)} ${m.unitLy}`;
  if (dLy < 1e9) return `⌀ ${fmt(dLy / 1e6, 2)} ${m.unitMillion} ${m.unitLy}`;
  return `⌀ ${fmt(dLy / 1e9, 2)} ${m.unitBillion} ${m.unitLy}`;
}

export function formatSpeed(mps: number) {
  const m = copy();
  const kms = mps / 1000;
  if (kms < 10) return `${fmt(kms, 2)} km/s`;
  if (kms < 1000) return `${fmt(kms, 1)} km/s`;
  if (kms < 1e6) return `${fmt(kms, 0)} km/s`;
  if (kms < 1e9) return `${fmt(kms / 1e6, 1)} ${m.unitMillion} km/s`;
  if (kms < 1e12) return `${fmt(kms / 1e9, 1)} ${m.unitBillion} km/s`;
  return `${fmt(kms / 1e12, 1)} ${m.unitTrillion} km/s`;
}

function formatScaled(n: number, word: string) {
  const digits = Math.abs(n - Math.round(n)) < 0.05 ? 0 : 1;
  return `${fmt(n, digits)} ${word}`;
}

export function formatFactor(factor: number) {
  const m = copy();
  if (factor < 1e6) return `${fmt(factor, 0)}×`;
  if (factor < 1e9) return `${formatScaled(factor / 1e6, m.unitMillion)}×`;
  if (factor < 1e12) return `${formatScaled(factor / 1e9, m.unitBillion)}×`;
  return `${formatScaled(factor / 1e12, m.unitTrillion)}×`;
}

export function formatClock(factor: number) {
  const m = copy();
  if (factor < 1.05) return `1× · ${m.realTime}`;
  const times = formatFactor(factor);
  if (factor < 90) return `${times} · ${fmt(factor, 0)} ${m.perSecond}`;
  const min = factor / 60;
  if (min < 90) return `${times} · ${fmtLoose(min)} ${m.minutePerSecond}`;
  const hour = factor / 3600;
  if (hour < 36) return `${times} · ${fmtLoose(hour)} ${m.hourPerSecond}`;
  const day = factor / 86400;
  if (day < 300) {
    const word = Math.abs(day - 1) < 0.05 ? m.dayOne : m.dayMany;
    return `${times} · ${fmtLoose(day)} ${word}/s`;
  }
  const year = factor / (365.25 * 86400);
  return `${times} · ${fmtLoose(year)} ${m.yearPerSecond}`;
}

export function formatFlight(factor: number, boost: boolean) {
  const eff = factor * (boost ? 10 : 1);
  const times = formatFactor(factor);
  const head = boost ? copy().shiftBoost(times) : times;
  return `${head} · ${formatSpeed(eff * 1000)}`;
}

export function formatMag(mag: number) {
  const digits = Math.abs(mag) >= 10 ? 1 : 2;
  return `magnitude ${fmt(mag, digits)}`;
}

export function formatSimDate(jd: number) {
  const { year, month, day } = jdToCalendar(jd);
  const m = copy();
  const monthName = m.months[month - 1] ?? "";
  if (year <= 0) {
    const label = m.bce(1 - year);
    return getLang() === "nl" ? `${day} ${monthName} ${label}` : `${monthName} ${day}, ${label}`;
  }
  return getLang() === "nl" ? `${day} ${monthName} ${year}` : `${monthName} ${day}, ${year}`;
}

const CLOCK_LABEL: Record<number, "presetHour" | "presetDay" | "presetMonth" | "presetYear" | "presetDecade" | "presetCentury"> = {
  3600: "presetHour",
  86400: "presetDay",
  [30 * 86400]: "presetMonth",
  [365.25 * 86400]: "presetYear",
  [10 * 365.25 * 86400]: "presetDecade",
  [100 * 365.25 * 86400]: "presetCentury",
};

export function formatClockPreset(factor: number) {
  const key = CLOCK_LABEL[factor];
  return key ? copy()[key] : formatFactor(factor);
}
