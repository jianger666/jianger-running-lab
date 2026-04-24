export interface BodyPartMeta {
  id: string;
  name: string;
  category: 'head' | 'torso' | 'arm' | 'leg';
}

export const BODY_PARTS: BodyPartMeta[] = [
  { id: 'head', name: '头部', category: 'head' },
  { id: 'neck', name: '颈部', category: 'head' },
  { id: 'chest', name: '胸部', category: 'torso' },
  { id: 'abdomen', name: '腹部', category: 'torso' },
  { id: 'upperBack', name: '上背部', category: 'torso' },
  { id: 'lowerBack', name: '下背部/腰', category: 'torso' },
  { id: 'leftShoulder', name: '左肩', category: 'arm' },
  { id: 'rightShoulder', name: '右肩', category: 'arm' },
  { id: 'leftUpperArm', name: '左上臂', category: 'arm' },
  { id: 'rightUpperArm', name: '右上臂', category: 'arm' },
  { id: 'leftForearm', name: '左前臂', category: 'arm' },
  { id: 'rightForearm', name: '右前臂', category: 'arm' },
  { id: 'leftGlute', name: '左臀', category: 'leg' },
  { id: 'rightGlute', name: '右臀', category: 'leg' },
  { id: 'leftThighFront', name: '左大腿前侧(股四头)', category: 'leg' },
  { id: 'rightThighFront', name: '右大腿前侧(股四头)', category: 'leg' },
  { id: 'leftThighBack', name: '左大腿后侧(腘绳肌)', category: 'leg' },
  { id: 'rightThighBack', name: '右大腿后侧(腘绳肌)', category: 'leg' },
  { id: 'leftThighInner', name: '左大腿内侧(内收肌)', category: 'leg' },
  { id: 'rightThighInner', name: '右大腿内侧(内收肌)', category: 'leg' },
  { id: 'leftKnee', name: '左膝', category: 'leg' },
  { id: 'rightKnee', name: '右膝', category: 'leg' },
  { id: 'leftCalfOuter', name: '左小腿外侧', category: 'leg' },
  { id: 'rightCalfOuter', name: '右小腿外侧', category: 'leg' },
  { id: 'leftCalfInner', name: '左小腿内侧', category: 'leg' },
  { id: 'rightCalfInner', name: '右小腿内侧', category: 'leg' },
  { id: 'leftCalfBack', name: '左小腿后侧(腓肠肌)', category: 'leg' },
  { id: 'rightCalfBack', name: '右小腿后侧(腓肠肌)', category: 'leg' },
  { id: 'leftAchilles', name: '左跟腱', category: 'leg' },
  { id: 'rightAchilles', name: '右跟腱', category: 'leg' },
  { id: 'leftAnkle', name: '左踝', category: 'leg' },
  { id: 'rightAnkle', name: '右踝', category: 'leg' },
  { id: 'leftFoot', name: '左脚', category: 'leg' },
  { id: 'rightFoot', name: '右脚', category: 'leg' },
];

export const BODY_PART_MAP: Record<string, BodyPartMeta> = BODY_PARTS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<string, BodyPartMeta>,
);
