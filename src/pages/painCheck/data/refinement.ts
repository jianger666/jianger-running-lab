export interface SubPositionOption {
  id: string;
  label: string;
}

export const MUSCLE_SUB_POSITIONS: Record<string, SubPositionOption[]> = {
  neck: [
    { id: 'left', label: '左侧' },
    { id: 'right', label: '右侧' },
    { id: 'back', label: '后侧' },
    { id: 'all', label: '整体' },
  ],
  traps: [
    { id: 'left', label: '左侧' },
    { id: 'right', label: '右侧' },
    { id: 'upper', label: '上束' },
    { id: 'middle', label: '中束' },
    { id: 'all', label: '整体' },
  ],
  frontDelts: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
    { id: 'both', label: '双侧' },
  ],
  sideDelts: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
    { id: 'both', label: '双侧' },
  ],
  rearDelts: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
    { id: 'both', label: '双侧' },
  ],
  rotatorCuffs: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
  ],
  chest: [
    { id: 'left', label: '左侧' },
    { id: 'right', label: '右侧' },
    { id: 'upper', label: '上胸' },
    { id: 'lower', label: '下胸' },
  ],
  abs: [
    { id: 'upper', label: '上腹' },
    { id: 'middle', label: '中腹' },
    { id: 'lower', label: '下腹' },
  ],
  obliques: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
  ],
  lats: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
    { id: 'both', label: '双侧' },
  ],
  lowerBack: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
    { id: 'center', label: '中央' },
    { id: 'both', label: '双侧' },
  ],
  biceps: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
  ],
  triceps: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
  ],
  forearms: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
  ],
  glutes: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
    { id: 'upper', label: '上部' },
    { id: 'deep', label: '深层(梨状肌)' },
    { id: 'both', label: '双侧' },
  ],
  abductors: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
  ],
  adductors: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
  ],
  quads: [
    { id: 'leftOuter', label: '左前外侧' },
    { id: 'leftInner', label: '左前内侧' },
    { id: 'leftAll', label: '左整体' },
    { id: 'rightOuter', label: '右前外侧' },
    { id: 'rightInner', label: '右前内侧' },
    { id: 'rightAll', label: '右整体' },
  ],
  hamstrings: [
    { id: 'leftOuter', label: '左外侧(股二头)' },
    { id: 'leftInner', label: '左内侧(半腱半膜)' },
    { id: 'leftAll', label: '左整体' },
    { id: 'rightOuter', label: '右外侧' },
    { id: 'rightInner', label: '右内侧' },
    { id: 'rightAll', label: '右整体' },
  ],
  calves: [
    { id: 'leftInnerSoleus', label: '左内侧(比目鱼肌)' },
    { id: 'leftOuterPeroneal', label: '左外侧(腓骨肌)' },
    { id: 'leftBackGastroc', label: '左后侧(腓肠肌)' },
    { id: 'leftAchilles', label: '左跟腱' },
    { id: 'rightInnerSoleus', label: '右内侧' },
    { id: 'rightOuterPeroneal', label: '右外侧' },
    { id: 'rightBackGastroc', label: '右后侧' },
    { id: 'rightAchilles', label: '右跟腱' },
  ],
  shins: [
    { id: 'left', label: '左' },
    { id: 'right', label: '右' },
    { id: 'both', label: '双侧' },
  ],
};

export interface PainTypeOption {
  id: string;
  label: string;
}

export const PAIN_TYPES: PainTypeOption[] = [
  { id: 'ache', label: '酸胀' },
  { id: 'tight', label: '紧绷' },
  { id: 'dull', label: '钝痛' },
  { id: 'sharp', label: '刺痛' },
  { id: 'burning', label: '灼热' },
  { id: 'tug', label: '拉扯感' },
  { id: 'numb', label: '麻木/放射' },
  { id: 'unknown', label: '说不上来' },
];

export const TRIGGERS: PainTypeOption[] = [
  { id: 'running', label: '跑步中' },
  { id: 'afterRun', label: '跑步后' },
  { id: 'press', label: '按压触诊' },
  { id: 'sitToStand', label: '久坐起立' },
  { id: 'morningStiff', label: '早晨僵硬' },
  { id: 'stairUp', label: '上楼梯' },
  { id: 'stairDown', label: '下坡/下楼梯' },
  { id: 'accel', label: '加速/冲刺' },
  { id: 'landing', label: '落地瞬间' },
];

export interface PainItem {
  muscleId: string;
  muscleName: string;
  subPositionIds: string[];
  painTypeId: string;
  severity: number;
  triggerIds: string[];
  notes: string;
}

export const getDefaultPainItem = ({
  muscleId,
  muscleName,
}: {
  muscleId: string;
  muscleName: string;
}): PainItem => ({
  muscleId,
  muscleName,
  subPositionIds: [],
  painTypeId: '',
  severity: 5,
  triggerIds: [],
  notes: '',
});
