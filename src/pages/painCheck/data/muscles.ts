import rawData from "./muscles-atlas.json";
import {
  MUSCLE_NAMES,
  getMuscleAnatomicalSide,
  getMuscleDisplayName,
} from "./muscle-names";

export type BodySide = "front" | "back";

export interface BBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface RawMusclePath {
  id: string;
  view: BodySide;
  d: string;
  transform?: string;
}

export interface SubPath {
  d: string;
  side: BodySide;
  bbox: BBox;
}

export interface MuscleEntry {
  id: string;
  baseId: string;
  view: BodySide;
  name: string;
  anatomicalSide: "left" | "right" | "center";
  d: string;
  transform?: string;
  subpaths: SubPath[];
}

const NUM_RE = /-?\d+\.?\d*(?:[eE][+-]?\d+)?/g;
const TRANSFORM_RE = /matrix\(([^)]+)\)/;

const parseMatrix = ({
  transform,
}: {
  transform?: string;
}): [number, number, number, number, number, number] | null => {
  if (!transform) return null;
  const m = TRANSFORM_RE.exec(transform);
  if (!m) return null;
  const nums = m[1].match(NUM_RE)?.map(Number) ?? [];
  if (nums.length < 6) return null;
  return [nums[0], nums[1], nums[2], nums[3], nums[4], nums[5]];
};

const applyMat = (
  x: number,
  y: number,
  m: ReturnType<typeof parseMatrix>,
): [number, number] => {
  if (!m) return [x, y];
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
};

const computeBbox = ({
  d,
  transform,
}: {
  d: string;
  transform?: string;
}): BBox => {
  const mat = parseMatrix({ transform });
  const nums = d.match(NUM_RE)?.map(Number) ?? [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const [x, y] = applyMat(nums[i], nums[i + 1], mat);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, maxX, minY, maxY };
};

const splitSubpaths = ({
  d,
  transform,
  side,
}: {
  d: string;
  transform?: string;
  side: BodySide;
}): SubPath[] => {
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i < d.length; i += 1) {
    const ch = d[i];
    if (ch === "M" || ch === "m") {
      parts.push(d.substring(start, i));
      start = i;
    }
  }
  parts.push(d.substring(start));
  return parts
    .filter((sd) => sd.trim().length > 0)
    .map((sd) => ({
      d: sd,
      side,
      bbox: computeBbox({ d: sd, transform }),
    }));
};

const enrich = (p: RawMusclePath): MuscleEntry => {
  const baseId = p.id.startsWith("outline-")
    ? p.id
    : p.id.replace(/_l$|_r$/, "");
  return {
    id: p.id,
    baseId,
    view: p.view,
    name: getMuscleDisplayName(p.id),
    anatomicalSide: getMuscleAnatomicalSide(p.id),
    d: p.d,
    transform: p.transform,
    subpaths: splitSubpaths({ d: p.d, transform: p.transform, side: p.view }),
  };
};

const enriched = (rawData as RawMusclePath[]).map(enrich);

export const OUTLINES: MuscleEntry[] = enriched.filter((e) =>
  e.id.startsWith("outline-"),
);

export const MUSCLES: MuscleEntry[] = enriched.filter(
  (e) => !e.id.startsWith("outline-"),
);

export const SIDE_VIEWPORT: Record<
  BodySide,
  { offsetX: number; offsetY: number; width: number; height: number }
> = {
  front: { offsetX: 0, offsetY: 0, width: 587, height: 1137 },
  back: { offsetX: 0, offsetY: 0, width: 596, height: 1133 },
};

export { MUSCLE_NAMES };
