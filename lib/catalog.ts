import cosmosJson from "@/data/cosmos.json";
import orbitalJson from "@/data/orbital-elements.json";
import starsJson from "@/data/stars.json";
import { SATURN_RINGS_KM, SATURN_RING_ID } from "@/lib/rings";
import type { Kind, Realm, SpaceObject } from "@/lib/types";
import type { OsculatingOrbit, SecularOrbit } from "@/lib/kepler";

export type PlanetRecord = SecularOrbit & {
  id: string;
  name: string;
  radius_km: number;
  color: string;
  rotation_hours: number;
  summary: string;
};

export type MoonRecord = OsculatingOrbit & {
  id: string;
  name: string;
  parent: string;
  radius_km: number;
  color: string;
  rotation_hours: number;
  summary: string;
};

export type CosmosRecord = {
  id: string;
  name: string;
  aliases: string[];
  evidence: "waargenomen" | "model";
  realms: Realm[];
  kind: Kind;
  summary: string;
  place: string;
  color: string;
  ra?: number;
  dec?: number;
  ly?: number;
  radius_ly?: number | null;
  radius_m?: number | null;
  au?: number;
  au_min?: number;
  au_max?: number;
  size_note?: string;
  marker?: boolean;
};

export type StarRecord = {
  hip: number;
  name: string;
  aliases: string[];
  mag: number;
  ra: number;
  dec: number;
  ly: number;
  spect: string;
  note?: string;
};

export const planets = orbitalJson.planets as PlanetRecord[];
export const moons = orbitalJson.moons as MoonRecord[];
export const pluto = orbitalJson.pluto as MoonRecord;
export const sun = orbitalJson.sun;
export const cosmos = cosmosJson.objects as CosmosRecord[];
export const filaments = cosmosJson.filaments as [string, string][];
export const stars = starsJson.stars as StarRecord[];

const SOLAR_REALMS: Realm[] = ["zonnestelsel"];

function objectBase(
  partial: Omit<SpaceObject, "search"> & { aliases?: string[] },
): SpaceObject {
  const aliases = partial.aliases ?? [];
  const search = [partial.name, ...aliases, partial.summary, partial.kind]
    .join(" ")
    .toLocaleLowerCase("nl");
  return { ...partial, aliases, search };
}

function km(radiusKm: number) {
  return radiusKm * 1000;
}

const bodies: SpaceObject[] = [
  objectBase({
    id: sun.id,
    name: sun.name,
    aliases: ["Sun", "Sol"],
    evidence: "waargenomen",
    realms: SOLAR_REALMS,
    kind: "zon",
    summary: sun.summary,
    radiusM: km(sun.radius_km),
    sizeNote: null,
    color: sun.color,
  }),
  ...planets.map((p) =>
    objectBase({
      id: p.id,
      name: p.name,
      aliases: [],
      evidence: "waargenomen" as const,
      realms: SOLAR_REALMS,
      kind: "planeet" as const,
      summary: p.summary,
      radiusM: km(p.radius_km),
      sizeNote: null,
      color: p.color,
    }),
  ),
  ...moons.map((m) =>
    objectBase({
      id: m.id,
      name: m.name,
      aliases: [],
      evidence: "waargenomen" as const,
      realms: SOLAR_REALMS,
      kind: "maan" as const,
      summary: m.summary,
      radiusM: km(m.radius_km),
      sizeNote: null,
      color: m.color,
    }),
  ),
  objectBase({
    id: pluto.id,
    name: pluto.name,
    aliases: ["134340"],
    evidence: "waargenomen",
    realms: SOLAR_REALMS,
    kind: "dwergplaneet",
    summary: pluto.summary,
    radiusM: km(pluto.radius_km),
    sizeNote: null,
    color: pluto.color,
  }),
  objectBase({
    id: SATURN_RING_ID,
    name: "Ringen van Saturnus",
    aliases: ["Saturnusringen", "Cassinischeiding"],
    evidence: "waargenomen",
    realms: SOLAR_REALMS,
    kind: "ringen",
    summary:
      "De hoofdringen, van de binnenrand van de C-ring tot de buitenrand van de A-ring, met de Cassinischeiding ertussen. Ze horen bij Saturnus en hebben geen eigen baan om de zon.",
    radiusM: km(SATURN_RINGS_KM.aOuter),
    sizeNote: "van 74.658 tot 136.775 km vanaf het midden van Saturnus",
    color: "#e4d2a4",
  }),
];

const cosmicObjects: SpaceObject[] = cosmos.map((c) =>
  objectBase({
    id: c.id,
    name: c.name,
    aliases: c.aliases,
    evidence: c.evidence,
    realms: c.realms,
    kind: c.kind,
    summary: c.summary,
    radiusM:
      c.radius_m != null
        ? c.radius_m
        : c.radius_ly != null
          ? c.radius_ly * 9.4607304725808e15
          : null,
    sizeNote: c.size_note ?? null,
    color: c.color,
  }),
);

const starObjects: SpaceObject[] = stars.map((s) =>
  objectBase({
    id: `hip-${s.hip}`,
    name: s.name,
    aliases: [...s.aliases, `HIP ${s.hip}`],
    evidence: "waargenomen",
    realms: ["sterren"],
    kind: "ster",
    summary: s.note
      ? s.note
      : `${s.spect || "spectrum onbekend"}. Afstand uit de Hipparcos-parallax. Voor verre sterren is die grof. De lichtstip is geen ware doorsnee.`,
    radiusM: null,
    sizeNote: null,
    color: spectralColor(s.spect),
    mag: s.mag,
    spect: s.spect,
  }),
);

export const objects: SpaceObject[] = [...bodies, ...cosmicObjects, ...starObjects];

const byId = new Map(objects.map((o) => [o.id, o]));

export function getObject(id: string) {
  return byId.get(id);
}

export function spectralColor(spect: string) {
  const c = spect.trim()[0]?.toUpperCase();
  switch (c) {
    case "O":
      return "#9bb0ff";
    case "B":
      return "#aabfff";
    case "A":
      return "#cad7ff";
    case "F":
      return "#f7f3ff";
    case "G":
      return "#ffe6c4";
    case "K":
      return "#ffc48a";
    case "M":
      return "#ff9a73";
    default:
      return "#ffe9d2";
  }
}

export function starById(id: string) {
  if (!id.startsWith("hip-")) return undefined;
  const hip = Number(id.slice(4));
  return stars.find((s) => s.hip === hip);
}

export const planetById = new Map(planets.map((p) => [p.id, p]));
export const moonById = new Map(moons.map((m) => [m.id, m]));
export const cosmosById = new Map(cosmos.map((c) => [c.id, c]));

export function beltRadiiAu(id: "planetoidengordel" | "kuipergordel") {
  const c = cosmosById.get(id);
  return { min: c?.au_min ?? 2, max: c?.au_max ?? 3 };
}
