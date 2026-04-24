import rawData from './muscles-male.json';

export interface MusclePath {
  id: string;
  d: string;
  transform?: string;
}

export interface MuscleInfo {
  id: string;
  name: string;
  category: 'outline' | 'shoulder' | 'torso' | 'arm' | 'leg';
}

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

export const OUTLINES = musclesRaw.filter((p) => p.id.startsWith('outline-'));

export const MUSCLES = musclesRaw.filter((p) => !p.id.startsWith('outline-'));

export const VIEW_BOX = {
  width: 1024,
  height: 1024,
};
