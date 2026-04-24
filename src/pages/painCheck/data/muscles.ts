import rawData from './muscles-male.json';

export interface MusclePath {
  id: string;
  d: string;
  transform?: string;
}

export interface SubPath {
  d: string;
  side: 'front' | 'back';
}

export interface MuscleWithSubpaths extends MusclePath {
  subpaths: SubPath[];
}

export interface MuscleInfo {
  id: string;
  name: string;
  category: 'outline' | 'shoulder' | 'torso' | 'arm' | 'leg';
}

export type BodySide = 'front' | 'back';

const musclesRaw = rawData as MusclePath[];

export const MUSCLE_META: Record<string, MuscleInfo> = {
  'outline-back': { id: 'outline-back', name: '背面轮廓', category: 'outline' },
  'outline-front': {
    id: 'outline-front',
    name: '正面轮廓',
    category: 'outline',
  },
  neck: { id: 'neck', name: '颈部', category: 'shoulder' },
  traps: { id: 'traps', name: '斜方肌', category: 'shoulder' },
  frontDelts: { id: 'frontDelts', name: '三角肌前束', category: 'shoulder' },
  sideDelts: { id: 'sideDelts', name: '三角肌中束', category: 'shoulder' },
  rearDelts: { id: 'rearDelts', name: '三角肌后束', category: 'shoulder' },
  rotatorCuffs: { id: 'rotatorCuffs', name: '肩袖', category: 'shoulder' },
  chest: { id: 'chest', name: '胸肌', category: 'torso' },
  abs: { id: 'abs', name: '腹肌', category: 'torso' },
  obliques: { id: 'obliques', name: '腹斜肌', category: 'torso' },
  lats: { id: 'lats', name: '背阔肌', category: 'torso' },
  lowerBack: { id: 'lowerBack', name: '下背部', category: 'torso' },
  biceps: { id: 'biceps', name: '肱二头肌', category: 'arm' },
  triceps: { id: 'triceps', name: '肱三头肌', category: 'arm' },
  forearms: { id: 'forearms', name: '前臂', category: 'arm' },
  glutes: { id: 'glutes', name: '臀肌', category: 'leg' },
  abductors: { id: 'abductors', name: '髋外展肌', category: 'leg' },
  adductors: { id: 'adductors', name: '大腿内收肌', category: 'leg' },
  quads: { id: 'quads', name: '股四头肌', category: 'leg' },
  hamstrings: { id: 'hamstrings', name: '腘绳肌', category: 'leg' },
  calves: { id: 'calves', name: '小腿', category: 'leg' },
  shins: { id: 'shins', name: '胫骨前肌', category: 'leg' },
};

const NUM_RE = /-?\d+\.?\d*(?:[eE][+-]?\d+)?/g;

const splitSubpaths = ({ d }: { d: string }): SubPath[] => {
  const parts: string[] = [];
  let start = 0;
  for (let i = 1; i < d.length; i += 1) {
    const ch = d[i];
    if (ch === 'M' || ch === 'm') {
      parts.push(d.substring(start, i));
      start = i;
    }
  }
  parts.push(d.substring(start));
  return parts
    .filter((sd) => sd.trim().length > 0)
    .map((sd) => {
      const nums = sd.match(NUM_RE)?.map(Number) ?? [];
      const xs = nums.filter((_, i) => i % 2 === 0);
      const maxX = xs.length ? Math.max(...xs) : 0;
      const minX = xs.length ? Math.min(...xs) : 0;
      const midX = (minX + maxX) / 2;
      return { d: sd, side: midX < 500 ? 'front' : 'back' };
    });
};

const enrich = (p: MusclePath): MuscleWithSubpaths => ({
  ...p,
  subpaths: splitSubpaths({ d: p.d }),
});

export const OUTLINES: MuscleWithSubpaths[] = musclesRaw
  .filter((p) => p.id.startsWith('outline-'))
  .map(enrich);

export const MUSCLES: MuscleWithSubpaths[] = musclesRaw
  .filter((p) => !p.id.startsWith('outline-'))
  .map(enrich);

export const SIDE_VIEWPORT: Record<
  BodySide,
  {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  }
> = {
  front: { offsetX: 0, offsetY: 20, width: 512, height: 960 },
  back: { offsetX: 512, offsetY: 20, width: 512, height: 960 },
};
