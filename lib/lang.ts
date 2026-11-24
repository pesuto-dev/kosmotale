export type Lang = "en" | "nl";

let lang: Lang = "en";
const listeners = new Set<() => void>();

export function getLang() {
  return lang;
}

export function subscribeLang(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setLang(next: Lang) {
  if (next !== "en" && next !== "nl") return;
  try {
    localStorage.setItem("kosmotale-lang", next);
  } catch {
    /* private mode */
  }
  if (typeof document !== "undefined") document.documentElement.lang = next;
  if (next === lang) return;
  lang = next;
  listeners.forEach((fn) => fn());
}

/** Query `lang` wins over a saved choice. First paint stays English until this runs. */
export function bootLang() {
  if (typeof window === "undefined") return;
  const query = new URLSearchParams(window.location.search).get("lang");
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("kosmotale-lang");
  } catch {
    saved = null;
  }
  const pick = query === "en" || query === "nl" ? query : saved === "en" || saved === "nl" ? saved : "en";
  setLang(pick);
}
