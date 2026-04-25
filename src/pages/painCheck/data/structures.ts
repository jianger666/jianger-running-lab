import { BodySide } from "./muscles";

export interface StructurePin {
  id: string;
  groupName: string;
  subs: string[];
  view: BodySide;
  anatomicalSide: "left" | "right" | "center";
  anchorX: number;
  anchorY: number;
  labelDir: "left" | "right";
  labelY?: number;
}

export const composePinLabelLines = (subs: string[]): string[] => {
  if (subs.length === 0) return [];
  if (subs.length === 1) return [subs[0]];
  if (subs.length === 2) return [subs[0], subs[1]];
  return [subs[0], `${subs[1]} 等...`];
};

const FRONT_LEFT_OUT: "right" = "right";
const FRONT_RIGHT_OUT: "left" = "left";
const BACK_LEFT_OUT: "left" = "left";
const BACK_RIGHT_OUT: "right" = "right";

const KNEE_SUBS = [
  "髂胫束膝段",
  "髌骨",
  "髌腱",
  "鹅足",
  "内侧副韧带",
  "外侧副韧带",
];

const ANKLE_FOOT_SUBS = [
  "外踝",
  "内踝",
  "足背",
  "足弓",
  "前掌",
  "踝关节",
];

const ACHILLES_HEEL_SUBS = ["跟腱", "跟骨", "外踝后侧", "内踝后侧"];

const TIBIA_SUBS = ["胫骨骨面", "小腿内侧/胫前"];

const HIP_SUBS = ["髂腰肌（深层）", "腹股沟", "大转子"];

const POPLITEAL_SUBS = ["腘窝", "腘肌（深层）"];

const LUMBAR_SUBS = ["下腰部肌筋膜", "腰方肌（深层）"];

const SACRUM_SUBS = ["骶髂关节", "骶骨"];

const ISCHIAL_SUBS = ["坐骨结节", "腘绳肌起点"];

export const STRUCTURES: StructurePin[] = [
  {
    id: "hip-l",
    groupName: "髋部",
    subs: HIP_SUBS,
    view: "front",
    anatomicalSide: "left",
    anchorX: 322,
    anchorY: 542,
    labelDir: FRONT_LEFT_OUT,
    labelY: 720,
  },
  {
    id: "hip-r",
    groupName: "髋部",
    subs: HIP_SUBS,
    view: "front",
    anatomicalSide: "right",
    anchorX: 266,
    anchorY: 542,
    labelDir: FRONT_RIGHT_OUT,
    labelY: 720,
  },
  {
    id: "knee-l",
    groupName: "膝盖",
    subs: KNEE_SUBS,
    view: "front",
    anatomicalSide: "left",
    anchorX: 358,
    anchorY: 838,
    labelDir: FRONT_LEFT_OUT,
    labelY: 870,
  },
  {
    id: "knee-r",
    groupName: "膝盖",
    subs: KNEE_SUBS,
    view: "front",
    anatomicalSide: "right",
    anchorX: 230,
    anchorY: 838,
    labelDir: FRONT_RIGHT_OUT,
    labelY: 870,
  },
  {
    id: "tibialShaft-l",
    groupName: "胫骨",
    subs: TIBIA_SUBS,
    view: "front",
    anatomicalSide: "left",
    anchorX: 357,
    anchorY: 940,
    labelDir: FRONT_LEFT_OUT,
    labelY: 970,
  },
  {
    id: "tibialShaft-r",
    groupName: "胫骨",
    subs: TIBIA_SUBS,
    view: "front",
    anatomicalSide: "right",
    anchorX: 231,
    anchorY: 940,
    labelDir: FRONT_RIGHT_OUT,
    labelY: 970,
  },
  {
    id: "ankleFoot-l",
    groupName: "踝足",
    subs: ANKLE_FOOT_SUBS,
    view: "front",
    anatomicalSide: "left",
    anchorX: 358,
    anchorY: 1085,
    labelDir: FRONT_LEFT_OUT,
    labelY: 1085,
  },
  {
    id: "ankleFoot-r",
    groupName: "踝足",
    subs: ANKLE_FOOT_SUBS,
    view: "front",
    anatomicalSide: "right",
    anchorX: 230,
    anchorY: 1085,
    labelDir: FRONT_RIGHT_OUT,
    labelY: 1085,
  },

  {
    id: "lumbar",
    groupName: "下腰部",
    subs: LUMBAR_SUBS,
    view: "back",
    anatomicalSide: "center",
    anchorX: 298,
    anchorY: 400,
    labelDir: BACK_LEFT_OUT,
    labelY: 700,
  },
  {
    id: "sacrum",
    groupName: "腰骶",
    subs: SACRUM_SUBS,
    view: "back",
    anatomicalSide: "center",
    anchorX: 298,
    anchorY: 480,
    labelDir: BACK_RIGHT_OUT,
    labelY: 700,
  },
  {
    id: "ischial-l",
    groupName: "坐骨结节",
    subs: ISCHIAL_SUBS,
    view: "back",
    anatomicalSide: "left",
    anchorX: 262,
    anchorY: 605,
    labelDir: BACK_LEFT_OUT,
    labelY: 775,
  },
  {
    id: "ischial-r",
    groupName: "坐骨结节",
    subs: ISCHIAL_SUBS,
    view: "back",
    anatomicalSide: "right",
    anchorX: 334,
    anchorY: 605,
    labelDir: BACK_RIGHT_OUT,
    labelY: 775,
  },
  {
    id: "popliteal-l",
    groupName: "腘窝",
    subs: POPLITEAL_SUBS,
    view: "back",
    anatomicalSide: "left",
    anchorX: 234,
    anchorY: 772,
    labelDir: BACK_LEFT_OUT,
    labelY: 870,
  },
  {
    id: "popliteal-r",
    groupName: "腘窝",
    subs: POPLITEAL_SUBS,
    view: "back",
    anatomicalSide: "right",
    anchorX: 362,
    anchorY: 772,
    labelDir: BACK_RIGHT_OUT,
    labelY: 870,
  },
  {
    id: "achillesHeel-l",
    groupName: "跟腱足跟",
    subs: ACHILLES_HEEL_SUBS,
    view: "back",
    anatomicalSide: "left",
    anchorX: 230,
    anchorY: 1058,
    labelDir: BACK_LEFT_OUT,
    labelY: 1058,
  },
  {
    id: "achillesHeel-r",
    groupName: "跟腱足跟",
    subs: ACHILLES_HEEL_SUBS,
    view: "back",
    anatomicalSide: "right",
    anchorX: 366,
    anchorY: 1058,
    labelDir: BACK_RIGHT_OUT,
    labelY: 1058,
  },
];
