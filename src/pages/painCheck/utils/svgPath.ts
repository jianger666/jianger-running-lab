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

const applyMatrix = ({
  x,
  y,
  t,
  scale,
}: {
  x: number;
  y: number;
  t: SvgTransform | null;
  scale: number;
}): [number, number] => {
  let nx = x;
  let ny = y;
  if (t) {
    const [a, b, c, d, e, f] = t;
    nx = a * x + c * y + e;
    ny = b * x + d * y + f;
  }
  return [nx * scale, ny * scale];
};

interface BuildPathParams {
  ctx: CanvasRenderingContext2D;
  d: string;
  transform?: string;
  scale?: number;
}

export const buildSvgPath = ({
  ctx,
  d,
  transform,
  scale = 1,
}: BuildPathParams): void => {
  const t = parseTransform({ transform });

  const tokens: Array<{ type: 'cmd' | 'num'; value: string | number }> = [];
  let m: RegExpExecArray | null;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(d))) {
    if (m[1]) tokens.push({ type: 'cmd', value: m[1] });
    else tokens.push({ type: 'num', value: Number(m[2]) });
  }

  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;

  const nextNum = () => {
    const tok = tokens[i++];
    return tok.value as number;
  };

  while (i < tokens.length) {
    const tok = tokens[i];
    if (tok.type === 'cmd') {
      cmd = tok.value as string;
      i += 1;
    }

    switch (cmd) {
      case 'M':
      case 'm': {
        const x = nextNum();
        const y = nextNum();
        const nx = cmd === 'm' ? cx + x : x;
        const ny = cmd === 'm' ? cy + y : y;
        const [px, py] = applyMatrix({ x: nx, y: ny, t, scale });
        ctx.moveTo(px, py);
        cx = nx;
        cy = ny;
        startX = nx;
        startY = ny;
        cmd = cmd === 'M' ? 'L' : 'l';
        break;
      }
      case 'L':
      case 'l': {
        const x = nextNum();
        const y = nextNum();
        const nx = cmd === 'l' ? cx + x : x;
        const ny = cmd === 'l' ? cy + y : y;
        const [px, py] = applyMatrix({ x: nx, y: ny, t, scale });
        ctx.lineTo(px, py);
        cx = nx;
        cy = ny;
        break;
      }
      case 'H':
      case 'h': {
        const x = nextNum();
        const nx = cmd === 'h' ? cx + x : x;
        const [px, py] = applyMatrix({ x: nx, y: cy, t, scale });
        ctx.lineTo(px, py);
        cx = nx;
        break;
      }
      case 'V':
      case 'v': {
        const y = nextNum();
        const ny = cmd === 'v' ? cy + y : y;
        const [px, py] = applyMatrix({ x: cx, y: ny, t, scale });
        ctx.lineTo(px, py);
        cy = ny;
        break;
      }
      case 'C':
      case 'c': {
        const x1 = nextNum();
        const y1 = nextNum();
        const x2 = nextNum();
        const y2 = nextNum();
        const x = nextNum();
        const y = nextNum();
        const base = cmd === 'c' ? { bx: cx, by: cy } : { bx: 0, by: 0 };
        const [p1x, p1y] = applyMatrix({
          x: base.bx + x1,
          y: base.by + y1,
          t,
          scale,
        });
        const [p2x, p2y] = applyMatrix({
          x: base.bx + x2,
          y: base.by + y2,
          t,
          scale,
        });
        const [px, py] = applyMatrix({
          x: base.bx + x,
          y: base.by + y,
          t,
          scale,
        });
        ctx.bezierCurveTo(p1x, p1y, p2x, p2y, px, py);
        cx = base.bx + x;
        cy = base.by + y;
        break;
      }
      case 'Z':
      case 'z': {
        ctx.closePath();
        cx = startX;
        cy = startY;
        break;
      }
      default: {
        i += 1;
        break;
      }
    }
  }
};
