import { enCatalog, enStarName } from "@/lib/en-catalog";
import type { Lang } from "@/lib/lang";
import { getLang } from "@/lib/lang";
import { copy } from "@/lib/messages";
import type { Kind, Realm, SpaceObject } from "@/lib/types";

export function objectName(obj: Pick<SpaceObject, "id" | "name">, lang: Lang = getLang()) {
  if (lang === "nl") return obj.name;
  return enCatalog[obj.id]?.name ?? enStarName[obj.id] ?? obj.name;
}

export function objectSummary(obj: SpaceObject, lang: Lang = getLang()) {
  if (lang === "nl") return obj.summary;
  const custom = enCatalog[obj.id]?.summary;
  if (custom) return custom;
  if (obj.kind !== "ster") return obj.summary;
  if (obj.id === "hip-70890") {
    return "Too faint for the bright selection. Distance 4.246 light-years, the commonly cited value.";
  }
  const spect = obj.spect || "spectrum unknown";
  return `${spect}. Distance from the Hipparcos parallax. For distant stars that distance is rough. The point of light is not a true diameter.`;
}

export function objectSizeNote(obj: Pick<SpaceObject, "id" | "sizeNote">, lang: Lang = getLang()) {
  if (lang === "nl") return obj.sizeNote;
  return enCatalog[obj.id]?.sizeNote ?? obj.sizeNote;
}

export function realmLabel(realm: Realm, lang: Lang = getLang()) {
  return copy(lang).realm[realm];
}

export function kindLabel(kind: Kind, lang: Lang = getLang()) {
  return copy(lang).kind[kind] ?? kind;
}
