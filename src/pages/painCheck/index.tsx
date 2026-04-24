import { View, Text, Canvas } from '@tarojs/components';
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
import { buildSvgPath } from './utils/svgPath';
import './index.scss';

interface CanvasRef {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  cssWidth: number;
  cssHeight: number;
}

const ASPECT_RATIO = 960 / 512;

const getViewport = ({
  side,
  internalWidth,
}: {
  side: BodySide;
  internalWidth: number;
}) => {
  const vp = SIDE_VIEWPORT[side];
  return {
    scale: internalWidth / vp.width,
    offsetX: vp.offsetX,
    offsetY: vp.offsetY,
  };
};

const PainCheck = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [side, setSide] = useState<BodySide>('front');
  const canvasRef = useRef<CanvasRef | null>(null);

  const drawAll = useCallback(
    ({
      selected,
      currentSide,
    }: {
      selected: string[];
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
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        buildSvgPath({
          ctx,
          d: outline.d,
          transform: outline.transform,
          viewport,
        });
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
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
        const visibleSubpaths = m.subpaths.filter(
          (sp) => sp.side === currentSide,
        );
        if (visibleSubpaths.length === 0) return;
        const isSelected = selected.includes(m.id);
        ctx.fillStyle = isSelected
          ? 'rgba(243, 121, 158, 0.9)'
          : 'rgba(243, 121, 158, 0.28)';
        visibleSubpaths.forEach((sp) => {
          ctx.beginPath();
          buildSvgPath({
            ctx,
            d: sp.d,
            transform: m.transform,
            viewport,
          });
          ctx.fill();
        });
      });

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      MUSCLES.forEach((m) => {
        const visibleSubpaths = m.subpaths.filter(
          (sp) => sp.side === currentSide,
        );
        visibleSubpaths.forEach((sp) => {
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
          if (!res || !res[0] || !res[0].node) {
            resolve();
            return;
          }
          const canvas = res[0].node;
          const cssWidth = res[0].width;
          const cssHeight = res[0].height || cssWidth * ASPECT_RATIO;
          const dpr = Taro.getSystemInfoSync().pixelRatio;
          canvas.width = Math.round(cssWidth * dpr);
          canvas.height = Math.round(cssHeight * dpr);
          const ctx = canvas.getContext('2d');
          canvasRef.current = { ctx, dpr, cssWidth, cssHeight };
          resolve();
        });
    });
  }, []);

  useReady(() => {
    setupCanvas().then(() => drawAll({ selected: [], currentSide: 'front' }));
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
    viewport: ReturnType<typeof getViewport>;
  }): MuscleWithSubpaths | null => {
    for (let i = MUSCLES.length - 1; i >= 0; i -= 1) {
      const m = MUSCLES[i];
      const subs = m.subpaths.filter((sp) => sp.side === currentSide);
      for (const sp of subs) {
        ctx.beginPath();
        buildSvgPath({ ctx, d: sp.d, transform: m.transform, viewport });
        if (ctx.isPointInPath(x, y)) {
          return m;
        }
      }
    }
    return null;
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
        const cssX = clientX - rect.left;
        const cssY = clientY - rect.top;
        const x = cssX * dpr;
        const y = cssY * dpr;
        const viewport = getViewport({
          side,
          internalWidth: cssWidth * dpr,
        });
        const hit = hitTestMuscle({ x, y, ctx, currentSide: side, viewport });
        if (!hit) return;
        setSelectedIds((prev) => {
          const next = prev.includes(hit.id)
            ? prev.filter((id) => id !== hit.id)
            : [...prev, hit.id];
          drawAll({ selected: next, currentSide: side });
          return next;
        });
      });
  };

  const handleSwitchSide = ({ next }: { next: BodySide }) => {
    setSide(next);
    drawAll({ selected: selectedIds, currentSide: next });
  };

  const handleRemoveChip = ({ id }: { id: string }) => {
    setSelectedIds((prev) => {
      const next = prev.filter((i) => i !== id);
      drawAll({ selected: next, currentSide: side });
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedIds([]);
    drawAll({ selected: [], currentSide: side });
  };

  return (
    <View className="page-pain">
      <View className="pain-header">
        <Text className="pain-header__title">点击不舒服的部位</Text>
        <Text className="pain-header__desc">
          支持多选，轻点人体图中疼痛/紧张的肌肉
        </Text>
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
      </View>

      <View className="pain-selected">
        <View className="pain-selected__row">
          <Text className="pain-selected__label">
            已选 {selectedIds.length} 处
          </Text>
          {selectedIds.length > 0 && (
            <Text className="pain-selected__clear" onClick={handleClearAll}>
              清空
            </Text>
          )}
        </View>
        {selectedIds.length === 0 && (
          <Text className="pain-selected__empty">
            还没有选择，点击人体图开始
          </Text>
        )}
        {selectedIds.length > 0 && (
          <View className="pain-chips">
            {selectedIds.map((id) => (
              <View
                key={id}
                className="pain-chip"
                onClick={() => handleRemoveChip({ id })}
              >
                <Text className="pain-chip__text">
                  {MUSCLE_META[id]?.name ?? id}
                </Text>
                <Text className="pain-chip__close">×</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View className="pain-footer">
        <Text className="pain-footer__text">
          人体图素材来源：vue-human-muscle-anatomy (MIT)
        </Text>
      </View>
    </View>
  );
};

export default PainCheck;
