export type Evidence = "waargenomen" | "model";

export type Realm =
  | "zonnestelsel"
  | "buitengebied"
  | "sterren"
  | "melkweg"
  | "lokale-groep"
  | "supercluster"
  | "heelal";

export type Kind =
  | "zon"
  | "planeet"
  | "maan"
  | "dwergplaneet"
  | "gordel"
  | "ringen"
  | "ster"
  | "stelsel"
  | "cluster"
  | "structuur"
  | "zwart-gat";

export type Vec = { x: number; y: number; z: number };

export type SpaceObject = {
  id: string;
  name: string;
  aliases: string[];
  evidence: Evidence;
  realms: Realm[];
  kind: Kind;
  summary: string;
  radiusM: number | null;
  sizeNote: string | null;
  color: string;
  mag?: number;
  spect?: string;
  search: string;
};
