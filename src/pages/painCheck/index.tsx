import {
  View,
  Text,
  Canvas,
  Textarea,
  ScrollView,
  Picker,
} from "@tarojs/components";
import type { CanvasTouchEvent } from "@tarojs/components";
import { DeleteOutlined } from "@taroify/icons";
import Taro, { useReady } from "@tarojs/taro";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  MUSCLES,
  OUTLINES,
  SIDE_VIEWPORT,
  BodySide,
  MuscleEntry,
  SubPath,
} from "./data/muscles";
import {
  STRUCTURES,
  StructurePin,
  composePinLabelLines,
} from "./data/structures";
import { MUSCLE_SUBDIVISIONS } from "./data/muscle-names";
import {
  PAIN_TYPES,
  TRIGGERS,
  PainPoint,
  createPainPoint,
  OTHER_OPTION_ID,
} from "./data/refinement";
import { buildSvgPath } from "./utils/svgPath";
import { painCheckApi } from "../../apis/painCheck";
import type {
  PainPointPayload,
  RecoveryPlan,
  RunnerProfilePayload,
} from "../../apis/painCheck/types";
import { parseRecoveryPlan, splitReportAndPlan } from "./utils/plan";
import { profileApi } from "../../apis/profile";
import type { UserProfile } from "../../apis/profile/types";
import {
  DEFAULT_REMIND_TIME,
  REMIND_TIME_OPTIONS,
  formatRemindTime,
  remindTimeFromIndex,
  remindTimeToIndex,
} from "../../utils/remindTime";
import "./index.scss";

interface ReportState {
  status: "idle" | "streaming" | "done" | "error";
  text: string;
  reasoning: string;
  reasoningOpen: boolean;
  error: string;
  plan: RecoveryPlan | null;
  saveStatus: "idle" | "saving" | "saved";
  savedRecordId: string | null;
  reminderEnabled: boolean;
  enablingReminder: boolean;
  reminderModalOpen: boolean;
  remindTime: number;
}

const INITIAL_REPORT: ReportState = {
  status: "idle",
  text: "",
  reasoning: "",
  reasoningOpen: false,
  error: "",
  plan: null,
  saveStatus: "idle",
  savedRecordId: null,
  reminderEnabled: false,
  enablingReminder: false,
  reminderModalOpen: false,
  remindTime: DEFAULT_REMIND_TIME,
};

interface MarkdownBlock {
  type: "h1" | "h2" | "h3" | "li" | "hr" | "em" | "p";
  content: string;
}

const parseMarkdown = ({ text }: { text: string }): MarkdownBlock[] => {
  return text.split("\n").map((raw) => {
    const line = raw.replace(/\s+$/, "");
    if (!line) return { type: "p", content: "" };
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      if (level === 1) return { type: "h1", content };
      if (level === 2) return { type: "h2", content };
      return { type: "h3", content };
    }
    if (/^[-*_]{3,}\s*$/.test(line)) return { type: "hr", content: "" };
    if (/^\s*[-*+]\s+/.test(line))
      return { type: "li", content: line.replace(/^\s*[-*+]\s+/, "") };
    if (/^\s*\d+[\.\)]\s+/.test(line))
      return { type: "li", content: line.replace(/^\s*\d+[\.\)]\s+/, "") };
    if (/^>\s*/.test(line))
      return { type: "p", content: line.replace(/^>\s*/, "") };
    if (line.startsWith("*") && line.endsWith("*") && line.length > 2) {
      return { type: "em", content: line.slice(1, -1) };
    }
    return { type: "p", content: line };
  });
};

const stripInline = ({ text }: { text: string }) =>
  text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/(?:^|\s)\*(\S(?:.*?\S)?)\*(?=\s|[，。、！？,.\!\?:;)）】]|$)/g, " $1")
    .replace(/(?:^|\s)_(\S(?:.*?\S)?)_(?=\s|[，。、！？,.\!\?:;)）】]|$)/g, " $1")
    .replace(/^\s+/, "");

const calculateAge = ({ birthday }: { birthday: string | null }) => {
  if (!birthday) return undefined;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && now.getDate() < birth.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age <= 120 ? age : undefined;
};

const buildProfilePayload = ({
  user,
}: {
  user: UserProfile | null;
}): RunnerProfilePayload | undefined => {
  if (!user) return undefined;
  const payload: RunnerProfilePayload = {};
  if (user.gender === "male" || user.gender === "female") {
    payload.gender = user.gender;
  }
  if (typeof user.height === "number" && user.height > 0) {
    payload.height = user.height;
  }
  if (typeof user.weight === "number" && user.weight > 0) {
    payload.weight = user.weight;
  }
  const age = calculateAge({ birthday: user.birthday });
  if (age !== undefined) payload.age = age;
  return Object.keys(payload).length > 0 ? payload : undefined;
};

interface CanvasInfo {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  cssWidth: number;
  cssHeight: number;
}

interface Viewport {
  scale: number;
  offsetX: number;
  offsetY: number;
}

const getViewport = ({
  side,
  internalWidth,
}: {
  side: BodySide;
  internalWidth: number;
}): Viewport => {
  const vp = SIDE_VIEWPORT[side];
  return {
    scale: internalWidth / vp.width,
    offsetX: vp.offsetX,
    offsetY: vp.offsetY,
  };
};

const composeAutoLabel = ({
  anatomicalSide,
  muscleName,
  subMuscles,
}: {
  anatomicalSide?: "left" | "right" | "center";
  muscleName: string;
  subMuscles?: string[];
}) => {
  let prefix = "";
  if (anatomicalSide === "left") prefix = "左";
  else if (anatomicalSide === "right") prefix = "右";
  if (subMuscles && subMuscles.length > 0) {
    if (subMuscles.length === 1) return `${prefix}${subMuscles[0]}`;
    if (subMuscles.length === 2)
      return `${prefix}${subMuscles[0]}、${subMuscles[1]}`;
    return `${prefix}${subMuscles[0]}、${subMuscles[1]} 等 ${subMuscles.length} 处`;
  }
  const base = `${prefix}${muscleName}`;
  return base;
};

const getSeverityTier = ({ value }: { value: number }) => {
  if (value <= 3) return "low";
  if (value <= 6) return "mid";
  return "high";
};

const getSeverityLabel = (value: number) => {
  if (value <= 3) return "轻微";
  if (value <= 6) return "影响跑步";
  return "严重";
};

const PainCheck = () => {
  const [points, setPoints] = useState<PainPoint[]>([]);
  const [side, setSide] = useState<BodySide>("front");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<PainPoint | null>(null);
  const [report, setReport] = useState<ReportState>(INITIAL_REPORT);
  const canvasRef = useRef<CanvasInfo | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const pinRectsRef = useRef<
    Map<string, { x: number; y: number; w: number; h: number }>
  >(new Map());
  const analyzeHandleRef = useRef<{ abort: () => void } | null>(null);
  const lastAnalyzePayloadRef = useRef<{
    painPoints: PainPointPayload[];
    profile?: RunnerProfilePayload;
  } | null>(null);

  const drawAll = useCallback(
    ({
      currentSide,
      currentPoints,
      currentDraft,
    }: {
      currentSide: BodySide;
      currentPoints: PainPoint[];
      currentDraft: PainPoint | null;
    }) => {
      const info = canvasRef.current;
      if (!info) return;
      const { ctx, dpr, cssWidth, cssHeight } = info;
      const internalWidth = cssWidth * dpr;
      const internalHeight = cssHeight * dpr;
      const viewport = getViewport({ side: currentSide, internalWidth });

      ctx.clearRect(0, 0, internalWidth, internalHeight);

      const outline = OUTLINES.find((o) => o.view === currentSide);
      if (outline) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        ctx.beginPath();
        buildSvgPath({
          ctx,
          d: outline.d,
          transform: outline.transform,
          viewport,
        });
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        buildSvgPath({
          ctx,
          d: outline.d,
          transform: outline.transform,
          viewport,
        });
        ctx.stroke();
      }

      const highlightActive =
        currentDraft && currentDraft.viewSide === currentSide;
      const markedIds = new Set(
        currentPoints
          .filter((p) => p.viewSide === currentSide)
          .map((p) => p.muscleId),
      );

      MUSCLES.forEach((m) => {
        if (m.view !== currentSide) return;
        const isDraftMatch =
          highlightActive && currentDraft.muscleId === m.id;
        const isMarked = markedIds.has(m.id);
        const highlight = isDraftMatch || isMarked;
        ctx.fillStyle = isDraftMatch
          ? "rgba(255, 94, 142, 0.85)"
          : isMarked
            ? "rgba(255, 94, 142, 0.7)"
            : "rgba(243, 121, 158, 0.22)";
        ctx.strokeStyle = highlight
          ? "rgba(255, 255, 255, 1)"
          : "rgba(255, 255, 255, 0.38)";
        ctx.lineWidth = highlight ? 2 : 1;
        m.subpaths.forEach((sp) => {
          ctx.beginPath();
          buildSvgPath({
            ctx,
            d: sp.d,
            transform: m.transform,
            viewport,
          });
          ctx.fill();
          ctx.stroke();
        });
      });

      const pinFontSize = Math.round(11 * dpr);
      ctx.font = `${pinFontSize}px -apple-system`;
      ctx.textBaseline = "middle";
      pinRectsRef.current.clear();
      STRUCTURES.forEach((pin) => {
        if (pin.view !== currentSide) return;
        const cx = pin.anchorX * viewport.scale;
        const cy = pin.anchorY * viewport.scale;
        const labelCy = (pin.labelY ?? pin.anchorY) * viewport.scale;
        const isPinDraft =
          highlightActive && currentDraft.muscleId === pin.id;
        const isPinMarked = markedIds.has(pin.id);
        const isPinHit = isPinDraft || isPinMarked;

        const accent = isPinHit
          ? "rgba(255, 94, 142, 1)"
          : "rgba(243, 121, 158, 0.85)";
        const leaderColor = isPinHit
          ? "rgba(255, 255, 255, 0.95)"
          : "rgba(255, 255, 255, 0.7)";

        const labelLines = composePinLabelLines(pin.subs);
        const padX = 8 * dpr;
        const padY = 5 * dpr;
        const lineGap = 3 * dpr;
        const lineWidths = labelLines.map(
          (line) => ctx.measureText(line).width,
        );
        const maxLineW = Math.max(0, ...lineWidths);
        const pillW = maxLineW + padX * 2;
        const pillH =
          pinFontSize * labelLines.length +
          lineGap * Math.max(0, labelLines.length - 1) +
          padY * 2;
        const edgeMargin = 4 * dpr;
        const pillX =
          pin.labelDir === "right"
            ? internalWidth - edgeMargin - pillW
            : edgeMargin;
        const pillY = labelCy - pillH / 2;
        const pillEdgeX = pin.labelDir === "right" ? pillX : pillX + pillW;

        pinRectsRef.current.set(pin.id, {
          x: pillX,
          y: pillY,
          w: pillW,
          h: pillH,
        });

        ctx.strokeStyle = leaderColor;
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pillEdgeX, labelCy);
        ctx.stroke();

        ctx.fillStyle = leaderColor;
        ctx.beginPath();
        ctx.arc(cx, cy, 2.5 * dpr, 0, Math.PI * 2);
        ctx.fill();

        const radius = Math.min(pillH / 2, 14 * dpr);
        ctx.fillStyle = isPinHit
          ? "rgba(255, 94, 142, 0.95)"
          : "rgba(20, 22, 28, 0.85)";
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(pillX + radius, pillY);
        ctx.lineTo(pillX + pillW - radius, pillY);
        ctx.arcTo(
          pillX + pillW,
          pillY,
          pillX + pillW,
          pillY + radius,
          radius,
        );
        ctx.lineTo(pillX + pillW, pillY + pillH - radius);
        ctx.arcTo(
          pillX + pillW,
          pillY + pillH,
          pillX + pillW - radius,
          pillY + pillH,
          radius,
        );
        ctx.lineTo(pillX + radius, pillY + pillH);
        ctx.arcTo(
          pillX,
          pillY + pillH,
          pillX,
          pillY + pillH - radius,
          radius,
        );
        ctx.lineTo(pillX, pillY + radius);
        ctx.arcTo(pillX, pillY, pillX + radius, pillY, radius);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        const totalTextH =
          pinFontSize * labelLines.length +
          lineGap * Math.max(0, labelLines.length - 1);
        const firstLineCenterY =
          labelCy - totalTextH / 2 + pinFontSize / 2;
        labelLines.forEach((line, idx) => {
          const lineY = firstLineCenterY + idx * (pinFontSize + lineGap);
          ctx.fillText(line, pillX + pillW / 2, lineY);
        });
      });

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = `600 ${Math.round(13 * dpr)}px -apple-system`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const sideLabelY = 18 * dpr;
      const leftLabel =
        currentSide === "front" ? "← 右" : "← 左";
      const rightLabel =
        currentSide === "front" ? "左 →" : "右 →";
      const sidePadX = 36 * dpr;
      ctx.fillText(leftLabel, sidePadX, sideLabelY);
      ctx.fillText(rightLabel, internalWidth - sidePadX, sideLabelY);
    },
    [],
  );

  const setupCanvas = useCallback(() => {
    return new Promise<void>((resolve) => {
      const query = Taro.createSelectorQuery();
      query
        .select("#bodyCanvas")
        .fields({ node: true, size: true })
        .exec((res) => {
          const node = res?.[0]?.node;
          if (!node) {
            resolve();
            return;
          }
          const cssWidth = res[0].width;
          const cssHeight = res[0].height;
          const dpr = Taro.getSystemInfoSync().pixelRatio;
          node.width = Math.round(cssWidth * dpr);
          node.height = Math.round(cssHeight * dpr);
          const ctx = node.getContext("2d");
          canvasRef.current = { ctx, dpr, cssWidth, cssHeight };
          resolve();
        });
    });
  }, []);

  useReady(() => {
    setupCanvas().then(() =>
      drawAll({
        currentSide: "front",
        currentPoints: [],
        currentDraft: null,
      }),
    );
  });

  interface MuscleHit {
    kind: "muscle";
    muscle: MuscleEntry;
    subpath: SubPath;
  }

  interface PinHit {
    kind: "pin";
    pin: StructurePin;
  }

  type HitResult = MuscleHit | PinHit;

  const hitTest = ({
    x,
    y,
    ctx,
    currentSide,
    viewport,
  }: {
    x: number;
    y: number;
    ctx: CanvasRenderingContext2D;
    currentSide: BodySide;
    viewport: Viewport;
  }): HitResult | null => {
    for (const pin of STRUCTURES) {
      if (pin.view !== currentSide) continue;
      const rect = pinRectsRef.current.get(pin.id);
      if (!rect) continue;
      if (
        x >= rect.x &&
        x <= rect.x + rect.w &&
        y >= rect.y &&
        y <= rect.y + rect.h
      ) {
        return { kind: "pin", pin };
      }
    }

    for (let i = MUSCLES.length - 1; i >= 0; i -= 1) {
      const m = MUSCLES[i];
      if (m.view !== currentSide) continue;
      for (const sp of m.subpaths) {
        ctx.beginPath();
        buildSvgPath({ ctx, d: sp.d, transform: m.transform, viewport });
        if (ctx.isPointInPath(x, y)) {
          return { kind: "muscle", muscle: m, subpath: sp };
        }
      }
    }
    return null;
  };

  const handleCanvasTouchStart = (e: CanvasTouchEvent) => {
    const t = e.touches?.[0] ?? e.changedTouches?.[0];
    if (!t) return;
    touchStartRef.current = { x: t.x, y: t.y };
  };

  const handleCanvasTouch = (e: CanvasTouchEvent) => {
    const info = canvasRef.current;
    if (!info) return;
    const touch = e.changedTouches?.[0] ?? e.touches?.[0];
    if (!touch) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (start) {
      const dx = touch.x - start.x;
      const dy = touch.y - start.y;
      if (Math.hypot(dx, dy) > 10) return;
    }
    const { ctx, dpr, cssWidth } = info;
    const internalWidth = cssWidth * dpr;
    const tapCanvasX = touch.x * dpr;
    const tapCanvasY = touch.y * dpr;
    const viewport = getViewport({ side, internalWidth });
    const hit = hitTest({
      x: tapCanvasX,
      y: tapCanvasY,
      ctx,
      currentSide: side,
      viewport,
    });
    if (!hit) return;

    let muscleId: string;
    let muscleName: string;
    let anatomicalSide: "left" | "right" | "center" | undefined;
    if (hit.kind === "pin") {
      muscleId = hit.pin.id;
      muscleName = hit.pin.groupName;
      anatomicalSide = hit.pin.anatomicalSide;
    } else {
      muscleId = hit.muscle.id;
      const subdivision = MUSCLE_SUBDIVISIONS[hit.muscle.baseId];
      muscleName = subdivision ? subdivision.groupName : hit.muscle.name;
      anatomicalSide = hit.muscle.anatomicalSide;
    }
    const autoLabel = composeAutoLabel({
      anatomicalSide,
      muscleName,
    });
    const newPoint = createPainPoint({
      muscleId,
      muscleName,
      autoLabel,
      anatomicalSide,
      viewSide: side,
      tapCanvasX,
      tapCanvasY,
    });
    setDraft(newPoint);
    setEditingId(null);
    drawAll({
      currentSide: side,
      currentPoints: points,
      currentDraft: newPoint,
    });
  };

  const handleOpenEdit = ({ id }: { id: string }) => {
    const existing = points.find((p) => p.id === id);
    if (!existing) return;
    const draftCopy = { ...existing };
    setDraft(draftCopy);
    setEditingId(id);
    drawAll({
      currentSide: side,
      currentPoints: points,
      currentDraft: draftCopy,
    });
  };

  const handleSwitchSide = ({ next }: { next: BodySide }) => {
    setSide(next);
    drawAll({
      currentSide: next,
      currentPoints: points,
      currentDraft: draft,
    });
  };

  const commitDraft = (): PainPoint[] | null => {
    if (!draft) return null;
    if (!draft.painTypeId) {
      Taro.showToast({ title: "请选择疼痛性质", icon: "none" });
      return null;
    }
    if (!draft.severity) {
      Taro.showToast({ title: "请选择疼痛等级", icon: "none" });
      return null;
    }
    const next =
      editingId !== null
        ? points.map((p) => (p.id === editingId ? draft : p))
        : [...points, draft];
    setPoints(next);
    setDraft(null);
    setEditingId(null);
    drawAll({
      currentSide: side,
      currentPoints: next,
      currentDraft: null,
    });
    return next;
  };

  const handleSaveAndContinue = () => {
    commitDraft();
  };

  const handleSaveAndAnalyze = () => {
    const next = commitDraft();
    if (!next) return;
    const completed = next.filter((p) => p.painTypeId);
    if (completed.length === 0) return;
    void startAnalyze({ completed });
  };

  const handleCancelDraft = () => {
    setDraft(null);
    setEditingId(null);
    drawAll({
      currentSide: side,
      currentPoints: points,
      currentDraft: null,
    });
  };

  const handleRemoveDraft = () => {
    if (editingId === null) {
      handleCancelDraft();
      return;
    }
    const next = points.filter((p) => p.id !== editingId);
    setPoints(next);
    setDraft(null);
    setEditingId(null);
    drawAll({
      currentSide: side,
      currentPoints: next,
      currentDraft: null,
    });
  };

  const handleClearAll = () => {
    setPoints([]);
    drawAll({
      currentSide: side,
      currentPoints: [],
      currentDraft: null,
    });
  };

  const handleRemovePoint = async ({
    id,
    label,
  }: {
    id: string;
    label: string;
  }) => {
    const confirmRes = await Taro.showModal({
      title: "删除该部位？",
      content: `确认删除 “${label}” 吗？`,
      confirmText: "删除",
      confirmColor: "#ff5a5a",
    });
    if (!confirmRes.confirm) return;
    const next = points.filter((p) => p.id !== id);
    setPoints(next);
    drawAll({
      currentSide: side,
      currentPoints: next,
      currentDraft: draft,
    });
  };

  const buildPainPointPayloads = ({
    completed,
  }: {
    completed: PainPoint[];
  }): PainPointPayload[] => {
    return completed.map((p) => {
      const painLabel =
        PAIN_TYPES.find((x) => x.id === p.painTypeId)?.label ?? p.painTypeId;
      const triggerLabels = p.triggerIds
        .map((tid) => TRIGGERS.find((x) => x.id === tid)?.label)
        .filter((x): x is string => Boolean(x));
      return {
        muscleName: p.muscleName,
        anatomicalSide: p.anatomicalSide,
        viewSide: p.viewSide,
        subMuscles: p.subMuscles.length > 0 ? p.subMuscles : undefined,
        painType: painLabel,
        severity: p.severity,
        triggers: triggerLabels,
        notes: p.notes?.trim() || undefined,
      };
    });
  };

  const startAnalyze = async ({
    completed,
  }: {
    completed: PainPoint[];
  }) => {
    analyzeHandleRef.current?.abort();
    setReport({ ...INITIAL_REPORT, status: "streaming" });

    let profile: RunnerProfilePayload | undefined;
    try {
      const user = await profileApi.get();
      profile = buildProfilePayload({ user });
    } catch {
      // 拉档案失败也允许继续分析，只是少了个性化信息
      profile = undefined;
    }

    const painPointPayloads = buildPainPointPayloads({ completed });
    lastAnalyzePayloadRef.current = {
      painPoints: painPointPayloads,
      profile,
    };

    const handle = painCheckApi.analyze({
      painPoints: painPointPayloads,
      profile,
      onReasoning: ({ content }) => {
        setReport((prev) =>
          prev.status === "streaming"
            ? { ...prev, reasoning: prev.reasoning + content }
            : prev,
        );
      },
      onDelta: ({ content }) => {
        setReport((prev) =>
          prev.status === "streaming"
            ? { ...prev, text: prev.text + content }
            : prev,
        );
      },
      onDone: () => {
        setReport((prev) => {
          const { planRaw } = splitReportAndPlan({ raw: prev.text });
          const plan = parseRecoveryPlan({ raw: planRaw });
          return { ...prev, status: "done", plan };
        });
        analyzeHandleRef.current = null;
      },
      onError: ({ message }) => {
        setReport((prev) => ({
          ...prev,
          status: "error",
          error: message || "AI 分析失败",
        }));
        analyzeHandleRef.current = null;
      },
    });
    analyzeHandleRef.current = handle;
  };

  const handleAnalyze = () => {
    const completed = points.filter((p) => p.painTypeId);
    if (completed.length === 0) {
      Taro.showToast({ title: "请先选择疼痛部位", icon: "none" });
      return;
    }
    void startAnalyze({ completed });
  };

  const handleCloseReport = () => {
    analyzeHandleRef.current?.abort();
    analyzeHandleRef.current = null;
    setReport(INITIAL_REPORT);
  };

  const handleRetryAnalyze = () => {
    analyzeHandleRef.current?.abort();
    analyzeHandleRef.current = null;
    handleAnalyze();
  };

  const handleToggleReasoning = () => {
    setReport((prev) => ({ ...prev, reasoningOpen: !prev.reasoningOpen }));
  };

  const TEMPLATE_ID = "r6Mg96WyISh0jUGySUSC0eJ2W2uR6csoSNMyI8i4rvU";

  const handleSaveRecord = async () => {
    if (report.saveStatus !== "idle") return;
    const plan = report.plan;
    if (!plan) {
      Taro.showToast({ title: "未识别到计划", icon: "none" });
      return;
    }
    const payload = lastAnalyzePayloadRef.current;
    if (!payload) {
      Taro.showToast({ title: "请先重新分析", icon: "none" });
      return;
    }
    setReport((prev) => ({ ...prev, saveStatus: "saving" }));
    try {
      const { markdown } = splitReportAndPlan({ raw: report.text });
      const result = await painCheckApi.createRecord({
        painPoints: payload.painPoints,
        profile: payload.profile,
        reportText: markdown,
        reasoning: report.reasoning || undefined,
        plan,
      });
      setReport((prev) => ({
        ...prev,
        saveStatus: "saved",
        savedRecordId: result.id,
        reminderModalOpen: prev.plan?.suggestRecovery ? true : false,
      }));
    } catch (err) {
      setReport((prev) => ({ ...prev, saveStatus: "idle" }));
      const message =
        err instanceof Error ? err.message : "保存失败，请稍后重试";
      Taro.showToast({ title: message, icon: "none" });
    }
  };

  const handleCloseReminderModal = () => {
    setReport((prev) => ({ ...prev, reminderModalOpen: false }));
  };

  const handleEnableReminder = async () => {
    const id = report.savedRecordId;
    if (!id || report.enablingReminder) return;
    setReport((prev) => ({ ...prev, enablingReminder: true }));
    try {
      const subRes = await (Taro.requestSubscribeMessage as unknown as (
        opts: { tmplIds: string[] },
      ) => Promise<Record<string, string>>)({
        tmplIds: [TEMPLATE_ID],
      });
      const accepted = subRes[TEMPLATE_ID] === "accept" ? 1 : 0;
      if (accepted <= 0) {
        Taro.showToast({ title: "未授权订阅", icon: "none" });
        setReport((prev) => ({ ...prev, enablingReminder: false }));
        return;
      }
      await painCheckApi.subscribe({
        id,
        accepted,
        remindTime: report.remindTime,
      });
      setReport((prev) => ({
        ...prev,
        enablingReminder: false,
        reminderEnabled: true,
        reminderModalOpen: false,
      }));
      Taro.showToast({ title: "提醒已开启", icon: "success" });
    } catch (err) {
      setReport((prev) => ({ ...prev, enablingReminder: false }));
      const message =
        err instanceof Error ? err.message : "开启提醒失败";
      Taro.showToast({ title: message, icon: "none" });
    }
  };

  const handleViewMyRecords = () => {
    Taro.navigateTo({ url: "/pages/painCheckRecords/index" });
  };

  useEffect(() => {
    return () => {
      analyzeHandleRef.current?.abort();
    };
  }, []);

  const toggleInArray = ({ arr, id }: { arr: string[]; id: string }) => {
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  };

  interface ChipGroupProps {
    options: { id: string; label: string }[];
    selected: string[];
    onSelect: (id: string) => void;
  }

  const renderChipGroup = ({ options, selected, onSelect }: ChipGroupProps) => (
    <View className="sheet-chips">
      {options.map((opt) => (
        <View
          key={opt.id}
          className={`sheet-chip ${selected.includes(opt.id) ? "sheet-chip--active" : ""}`}
          onClick={() => onSelect(opt.id)}
        >
          <Text className="sheet-chip__text">{opt.label}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View className="page-pain">
      <View className="pain-header">
        <View>
          <Text className="pain-header__title">跑步伤痛自查</Text>
          <Text className="pain-header__desc">
            在人体图上点击疼痛的位置，自动识别肌肉部位
          </Text>
        </View>
        {points.length > 0 && (
          <Text className="pain-header__clear" onClick={handleClearAll}>
            清空
          </Text>
        )}
      </View>

      <View className="pain-tabs">
        <View
          className={`pain-tab ${side === "front" ? "pain-tab--active" : ""}`}
          onClick={() => handleSwitchSide({ next: "front" })}
        >
          <Text>正面</Text>
        </View>
        <View
          className={`pain-tab ${side === "back" ? "pain-tab--active" : ""}`}
          onClick={() => handleSwitchSide({ next: "back" })}
        >
          <Text>背面</Text>
        </View>
      </View>

      <View className="pain-canvas-wrap">
        <Canvas
          id="bodyCanvas"
          type="2d"
          className="pain-canvas"
          onTouchStart={handleCanvasTouchStart}
          onTouchEnd={handleCanvasTouch}
        />
        <View className="pain-canvas-hint">
          <Text>点击身体任意位置标记疼痛</Text>
        </View>
      </View>

      <View className="pain-list">
        <Text className="pain-list__title">
          已标记 {points.length} 处
          {points.length > 0 && (
            <Text className="pain-list__sub"> · 点击可编辑</Text>
          )}
        </Text>
        {points.length === 0 && (
          <View className="pain-list__empty">
            <Text>还没有标记。轻点人体图上任意位置开始</Text>
          </View>
        )}
        {points.map((p) => {
          const painLabel =
            PAIN_TYPES.find((x) => x.id === p.painTypeId)?.label ?? "未填";
          const triggerLabels = p.triggerIds
            .map((t) => TRIGGERS.find((x) => x.id === t)?.label)
            .filter(Boolean)
            .join("、");
          return (
            <View
              key={p.id}
              className="pain-list__card"
              onClick={() => handleOpenEdit({ id: p.id })}
            >
              <View className="pain-list__dot" />
              <View className="pain-list__main">
                <Text className="pain-list__muscle">{p.autoLabel}</Text>
                <Text className="pain-list__meta">
                  {painLabel} · {p.severity}/10
                </Text>
                {triggerLabels && (
                  <Text className="pain-list__trigger">
                    诱发：{triggerLabels}
                  </Text>
                )}
              </View>
              <View
                className="pain-list__delete"
                hoverClass="pain-list__delete--active"
                onClick={(e) => {
                  e.stopPropagation();
                  void handleRemovePoint({ id: p.id, label: p.autoLabel });
                }}
              >
                <DeleteOutlined size="20" />
              </View>
            </View>
          );
        })}
      </View>

      <View className="pain-submit">
        <View
          className={`pain-submit__btn ${
            points.length === 0 ? "pain-submit__btn--disabled" : ""
          }`}
          onClick={handleAnalyze}
        >
          <Text className="pain-submit__text">开始 AI 分析</Text>
        </View>
        <Text className="pain-submit__tips">
          *AI 分析仅供参考，不能替代医学诊断
        </Text>
      </View>

      <View className="pain-attribution">
        <Text>解剖图素材：kit-g/flutter-body-atlas (BSD-3)</Text>
      </View>

      {report.status !== "idle" && (
        <View className="report-mask">
          <View className="report-body" catchMove>
            <View className="report-head">
              <Text className="report-title">AI 跑步伤痛自查</Text>
              <Text className="report-close" onClick={handleCloseReport}>
                ×
              </Text>
            </View>

            <ScrollView
              scrollY
              enhanced
              showScrollbar={false}
              className="report-scroll"
            >
              {report.status === "streaming" && !report.text ? (
                <View className="report-thinking">
                  <View className="report-thinking__head">
                    <View className="report-thinking__avatar">
                      <Text className="report-thinking__avatar-emoji">
                        🤖
                      </Text>
                      <View className="report-thinking__avatar-ring" />
                    </View>
                    <View className="report-thinking__head-text">
                      <Text className="report-thinking__title">
                        AI 跑步教练
                      </Text>
                      <Text className="report-thinking__subtitle">
                        正在交叉分析你的伤痛模式…
                      </Text>
                    </View>
                  </View>

                  {points.filter((p) => p.painTypeId).length > 0 && (
                    <View className="report-thinking__scan">
                      <View className="report-thinking__scan-line" />
                      <Text className="report-thinking__scan-tag">
                        扫描你标记的疼痛点
                      </Text>
                      {points
                        .filter((p) => p.painTypeId)
                        .map((p, idx, arr) => {
                          const painLabel =
                            PAIN_TYPES.find((x) => x.id === p.painTypeId)
                              ?.label ?? "未填";
                          const sideText =
                            p.anatomicalSide === "left"
                              ? "左"
                              : p.anatomicalSide === "right"
                                ? "右"
                                : "中";
                          return (
                            <View
                              key={p.id}
                              className="report-thinking__scan-item"
                              style={{
                                animationDelay: `${(idx * 0.45).toFixed(2)}s`,
                                animationDuration: `${(arr.length * 0.45 + 0.6).toFixed(2)}s`,
                              }}
                            >
                              <View className="report-thinking__scan-pulse" />
                              <Text className="report-thinking__scan-side">
                                {sideText}
                              </Text>
                              <Text className="report-thinking__scan-name">
                                {p.muscleName}
                              </Text>
                              <Text className="report-thinking__scan-meta">
                                {painLabel} · {p.severity}/10
                              </Text>
                            </View>
                          );
                        })}
                    </View>
                  )}

                  <View className="report-thinking__bubble">
                    <View className="report-thinking__bubble-head">
                      <View className="report-thinking__bubble-dot" />
                      <Text className="report-thinking__bubble-tag">
                        教练 · 内心独白
                      </Text>
                    </View>
                    <Text
                      className="report-thinking__bubble-text"
                      selectable
                    >
                      {report.reasoning ||
                        "嗯…让我先看看这些位置的关联，再串一下你的受力链路…"}
                      <Text className="report-thinking__cursor">▍</Text>
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="report-status">
                  {report.status === "streaming" && (
                    <View className="report-status__row">
                      <View className="report-status__dot" />
                      <Text className="report-status__text">
                        教练已得出初步结论，正在为你写下…
                      </Text>
                    </View>
                  )}
                  {report.status === "done" && (
                    <Text className="report-status__text report-status__text--done">
                      分析完成 · 仅供参考，不构成医学诊断
                    </Text>
                  )}
                  {report.status === "error" && (
                    <Text className="report-status__text report-status__text--error">
                      {report.error}
                    </Text>
                  )}
                </View>
              )}

              {report.text && report.reasoning && (
                <View className="report-reasoning">
                  <View
                    className="report-reasoning__header"
                    onClick={handleToggleReasoning}
                  >
                    <Text className="report-reasoning__title">
                      💭 教练思考记录 · {report.reasoning.length} 字
                    </Text>
                    <Text className="report-reasoning__toggle">
                      {report.reasoningOpen ? "收起 ▲" : "展开 ▼"}
                    </Text>
                  </View>
                  {report.reasoningOpen && (
                    <View className="report-reasoning__body">
                      <Text selectable className="report-reasoning__text">
                        {report.reasoning}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <View className="report-content">
                {parseMarkdown({
                  text: splitReportAndPlan({ raw: report.text }).markdown,
                }).map((block, idx) => {
                  const content = stripInline({ text: block.content });
                  if (block.type === "h1") {
                    return (
                      <Text key={idx} className="report-md__h1">
                        {content}
                      </Text>
                    );
                  }
                  if (block.type === "h2") {
                    return (
                      <Text key={idx} className="report-md__h2">
                        {content}
                      </Text>
                    );
                  }
                  if (block.type === "h3") {
                    return (
                      <Text key={idx} className="report-md__h3">
                        {content}
                      </Text>
                    );
                  }
                  if (block.type === "li") {
                    return (
                      <View key={idx} className="report-md__li">
                        <View className="report-md__li-dot" />
                        <Text className="report-md__li-text" selectable>
                          {content}
                        </Text>
                      </View>
                    );
                  }
                  if (block.type === "hr") {
                    return <View key={idx} className="report-md__hr" />;
                  }
                  if (block.type === "em") {
                    return (
                      <Text key={idx} className="report-md__em">
                        {content}
                      </Text>
                    );
                  }
                  if (!content) {
                    return <View key={idx} className="report-md__br" />;
                  }
                  return (
                    <Text key={idx} className="report-md__p" selectable>
                      {content}
                    </Text>
                  );
                })}
                {report.status === "streaming" && (
                  <Text className="report-md__cursor">▍</Text>
                )}
              </View>
            </ScrollView>

            <View className="report-actions">
              {report.status === "error" && (
                <View
                  className="report-btn report-btn--primary"
                  onClick={handleRetryAnalyze}
                >
                  <Text>重试</Text>
                </View>
              )}
              {report.status === "done" &&
                report.plan &&
                report.plan.suggestRecovery &&
                report.saveStatus !== "saved" && (
                  <View
                    className={`report-btn report-btn--primary ${
                      report.saveStatus === "saving"
                        ? "report-btn--loading"
                        : ""
                    }`}
                    onClick={handleSaveRecord}
                  >
                    <Text>
                      {report.saveStatus === "saving"
                        ? "保存中…"
                        : "保存到我的记录"}
                    </Text>
                  </View>
                )}
              {report.status === "done" && report.saveStatus === "saved" && (
                <View
                  className="report-btn report-btn--ghost"
                  onClick={handleViewMyRecords}
                >
                  <Text>查看记录</Text>
                </View>
              )}
              <View
                className={`report-btn ${
                  report.status === "done" && report.saveStatus === "saved"
                    ? "report-btn--ghost"
                    : "report-btn--primary"
                }`}
                onClick={handleCloseReport}
              >
                <Text>
                  {report.status === "streaming" ? "停止并关闭" : "关闭"}
                </Text>
              </View>
            </View>
            {report.status === "done" &&
              report.plan &&
              !report.plan.suggestRecovery && (
                <View className="report-banner">
                  <Text>
                    本次评估倾向于建议线下就医，未生成打卡计划。
                  </Text>
                </View>
              )}
          </View>
          {report.reminderModalOpen && (
            <View className="reminder-mask" onClick={handleCloseReminderModal}>
              <View
                className="reminder-card"
                onClick={(e) => e.stopPropagation()}
                catchMove
              >
                <Text className="reminder-card__title">
                  已保存，开启微信打卡提醒？
                </Text>
                <Text className="reminder-card__desc">
                  开启后，AI 康复建议会按你设定的时间通过微信订阅消息提醒你打卡，每次打卡可续订下一次提醒。
                </Text>
                <Picker
                  mode="selector"
                  range={REMIND_TIME_OPTIONS}
                  value={remindTimeToIndex({ minutes: report.remindTime })}
                  onChange={(e) => {
                    const idx = Number(e.detail.value);
                    setReport((prev) => ({
                      ...prev,
                      remindTime: remindTimeFromIndex({ index: idx }),
                    }));
                  }}
                >
                  <View className="reminder-card__time">
                    <Text className="reminder-card__time-label">
                      每日提醒时间
                    </Text>
                    <Text className="reminder-card__time-value">
                      {formatRemindTime({ minutes: report.remindTime })} ›
                    </Text>
                  </View>
                </Picker>
                <View className="reminder-card__actions">
                  <View
                    className="reminder-card__btn reminder-card__btn--ghost"
                    onClick={handleCloseReminderModal}
                  >
                    <Text>暂不开启</Text>
                  </View>
                  <View
                    className={`reminder-card__btn reminder-card__btn--primary ${
                      report.enablingReminder
                        ? "reminder-card__btn--loading"
                        : ""
                    }`}
                    onClick={handleEnableReminder}
                  >
                    <Text>
                      {report.enablingReminder ? "处理中…" : "开启提醒"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {draft && (
        <View className="sheet-mask" onClick={handleCancelDraft}>
          <View
            className="sheet-body"
            onClick={(e) => e.stopPropagation()}
            catchMove
          >
            <View className="sheet-handle" />
            <View className="sheet-head">
              <View className="sheet-head__main">
                <View className="sheet-head__title-row">
                  <View className="sheet-head__marker" />
                  <Text className="sheet-title">
                    {composeAutoLabel({
                      anatomicalSide: draft.anatomicalSide,
                      muscleName: draft.muscleName,
                    })}
                  </Text>
                </View>
              </View>
              <Text className="sheet-close" onClick={handleCancelDraft}>
                ×
              </Text>
            </View>

            <ScrollView
              scrollY
              enhanced
              showScrollbar={false}
              className="sheet-scroll"
            >
              {(() => {
                const pin = STRUCTURES.find((p) => p.id === draft.muscleId);
              const baseId = draft.muscleId.replace(/_l$|_r$/, "");
              const subdivision = MUSCLE_SUBDIVISIONS[baseId];
              const subList = pin ? pin.subs : subdivision?.subs;
              if (!subList || subList.length === 0) return null;
              const subOptions = subList.map((s) => ({
                id: s,
                label: s,
              }));
              return (
                <View className="sheet-section">
                  <View className="sheet-label-row sheet-label-row--inline">
                    <Text className="sheet-label">细分位置</Text>
                    <Text className="sheet-label-hint">
                      可多选，不清楚具体位置也可不选
                    </Text>
                  </View>
                  {renderChipGroup({
                    options: subOptions,
                    selected: draft.subMuscles,
                    onSelect: (id) => {
                      const nextSubs = toggleInArray({
                        arr: draft.subMuscles,
                        id,
                      });
                      setDraft({
                        ...draft,
                        subMuscles: nextSubs,
                        autoLabel: composeAutoLabel({
                          anatomicalSide: draft.anatomicalSide,
                          muscleName: draft.muscleName,
                          subMuscles: nextSubs,
                        }),
                      });
                    },
                  })}
                </View>
              );
            })()}

            <View className="sheet-section">
              <Text className="sheet-label">
                疼痛性质<Text className="sheet-required">*</Text>
              </Text>
              {renderChipGroup({
                options: PAIN_TYPES,
                selected: draft.painTypeId ? [draft.painTypeId] : [],
                onSelect: (id) =>
                  setDraft({
                    ...draft,
                    painTypeId: draft.painTypeId === id ? "" : id,
                  }),
              })}
              {draft.painTypeId === OTHER_OPTION_ID && (
                <Text className="sheet-other-hint">
                  可在下方「补充描述」里说明
                </Text>
              )}
            </View>

            <View className="sheet-section">
              <View className="sheet-label-row">
                <Text className="sheet-label">
                  疼痛等级<Text className="sheet-required">*</Text>
                </Text>
                {draft.severity > 0 ? (
                  <Text className="sheet-severity">
                    {draft.severity}/10 · {getSeverityLabel(draft.severity)}
                  </Text>
                ) : (
                  <Text className="sheet-severity sheet-severity--empty">
                    请选择
                  </Text>
                )}
              </View>
              <View className="sheet-severity-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                  const active = draft.severity >= n;
                  const isSelected = draft.severity === n;
                  return (
                    <View
                      key={n}
                      className={`sheet-severity-cell sheet-severity-cell--${getSeverityTier({ value: n })}${
                        active ? " sheet-severity-cell--active" : ""
                      }${isSelected ? " sheet-severity-cell--selected" : ""}`}
                      onClick={() => setDraft({ ...draft, severity: n })}
                    >
                      <Text className="sheet-severity-cell__num">{n}</Text>
                    </View>
                  );
                })}
              </View>
              <View className="sheet-severity-hint">
                <Text>1-3 轻微</Text>
                <Text>4-6 影响跑步</Text>
                <Text>7-10 严重</Text>
              </View>
            </View>

            <View className="sheet-section">
              <Text className="sheet-label">诱发动作（可多选）</Text>
              {renderChipGroup({
                options: TRIGGERS,
                selected: draft.triggerIds,
                onSelect: (id) =>
                  setDraft({
                    ...draft,
                    triggerIds: toggleInArray({
                      arr: draft.triggerIds,
                      id,
                    }),
                  }),
              })}
              {draft.triggerIds.includes(OTHER_OPTION_ID) && (
                <Text className="sheet-other-hint">
                  可在下方「补充描述」里说明
                </Text>
              )}
            </View>

            <View className="sheet-section">
              <Text className="sheet-label">补充描述</Text>
              <Textarea
                className="sheet-textarea"
                value={draft.notes}
                placeholder="补充越详细，AI 分析越准：持续多久了、什么时候加重/缓解、跑量与训练强度变化、伤病史等（上面选项不满足也可在此补充）"
                maxlength={200}
                onInput={(e) =>
                  setDraft({ ...draft, notes: e.detail.value ?? "" })
                }
                adjustPosition
                cursorSpacing={32}
              />
            </View>
            </ScrollView>

            <View className="sheet-actions">
              <View
                className="sheet-btn sheet-btn--primary"
                onClick={handleSaveAndAnalyze}
              >
                <Text>保存并开始 AI 分析</Text>
              </View>
              <View className="sheet-actions__row">
                {editingId !== null && (
                  <View
                    className="sheet-btn sheet-btn--danger"
                    onClick={handleRemoveDraft}
                  >
                    <Text>删除</Text>
                  </View>
                )}
                <View
                  className="sheet-btn sheet-btn--secondary"
                  onClick={handleSaveAndContinue}
                >
                  <Text>
                    {editingId !== null ? "保存" : "保存并继续添加"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default PainCheck;
