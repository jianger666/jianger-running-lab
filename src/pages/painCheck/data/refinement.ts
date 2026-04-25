export interface OptionItem {
  id: string;
  label: string;
}

export const OTHER_OPTION_ID = "other";

export const PAIN_TYPES: OptionItem[] = [
  { id: "ache", label: "酸胀" },
  { id: "tight", label: "紧绷" },
  { id: "dull", label: "钝痛" },
  { id: "sharp", label: "刺痛" },
  { id: "burning", label: "灼热" },
  { id: "tug", label: "拉扯/卡顿" },
  { id: "numb", label: "麻木/放射" },
  { id: "unknown", label: "说不上来" },
  { id: OTHER_OPTION_ID, label: "其它" },
];

export const TRIGGERS: OptionItem[] = [
  { id: "running", label: "跑步中" },
  { id: "afterRun", label: "跑步后" },
  { id: "accel", label: "加速/冲刺" },
  { id: "landing", label: "落地瞬间" },
  { id: "stairs", label: "上下楼梯/坡" },
  { id: "press", label: "按压触发" },
  { id: OTHER_OPTION_ID, label: "其它" },
];

export interface PainPoint {
  id: string;
  muscleId: string;
  muscleName: string;
  autoLabel: string;
  anatomicalSide?: "left" | "right" | "center";
  viewSide: "front" | "back";
  tapCanvasX: number;
  tapCanvasY: number;
  subMuscles: string[];
  painTypeId: string;
  severity: number;
  triggerIds: string[];
  notes: string;
}

export const createPainPoint = (
  params: Omit<
    PainPoint,
    "id" | "subMuscles" | "painTypeId" | "severity" | "triggerIds" | "notes"
  >,
): PainPoint => ({
  ...params,
  id: `${params.muscleId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  subMuscles: [],
  painTypeId: "",
  severity: 0,
  triggerIds: [],
  notes: "",
});
