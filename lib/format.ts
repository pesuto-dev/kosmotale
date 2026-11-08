import { AU_M, LY_M } from "@/lib/constants";

const nf = (digits: number) =>
  new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function fmt(n: number, digits: number) {
  return nf(digits).format(n);
}

function fmtLoose(n: number) {
  const digits = n < 10 && Math.abs(n - Math.round(n)) > 0.05 ? 1 : 0;
  return fmt(n, digits);
}

export function formatDistance(meters: number) {
  if (!Number.isFinite(meters)) return "onbekend";
  const abs = Math.abs(meters);
  if (abs < 1e6) return "hier";
  const au = abs / AU_M;
  const ly = abs / LY_M;
  if (au < 0.05) return `${fmt(abs / 1000, 0)} km`;
  if (au < 150) return `${fmt(au, au < 10 ? 2 : 1)} AE`;
  if (ly < 0.2) return `${fmt(au, 0)} AE`;
  if (ly < 1000) return `${fmt(ly, ly < 10 ? 2 : 1)} lichtjaar`;
  if (ly < 1e6) return `${fmt(ly, 0)} lichtjaar`;
  if (ly < 1e9) return `${fmt(ly / 1e6, ly < 1e7 ? 2 : 1)} miljoen lichtjaar`;
  return `${fmt(ly / 1e9, 2)} miljard lichtjaar`;
}

export function formatSize(radiusM: number | null, sizeNote: string | null) {
  if (sizeNote) return sizeNote;
  if (radiusM == null) return "grootte niet in deze set";
  const d = radiusM * 2;
  if (d < 0.5 * AU_M) return `⌀ ${fmt(d / 1000, 0)} km`;
  const dLy = d / LY_M;
  const dAu = d / AU_M;
  if (dAu < 200) return `⌀ ${fmt(dAu, dAu < 10 ? 2 : 1)} AE`;
  if (dLy < 1000) return `⌀ ${fmt(dLy, 0)} lichtjaar`;
  if (dLy < 1e6) return `⌀ ${fmt(dLy, 0)} lichtjaar`;
  if (dLy < 1e9) return `⌀ ${fmt(dLy / 1e6, 2)} miljoen lichtjaar`;
  return `⌀ ${fmt(dLy / 1e9, 2)} miljard lichtjaar`;
}

export function formatSpeed(mps: number) {
  const kms = mps / 1000;
  if (kms < 10) return `${fmt(kms, 2)} km/s`;
  if (kms < 1000) return `${fmt(kms, 1)} km/s`;
  if (kms < 1e6) return `${fmt(kms, 0)} km/s`;
  if (kms < 1e9) return `${fmt(kms / 1e6, 1)} miljoen km/s`;
  if (kms < 1e12) return `${fmt(kms / 1e9, 1)} miljard km/s`;
  return `${fmt(kms / 1e12, 1)} biljoen km/s`;
}

function formatTimes(factor: number) {
  if (factor < 1e6) return `${fmt(factor, 0)}×`;
  if (factor < 1e9) return `${fmt(factor / 1e6, factor < 1e8 ? 1 : 0)} miljoen×`;
  if (factor < 1e12) return `${fmt(factor / 1e9, factor < 1e10 ? 1 : 0)} miljard×`;
  return `${fmt(factor / 1e12, 1)} biljoen×`;
}

export function formatClock(factor: number) {
  if (factor < 1.05) return "1× · ware tijd";
  const times = formatTimes(factor);
  if (factor < 90) return `${times} · ${fmt(factor, 0)} s/s`;
  const min = factor / 60;
  if (min < 90) return `${times} · ${fmtLoose(min)} min/s`;
  const hour = factor / 3600;
  if (hour < 36) return `${times} · ${fmtLoose(hour)} uur/s`;
  const day = factor / 86400;
  if (day < 300) {
    const word = Math.abs(day - 1) < 0.05 ? "dag" : "dagen";
    return `${times} · ${fmtLoose(day)} ${word}/s`;
  }
  const year = factor / (365.25 * 86400);
  return `${times} · ${fmtLoose(year)} jaar/s`;
}

export function formatFlight(factor: number, boost: boolean) {
  const eff = factor * (boost ? 10 : 1);
  const head = boost ? `${formatTimes(factor)} en shift ×10` : formatTimes(factor);
  return `${head} · ${formatSpeed(eff * 1000)}`;
}

export function formatMag(mag: number) {
  const digits = Math.abs(mag) >= 10 ? 1 : 2;
  return `magnitude ${fmt(mag, digits)}`;
}
