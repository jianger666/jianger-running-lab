export type SvgTransform = [number, number, number, number, number, number];

const TOKEN_RE =
  /([MLHVCSQTAZmlhvcsqtaz])|(-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/g;

const parseTransform = ({
  transform,
}: {
  transform?: string;
}): SvgTransform | null => {
  if (!transform) return null;
  const m = transform.match(/matrix\(([^)]+)\)/);
  if (!m) return null;
  const nums = m[1]
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
  if (nums.length !== 6) return null;
  return nums as SvgTransform;
};

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const applyMatrix = ({
  x,
  y,
  t,
  vp,
}: {
  x: number;
  y: number;
  t: SvgTransform | null;
  vp: Viewport;
}): [number, number] => {
  let nx = x;
  let ny = y;
  if (t) {
    const [a, b, c, d, e, f] = t;
    nx = a * x + c * y + e;
    ny = b * x + d * y + f;
  }
  return [(nx - vp.offsetX) * vp.scale, (ny - vp.offsetY) * vp.scale];
};

interface BuildPathParams {
  ctx: CanvasRenderingContext2D;
  d: string;
  transform?: string;
  viewport: Viewport;
}

// Approximate an SVG arc as a series of cubic Bezier curves.
const arcToBeziers = ({
  x1,
  y1,
  rx,
  ry,
  xRotDeg,
  largeArc,
  sweep,
  x2,
  y2,
}: {
  x1: number;
  y1: number;
  rx: number;
  ry: number;
  xRotDeg: number;
  largeArc: boolean;
  sweep: boolean;
  x2: number;
  y2: number;
}): Array<[number, number, number, number, number, number]> => {
  if (rx === 0 || ry === 0) return [];
  const phi = (xRotDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;
  let rxs = rx * rx;
  let rys = ry * ry;
  const x1ps = x1p * x1p;
  const y1ps = y1p * y1p;
  const radii = x1ps / rxs + y1ps / rys;
  if (radii > 1) {
    const sq = Math.sqrt(radii);
    rx *= sq;
    ry *= sq;
    rxs = rx * rx;
    rys = ry * ry;
  }
  const sign = largeArc === sweep ? -1 : 1;
  const numerator = rxs * rys - rxs * y1ps - rys * x1ps;
  const factor =
    sign * Math.sqrt(Math.max(0, numerator / (rxs * y1ps + rys * x1ps)));
  const cxp = (factor * (rx * y1p)) / ry;
  const cyp = (factor * -(ry * x1p)) / rx;
  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
  const angle = (ux: number, uy: number, vx: number, vy: number) => {
    const dot = ux * vx + uy * vy;
    const len = Math.sqrt(ux * ux + uy * uy) * Math.sqrt(vx * vx + vy * vy);
    let ang = Math.acos(Math.min(1, Math.max(-1, dot / len)));
    if (ux * vy - uy * vx < 0) ang = -ang;
    return ang;
  };
  const theta1 = angle(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
  let deltaTheta =
    angle(
      (x1p - cxp) / rx,
      (y1p - cyp) / ry,
      (-x1p - cxp) / rx,
      (-y1p - cyp) / ry,
    ) % (2 * Math.PI);
  if (!sweep && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
  if (sweep && deltaTheta < 0) deltaTheta += 2 * Math.PI;

  const segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2));
  const delta = deltaTheta / segments;
  const t = (8 / 3) * Math.sin(delta / 4) * Math.sin(delta / 4) / Math.sin(delta / 2);

  const result: Array<[number, number, number, number, number, number]> = [];
  for (let s = 0; s < segments; s += 1) {
    const a1 = theta1 + s * delta;
    const a2 = a1 + delta;
    const cosA1 = Math.cos(a1);
    const sinA1 = Math.sin(a1);
    const cosA2 = Math.cos(a2);
    const sinA2 = Math.sin(a2);
    const px = cosPhi * rx * cosA1 - sinPhi * ry * sinA1 + cx;
    const py = sinPhi * rx * cosA1 + cosPhi * ry * sinA1 + cy;
    const ex = cosPhi * rx * cosA2 - sinPhi * ry * sinA2 + cx;
    const ey = sinPhi * rx * cosA2 + cosPhi * ry * sinA2 + cy;
    const c1x = px + (-cosPhi * rx * sinA1 - sinPhi * ry * cosA1) * t;
    const c1y = py + (-sinPhi * rx * sinA1 + cosPhi * ry * cosA1) * t;
    const c2x = ex - (-cosPhi * rx * sinA2 - sinPhi * ry * cosA2) * t;
    const c2y = ey - (-sinPhi * rx * sinA2 + cosPhi * ry * cosA2) * t;
    result.push([c1x, c1y, c2x, c2y, ex, ey]);
  }
  return result;
};

export const buildSvgPath = ({
  ctx,
  d,
  transform,
  viewport,
}: BuildPathParams): void => {
  const t = parseTransform({ transform });
  const vp = viewport;

  const tokens: Array<{ type: "cmd" | "num"; value: string | number }> = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(d))) {
    if (m[1]) tokens.push({ type: "cmd", value: m[1] });
    else tokens.push({ type: "num", value: Number(m[2]) });
  }

  let i = 0;
  let cmd = "";
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let lastCubicCtrlX: number | null = null;
  let lastCubicCtrlY: number | null = null;
  let lastQuadCtrlX: number | null = null;
  let lastQuadCtrlY: number | null = null;

  const nextNum = (): number => {
    const tok = tokens[i++];
    return tok.value as number;
  };

  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === "cmd") {
      cmd = tok.value as string;
      i += 1;
    }

    const isRel = cmd === cmd.toLowerCase();

    switch (cmd) {
      case "M":
      case "m": {
        const x = nextNum();
        const y = nextNum();
        const nx = isRel ? cx + x : x;
        const ny = isRel ? cy + y : y;
        const [px, py] = applyMatrix({ x: nx, y: ny, t, vp });
        ctx.moveTo(px, py);
        cx = nx;
        cy = ny;
        startX = nx;
        startY = ny;
        cmd = isRel ? "l" : "L";
        lastCubicCtrlX = lastCubicCtrlY = null;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      case "L":
      case "l": {
        const x = nextNum();
        const y = nextNum();
        const nx = isRel ? cx + x : x;
        const ny = isRel ? cy + y : y;
        const [px, py] = applyMatrix({ x: nx, y: ny, t, vp });
        ctx.lineTo(px, py);
        cx = nx;
        cy = ny;
        lastCubicCtrlX = lastCubicCtrlY = null;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      case "H":
      case "h": {
        const x = nextNum();
        const nx = isRel ? cx + x : x;
        const [px, py] = applyMatrix({ x: nx, y: cy, t, vp });
        ctx.lineTo(px, py);
        cx = nx;
        lastCubicCtrlX = lastCubicCtrlY = null;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      case "V":
      case "v": {
        const y = nextNum();
        const ny = isRel ? cy + y : y;
        const [px, py] = applyMatrix({ x: cx, y: ny, t, vp });
        ctx.lineTo(px, py);
        cy = ny;
        lastCubicCtrlX = lastCubicCtrlY = null;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      case "C":
      case "c": {
        const x1 = nextNum();
        const y1 = nextNum();
        const x2 = nextNum();
        const y2 = nextNum();
        const x = nextNum();
        const y = nextNum();
        const bx = isRel ? cx : 0;
        const by = isRel ? cy : 0;
        const c1x = bx + x1;
        const c1y = by + y1;
        const c2x = bx + x2;
        const c2y = by + y2;
        const ex = bx + x;
        const ey = by + y;
        const [p1x, p1y] = applyMatrix({ x: c1x, y: c1y, t, vp });
        const [p2x, p2y] = applyMatrix({ x: c2x, y: c2y, t, vp });
        const [px, py] = applyMatrix({ x: ex, y: ey, t, vp });
        ctx.bezierCurveTo(p1x, p1y, p2x, p2y, px, py);
        cx = ex;
        cy = ey;
        lastCubicCtrlX = c2x;
        lastCubicCtrlY = c2y;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      case "S":
      case "s": {
        const x2 = nextNum();
        const y2 = nextNum();
        const x = nextNum();
        const y = nextNum();
        const bx = isRel ? cx : 0;
        const by = isRel ? cy : 0;
        const c1x =
          lastCubicCtrlX != null ? 2 * cx - lastCubicCtrlX : cx;
        const c1y =
          lastCubicCtrlY != null ? 2 * cy - lastCubicCtrlY : cy;
        const c2x = bx + x2;
        const c2y = by + y2;
        const ex = bx + x;
        const ey = by + y;
        const [p1x, p1y] = applyMatrix({ x: c1x, y: c1y, t, vp });
        const [p2x, p2y] = applyMatrix({ x: c2x, y: c2y, t, vp });
        const [px, py] = applyMatrix({ x: ex, y: ey, t, vp });
        ctx.bezierCurveTo(p1x, p1y, p2x, p2y, px, py);
        cx = ex;
        cy = ey;
        lastCubicCtrlX = c2x;
        lastCubicCtrlY = c2y;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      case "Q":
      case "q": {
        const x1 = nextNum();
        const y1 = nextNum();
        const x = nextNum();
        const y = nextNum();
        const bx = isRel ? cx : 0;
        const by = isRel ? cy : 0;
        const c1x = bx + x1;
        const c1y = by + y1;
        const ex = bx + x;
        const ey = by + y;
        const [p1x, p1y] = applyMatrix({ x: c1x, y: c1y, t, vp });
        const [px, py] = applyMatrix({ x: ex, y: ey, t, vp });
        ctx.quadraticCurveTo(p1x, p1y, px, py);
        cx = ex;
        cy = ey;
        lastQuadCtrlX = c1x;
        lastQuadCtrlY = c1y;
        lastCubicCtrlX = lastCubicCtrlY = null;
        break;
      }
      case "T":
      case "t": {
        const x = nextNum();
        const y = nextNum();
        const bx = isRel ? cx : 0;
        const by = isRel ? cy : 0;
        const c1x = lastQuadCtrlX != null ? 2 * cx - lastQuadCtrlX : cx;
        const c1y = lastQuadCtrlY != null ? 2 * cy - lastQuadCtrlY : cy;
        const ex = bx + x;
        const ey = by + y;
        const [p1x, p1y] = applyMatrix({ x: c1x, y: c1y, t, vp });
        const [px, py] = applyMatrix({ x: ex, y: ey, t, vp });
        ctx.quadraticCurveTo(p1x, p1y, px, py);
        cx = ex;
        cy = ey;
        lastQuadCtrlX = c1x;
        lastQuadCtrlY = c1y;
        lastCubicCtrlX = lastCubicCtrlY = null;
        break;
      }
      case "A":
      case "a": {
        const rx = nextNum();
        const ry = nextNum();
        const xRot = nextNum();
        const largeArc = nextNum() !== 0;
        const sweep = nextNum() !== 0;
        const x = nextNum();
        const y = nextNum();
        const bx = isRel ? cx : 0;
        const by = isRel ? cy : 0;
        const ex = bx + x;
        const ey = by + y;
        const beziers = arcToBeziers({
          x1: cx,
          y1: cy,
          rx,
          ry,
          xRotDeg: xRot,
          largeArc,
          sweep,
          x2: ex,
          y2: ey,
        });
        for (const [c1x, c1y, c2x, c2y, x2, y2] of beziers) {
          const [p1x, p1y] = applyMatrix({ x: c1x, y: c1y, t, vp });
          const [p2x, p2y] = applyMatrix({ x: c2x, y: c2y, t, vp });
          const [px, py] = applyMatrix({ x: x2, y: y2, t, vp });
          ctx.bezierCurveTo(p1x, p1y, p2x, p2y, px, py);
        }
        cx = ex;
        cy = ey;
        lastCubicCtrlX = lastCubicCtrlY = null;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      case "Z":
      case "z": {
        ctx.closePath();
        cx = startX;
        cy = startY;
        lastCubicCtrlX = lastCubicCtrlY = null;
        lastQuadCtrlX = lastQuadCtrlY = null;
        break;
      }
      default: {
        i += 1;
        break;
      }
    }
  }
};
