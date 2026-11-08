import { AU_M, EARTH_RADIUS_KM, VIEW_FOV_DEG } from "@/lib/constants";

const EARTH_DIAMETER_M = EARTH_RADIUS_KM * 2 * 1000;

const nf = new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 2 });

function nice(x: number) {
  if (!Number.isFinite(x) || x <= 0) return 1;
  const exp = Math.floor(Math.log10(x));
  const f = x / 10 ** exp;
  const n = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
  return n * 10 ** exp;
}

export type ScaleBar = { px: number; label: string };

/** Ware lengte van een streep, gemeten op `depthM` in de huidige beeldhoek. */
export function scaleBar(depthM: number, viewW: number, viewH: number): ScaleBar | null {
  if (viewW < 40 || viewH < 40 || depthM <= 0) return null;
  const vFov = (VIEW_FOV_DEG * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (viewW / viewH));
  const widthM = 2 * depthM * Math.tan(hFov / 2);
  const mPerPx = widthM / viewW;
  const targetPx = Math.min(220, Math.max(88, viewW * 0.16));
  const raw = mPerPx * targetPx;
  const au = raw / AU_M;
  if (au >= 0.02) {
    const n = nice(au);
    const digits = n >= 10 ? 0 : n >= 1 ? 1 : 2;
    return {
      px: clamp(targetPx * (n / au)),
      label: `${nf.format(Number(n.toFixed(digits)))} AE`,
    };
  }
  const earths = Math.max(raw / EARTH_DIAMETER_M, 0.01);
  const n = earths >= 0.8 ? Math.max(1, nice(earths)) : nice(earths);
  const word = Math.abs(n - 1) < 0.01 ? "aarddiameter" : "aarddiameters";
  return { px: clamp(targetPx * (n / earths)), label: `${nf.format(n)} ${word}` };
}

function clamp(px: number) {
  return Math.max(48, Math.min(260, px));
}
