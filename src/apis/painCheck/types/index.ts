/**
 * 跑步伤痛自查接口共享类型，与后端 /api/painCheck 保持一致
 */

export interface PainPointPayload {
  muscleName: string;
  anatomicalSide?: "left" | "right" | "center";
  viewSide: "front" | "back";
  subMuscles?: string[];
  painType: string;
  severity: number;
  triggers: string[];
  notes?: string;
}

export interface RunnerProfilePayload {
  gender?: "male" | "female";
  height?: number;
  weight?: number;
  age?: number;
  weeklyMileage?: number;
  yearsRunning?: number;
}

export interface AnalyzeRequestBody {
  painPoints: PainPointPayload[];
  profile?: RunnerProfilePayload;
}

export type AnalyzeStreamEvent =
  | { type: "reasoning"; content: string }
  | { type: "delta"; content: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface RecoveryPlanItem {
  title: string;
  frequencyPerWeek: number;
  duration?: string;
  note?: string;
}

export type RecoverySeverity = "mild" | "moderate" | "severe";

export interface RecoveryPlan {
  diagnosisLabel: string;
  severity: RecoverySeverity;
  suggestRecovery: boolean;
  durationDays: number;
  items: RecoveryPlanItem[];
}

export interface CreateRecordPayload {
  painPoints: PainPointPayload[];
  profile?: RunnerProfilePayload;
  reportText: string;
  reasoning?: string;
  plan: RecoveryPlan;
}

export interface PainCheckRecordSummary {
  id: string;
  diagnosisLabel: string;
  severity: RecoverySeverity;
  suggestRecovery: boolean;
  durationDays: number;
  status: "active" | "cured" | "expired";
  reminderEnabled: boolean;
  subscribeQuota: number;
  /** 北京时间一天中的分钟数，步长 30 */
  remindTime: number;
  nextNotifyAt: string | null;
  lastCheckInAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PainCheckCheckInItem {
  id: string;
  checkInDate: string;
  completedItems: string[] | null;
  note: string | null;
  createdAt: string;
}

export interface PainCheckRecordDetail extends PainCheckRecordSummary {
  painPoints: PainPointPayload[];
  profileSnapshot: RunnerProfilePayload | null;
  reportText: string;
  reasoning: string | null;
  planItems: RecoveryPlanItem[];
  checkIns: PainCheckCheckInItem[];
}

export interface CheckInPayload {
  completedItems?: string[];
  note?: string;
  subscribeAccepted?: number;
  remindTime?: number;
}

export interface SubscribePayload {
  accepted: number;
  remindTime?: number;
}
