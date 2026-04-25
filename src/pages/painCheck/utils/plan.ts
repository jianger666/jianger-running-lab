import type {
  RecoveryPlan,
  RecoveryPlanItem,
  RecoverySeverity,
} from "../../../apis/painCheck/types";



const SEVERITY_VALUES: RecoverySeverity[] = ["mild", "moderate", "severe"];

const JSON_FENCE_REGEX = /```json\s*([\s\S]*?)```/i;

/**
 * 把 AI 流式输出过程中的 markdown 与 JSON 块拆开
 * - 找不到 ```json 时整体当 markdown
 * - 找到但还在写时（没闭合 ```），返回 fence 之前的内容
 */
export const splitReportAndPlan = ({
  raw,
}: {
  raw: string;
}): { markdown: string; planRaw: string | null } => {
  if (!raw) return { markdown: "", planRaw: null };
  const match = raw.match(JSON_FENCE_REGEX);
  if (match) {
    const before = raw.slice(0, match.index ?? 0);
    return { markdown: before.trim(), planRaw: match[1].trim() };
  }
  // 流式过程中可能 ```json 已经出现但还没闭合，主动截断到 ```json 之前
  const fenceStartIdx = raw.indexOf("```json");
  if (fenceStartIdx >= 0) {
    return { markdown: raw.slice(0, fenceStartIdx).trim(), planRaw: null };
  }
  return { markdown: raw.trim(), planRaw: null };
};

const sanitizeItem = ({
  raw,
}: {
  raw: unknown;
}): RecoveryPlanItem | null => {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  const title = typeof x.title === "string" ? x.title.trim() : "";
  const freq = Number(x.frequencyPerWeek);
  if (!title || !Number.isFinite(freq)) return null;
  return {
    title: title.slice(0, 24),
    frequencyPerWeek: Math.max(1, Math.min(7, Math.round(freq))),
    duration:
      typeof x.duration === "string" ? x.duration.slice(0, 30) : undefined,
    note: typeof x.note === "string" ? x.note.slice(0, 60) : undefined,
  };
};

/** 把 AI 输出的 JSON 字符串安全解析成 RecoveryPlan */
export const parseRecoveryPlan = ({
  raw,
}: {
  raw: string | null;
}): RecoveryPlan | null => {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const x = parsed as Record<string, unknown>;
  const diagnosisLabel =
    typeof x.diagnosisLabel === "string" ? x.diagnosisLabel.trim() : "";
  const severity = SEVERITY_VALUES.includes(x.severity as RecoverySeverity)
    ? (x.severity as RecoverySeverity)
    : "moderate";
  const suggestRecovery =
    typeof x.suggestRecovery === "boolean" ? x.suggestRecovery : true;
  const durationDaysRaw = Number(x.durationDays);
  const durationDays = Number.isFinite(durationDaysRaw)
    ? Math.max(7, Math.min(28, Math.round(durationDaysRaw)))
    : 14;
  const itemsRaw = Array.isArray(x.items) ? x.items : [];
  const items = itemsRaw
    .map((it) => sanitizeItem({ raw: it }))
    .filter((it): it is RecoveryPlanItem => it !== null);

  if (!diagnosisLabel) return null;
  return {
    diagnosisLabel: diagnosisLabel.slice(0, 24),
    severity,
    suggestRecovery: severity === "severe" ? false : suggestRecovery,
    durationDays,
    items: severity === "severe" ? [] : items,
  };
};
