export const MUSCLE_NAMES: Record<string, string> = {
  // outline
  "outline-front": "正面轮廓",
  "outline-back": "背面轮廓",

  // head / neck
  sternocleidomastoid: "胸锁乳突肌",

  // shoulder / upper back
  trapezius_upper: "斜方肌上束",
  trapezius_middle: "斜方肌中束",
  trapezius_lower: "斜方肌下束",
  anterior_deltoid: "三角肌前束",
  lateral_deltoid: "三角肌中束",
  posterior_deltoid: "三角肌后束",
  infraspinatus: "冈下肌（肩袖）",

  // chest / abs / back
  pectoralis_major: "胸大肌",
  rectus_abdominis: "腹直肌中带",
  rectus_abdominis_l: "腹直肌",
  rectus_abdominis_r: "腹直肌",
  external_oblique: "腹外斜肌",
  latissimus_dorsi: "背阔肌",

  // arms
  biceps_brachii_caput_longum: "肱二头肌长头",
  biceps_brachii_caput_breve: "肱二头肌短头",
  triceps_brachii_caput_longum: "肱三头肌长头",
  triceps_brachii_caput_laterale: "肱三头肌外侧头",
  triceps_brachii_caput_mediale: "肱三头肌内侧头",
  brachioradialis: "肱桡肌",
  anconeus: "肘肌",

  // forearm
  pronator_teres: "旋前圆肌",
  pronator_quadratus: "旋前方肌",
  flexor_carpi_radialis: "桡侧腕屈肌",
  flexor_carpi_ulnaris: "尺侧腕屈肌",
  flexor_digitorum_superficialis: "指浅屈肌",
  palmaris_longus: "掌长肌",
  extensor_carpi_radialis_longus: "桡侧腕长伸肌",
  extensor_carpi_ulnaris: "尺侧腕伸肌",
  extensor_digitorum: "指总伸肌",

  // gluteal / hip
  gluteus_maximus: "臀大肌",
  gluteus_medius: "臀中肌",

  // adductors / inner thigh
  adductor_longus: "长收肌",
  adductor_magnus: "大收肌",
  pectineus: "耻骨肌",
  gracilis: "股薄肌",
  sartoris: "缝匠肌",

  // quadriceps
  rectus_femoris: "股直肌",
  vastus_lateralis: "股外侧肌",
  vastus_medialis: "股内侧肌",

  // hamstrings
  biceps_femoris: "股二头肌",
  semitendinosus: "半腱肌",
  semimembranosus: "半膜肌",

  // IT band
  iliotibial_tract: "髂胫束",

  // shins / lower leg
  tibialis_anterior: "胫骨前肌",
  fibularis_longus: "腓骨长肌",
  extensor_hallucis_longus: "拇长伸肌",
  extensor_digitorum_longus: "趾长伸肌",
  gastrocnemius: "腓肠肌",
};

export interface MuscleSubdivision {
  groupName: string;
  subs: string[];
}

export const MUSCLE_SUBDIVISIONS: Record<string, MuscleSubdivision> = {
  gastrocnemius: {
    groupName: "腓肠肌 / 比目鱼肌",
    subs: ["腓肠肌", "比目鱼肌（深层）"],
  },
  rectus_femoris: {
    groupName: "股直肌 / 股中间肌",
    subs: ["股直肌", "股中间肌（深层）"],
  },
  external_oblique: {
    groupName: "腹外斜肌 / 腹内斜肌",
    subs: ["腹外斜肌", "腹内斜肌（深层）"],
  },
  gluteus_medius: {
    groupName: "臀中肌 / 臀小肌",
    subs: ["臀中肌", "臀小肌（深层）"],
  },
};

export const stripSideSuffix = (id: string): string => {
  if (id.endsWith("_l") || id.endsWith("_r")) return id.slice(0, -2);
  return id;
};

export const getMuscleAnatomicalSide = (
  id: string,
): "left" | "right" | "center" => {
  if (id.endsWith("_l")) return "left";
  if (id.endsWith("_r")) return "right";
  return "center";
};

export const getMuscleDisplayName = (id: string): string => {
  if (MUSCLE_NAMES[id]) return MUSCLE_NAMES[id];
  const base = stripSideSuffix(id);
  return MUSCLE_NAMES[base] ?? base;
};
