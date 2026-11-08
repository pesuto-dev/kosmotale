/** Prefix voor bestanden in `public/`. Leeg, tenzij de build `NEXT_PUBLIC_BASE_PATH` zet. */
export function publicPath(path: string) {
  const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
