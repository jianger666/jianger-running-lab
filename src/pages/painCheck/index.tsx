import { View, Text, Canvas, Slider, Textarea } from '@tarojs/components';
import type { ITouchEvent } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { useRef, useState, useCallback } from 'react';
import {
  MUSCLES,
  OUTLINES,
  MUSCLE_META,
  SIDE_VIEWPORT,
  BodySide,
  MuscleWithSubpaths,
} from './data/muscles';
import {
  MUSCLE_SUB_POSITIONS,
  PAIN_TYPES,
  TRIGGERS,
  PainItem,
  getDefaultPainItem,
} from './data/refinement';
import { buildSvgPath } from './utils/svgPath';
import './index.scss';

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

const PainCheck = () => {
  const [items, setItems] = useState<PainItem[]>([]);
  const [side, setSide] = useState<BodySide>('front');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<PainItem | null>(null);
  const canvasRef = useRef<CanvasInfo | null>(null);

  const drawAll = useCallback(
    ({
      selectedIds,
      currentSide,
    }: {
      selectedIds: string[];
      currentSide: BodySide;
    }) => {
      const info = canvasRef.current;
      if (!info) return;
      const { ctx, dpr, cssWidth, cssHeight } = info;
      const internalWidth = cssWidth * dpr;
      const internalHeight = cssHeight * dpr;
      const viewport = getViewport({ side: currentSide, internalWidth });

      ctx.clearRect(0, 0, internalWidth, internalHeight);

      const outline = OUTLINES.find((o) =>
        currentSide === 'front'
          ? o.id === 'outline-front'
          : o.id === 'outline-back',
      );
      if (outline) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.beginPath();
        buildSvgPath({
          ctx,
          d: outline.d,
          transform: outline.transform,
          viewport,
        });
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
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

      MUSCLES.forEach((m) => {
        const visible = m.subpaths.filter((sp) => sp.side === currentSide);
        if (visible.length === 0) return;
        const isSelected = selectedIds.includes(m.id);
        const fill = isSelected
          ? 'rgba(243, 121, 158, 0.88)'
          : 'rgba(243, 121, 158, 0.22)';
        const stroke = isSelected
          ? 'rgba(255, 255, 255, 0.85)'
          : 'rgba(255, 255, 255, 0.38)';
        ctx.fillStyle = fill;
        visible.forEach((sp) => {
          ctx.beginPath();
          buildSvgPath({
            ctx,
            d: sp.d,
            transform: m.transform,
            viewport,
          });
          ctx.fill();
        });
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        visible.forEach((sp) => {
          ctx.beginPath();
          buildSvgPath({
            ctx,
            d: sp.d,
            transform: m.transform,
            viewport,
          });
          ctx.stroke();
        });
      });

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = `${Math.round(18 * dpr)}px -apple-system`;
      ctx.textAlign = 'center';
      ctx.fillText(
        currentSide === 'front' ? '正面' : '背面',
        internalWidth / 2,
        28 * dpr,
      );
    },
    [],
  );

  const setupCanvas = useCallback(() => {
    return new Promise<void>((resolve) => {
      const query = Taro.createSelectorQuery();
      query
        .select('#bodyCanvas')
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
          const ctx = node.getContext('2d');
          canvasRef.current = { ctx, dpr, cssWidth, cssHeight };
          resolve();
        });
    });
  }, []);

  useReady(() => {
    setupCanvas().then(() =>
      drawAll({ selectedIds: [], currentSide: 'front' }),
    );
  });

  const hitTestMuscle = ({
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
  }): MuscleWithSubpaths | null => {
    for (let i = MUSCLES.length - 1; i >= 0; i -= 1) {
      const m = MUSCLES[i];
      const subs = m.subpaths.filter((sp) => sp.side === currentSide);
      for (const sp of subs) {
        ctx.beginPath();
        buildSvgPath({ ctx, d: sp.d, transform: m.transform, viewport });
        if (ctx.isPointInPath(x, y)) return m;
      }
    }
    return null;
  };

  const openEditFor = ({
    muscleId,
    muscleName,
    existingIndex,
  }: {
    muscleId: string;
    muscleName: string;
    existingIndex: number | null;
  }) => {
    if (existingIndex !== null) {
      setEditingIndex(existingIndex);
      setDraft({ ...items[existingIndex] });
    } else {
      setEditingIndex(null);
      setDraft(getDefaultPainItem({ muscleId, muscleName }));
    }
  };

  const handleCanvasTouch = (e: ITouchEvent) => {
    const info = canvasRef.current;
    if (!info) return;
    const touch = e.changedTouches?.[0] ?? e.touches?.[0];
    if (!touch) return;
    const { clientX, clientY } = touch as unknown as {
      clientX: number;
      clientY: number;
    };

    Taro.createSelectorQuery()
      .select('#bodyCanvas')
      .boundingClientRect()
      .exec((res) => {
        const rect = res?.[0] as { left: number; top: number } | undefined;
        if (!rect) return;
        const current = canvasRef.current;
        if (!current) return;
        const { ctx, dpr, cssWidth } = current;
        const x = (clientX - rect.left) * dpr;
        const y = (clientY - rect.top) * dpr;
        const viewport = getViewport({ side, internalWidth: cssWidth * dpr });
        const hit = hitTestMuscle({ x, y, ctx, currentSide: side, viewport });
        if (!hit) return;

        const existingIndex = items.findIndex((it) => it.muscleId === hit.id);
        openEditFor({
          muscleId: hit.id,
          muscleName: MUSCLE_META[hit.id]?.name ?? hit.id,
          existingIndex: existingIndex >= 0 ? existingIndex : null,
        });
      });
  };

  const handleSwitchSide = ({ next }: { next: BodySide }) => {
    setSide(next);
    drawAll({
      selectedIds: items.map((i) => i.muscleId),
      currentSide: next,
    });
  };

  const handleSaveDraft = () => {
    if (!draft) return;
    if (draft.subPositionIds.length === 0) {
      Taro.showToast({ title: '请选择具体位置', icon: 'none' });
      return;
    }
    if (!draft.painTypeId) {
      Taro.showToast({ title: '请选择疼痛性质', icon: 'none' });
      return;
    }
    const next =
      editingIndex !== null
        ? items.map((it, i) => (i === editingIndex ? draft : it))
        : [...items, draft];
    setItems(next);
    setDraft(null);
    setEditingIndex(null);
    drawAll({
      selectedIds: next.map((i) => i.muscleId),
      currentSide: side,
    });
  };

  const handleCancelDraft = () => {
    setDraft(null);
    setEditingIndex(null);
  };

  const handleRemoveDraft = () => {
    if (editingIndex === null) {
      handleCancelDraft();
      return;
    }
    const next = items.filter((_, i) => i !== editingIndex);
    setItems(next);
    setDraft(null);
    setEditingIndex(null);
    drawAll({
      selectedIds: next.map((i) => i.muscleId),
      currentSide: side,
    });
  };

  const handleClearAll = () => {
    setItems([]);
    drawAll({ selectedIds: [], currentSide: side });
  };

  const handleAnalyze = () => {
    if (items.length === 0) {
      Taro.showToast({ title: '请先选择疼痛部位', icon: 'none' });
      return;
    }
    Taro.showToast({ title: 'AI 分析开发中', icon: 'none' });
  };

  const toggleInArray = ({
    arr,
    id,
    multi,
  }: {
    arr: string[];
    id: string;
    multi: boolean;
  }) => {
    if (!multi) return arr.includes(id) ? [] : [id];
    return arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
  };

  const renderChipGroup = ({
    options,
    selected,
    onSelect,
  }: {
    options: { id: string; label: string }[];
    selected: string[];
    onSelect: (id: string) => void;
  }) => (
    <View className="sheet-chips">
      {options.map((opt) => (
        <View
          key={opt.id}
          className={`sheet-chip ${selected.includes(opt.id) ? 'sheet-chip--active' : ''}`}
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
            点击疼痛部位，逐项补充细节后 AI 分析
          </Text>
        </View>
        {items.length > 0 && (
          <Text className="pain-header__clear" onClick={handleClearAll}>
            清空
          </Text>
        )}
      </View>

      <View className="pain-tabs">
        <View
          className={`pain-tab ${side === 'front' ? 'pain-tab--active' : ''}`}
          onClick={() => handleSwitchSide({ next: 'front' })}
        >
          <Text>正面</Text>
        </View>
        <View
          className={`pain-tab ${side === 'back' ? 'pain-tab--active' : ''}`}
          onClick={() => handleSwitchSide({ next: 'back' })}
        >
          <Text>背面</Text>
        </View>
      </View>

      <View className="pain-canvas-wrap">
        <Canvas
          id="bodyCanvas"
          type="2d"
          className="pain-canvas"
          onTouchEnd={handleCanvasTouch}
        />
        <View className="pain-canvas-hint">
          <Text>点击疼痛的肌肉区域</Text>
        </View>
      </View>

      <View className="pain-list">
        <Text className="pain-list__title">
          已选 {items.length} 处
          {items.length > 0 && (
            <Text className="pain-list__sub"> · 点击可编辑</Text>
          )}
        </Text>
        {items.length === 0 && (
          <View className="pain-list__empty">
            <Text>还没有选择。点击人体图上的任意部位开始</Text>
          </View>
        )}
        {items.map((it, idx) => {
          const subLabels = it.subPositionIds
            .map(
              (sid) =>
                MUSCLE_SUB_POSITIONS[it.muscleId]?.find((o) => o.id === sid)
                  ?.label,
            )
            .filter(Boolean)
            .join('、');
          const painLabel = PAIN_TYPES.find(
            (p) => p.id === it.painTypeId,
          )?.label;
          return (
            <View
              key={`${it.muscleId}-${idx}`}
              className="pain-list__card"
              onClick={() =>
                openEditFor({
                  muscleId: it.muscleId,
                  muscleName: it.muscleName,
                  existingIndex: idx,
                })
              }
            >
              <View className="pain-list__main">
                <Text className="pain-list__muscle">{it.muscleName}</Text>
                <Text className="pain-list__meta">
                  {subLabels} · {painLabel} · {it.severity}/10
                </Text>
                {it.triggerIds.length > 0 && (
                  <Text className="pain-list__trigger">
                    诱发：
                    {it.triggerIds
                      .map((t) => TRIGGERS.find((x) => x.id === t)?.label)
                      .filter(Boolean)
                      .join('、')}
                  </Text>
                )}
              </View>
              <Text className="pain-list__arrow">›</Text>
            </View>
          );
        })}
      </View>

      <View className="pain-submit">
        <View
          className={`pain-submit__btn ${
            items.length === 0 ? 'pain-submit__btn--disabled' : ''
          }`}
          onClick={handleAnalyze}
        >
          <Text className="pain-submit__text">开始 AI 分析</Text>
        </View>
        <Text className="pain-submit__tips">
          *AI 分析仅供参考，不能替代医学诊断
        </Text>
      </View>

      {draft && (
        <View className="sheet-mask" onClick={handleCancelDraft}>
          <View
            className="sheet-body"
            onClick={(e) => e.stopPropagation()}
            catchMove
          >
            <View className="sheet-head">
              <Text className="sheet-title">{draft.muscleName}</Text>
              <Text className="sheet-close" onClick={handleCancelDraft}>
                ×
              </Text>
            </View>

            <View className="sheet-section">
              <Text className="sheet-label">
                具体位置<Text className="sheet-required">*</Text>（可多选）
              </Text>
              {renderChipGroup({
                options: MUSCLE_SUB_POSITIONS[draft.muscleId] ?? [],
                selected: draft.subPositionIds,
                onSelect: (id) =>
                  setDraft({
                    ...draft,
                    subPositionIds: toggleInArray({
                      arr: draft.subPositionIds,
                      id,
                      multi: true,
                    }),
                  }),
              })}
            </View>

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
                    painTypeId: draft.painTypeId === id ? '' : id,
                  }),
              })}
            </View>

            <View className="sheet-section">
              <View className="sheet-label-row">
                <Text className="sheet-label">疼痛等级</Text>
                <Text className="sheet-severity">{draft.severity}/10</Text>
              </View>
              <Slider
                min={1}
                max={10}
                step={1}
                value={draft.severity}
                activeColor="#f3799e"
                blockSize={22}
                onChange={(e) =>
                  setDraft({ ...draft, severity: e.detail.value })
                }
              />
              <View className="sheet-severity-hint">
                <Text>1 轻微</Text>
                <Text>5 影响跑步</Text>
                <Text>10 无法忍受</Text>
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
                      multi: true,
                    }),
                  }),
              })}
            </View>

            <View className="sheet-section">
              <Text className="sheet-label">补充描述</Text>
              <Textarea
                className="sheet-textarea"
                value={draft.notes}
                placeholder="持续时间、加重/缓解因素等（可选）"
                maxlength={200}
                onInput={(e) =>
                  setDraft({ ...draft, notes: e.detail.value ?? '' })
                }
              />
            </View>

            <View className="sheet-actions">
              {editingIndex !== null && (
                <View
                  className="sheet-btn sheet-btn--danger"
                  onClick={handleRemoveDraft}
                >
                  <Text>删除</Text>
                </View>
              )}
              <View
                className="sheet-btn sheet-btn--primary"
                onClick={handleSaveDraft}
              >
                <Text>保存</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default PainCheck;
