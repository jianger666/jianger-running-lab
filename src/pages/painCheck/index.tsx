import { View, Text, Canvas, ITouchEvent } from '@tarojs/components';
import Taro, { useReady } from '@tarojs/taro';
import { useRef, useState, useCallback } from 'react';
import { MUSCLES, OUTLINES, MUSCLE_META, VIEW_BOX } from './data/muscles';
import { buildSvgPath } from './utils/svgPath';
import './index.scss';

interface CanvasRef {
  ctx: CanvasRenderingContext2D;
  dpr: number;
  scale: number;
  internalSize: number;
}

const CANVAS_PADDING_RPX = 32;

const PainCheck = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canvasRef = useRef<CanvasRef | null>(null);

  const drawAll = useCallback(({ selected }: { selected: string[] }) => {
    const info = canvasRef.current;
    if (!info) return;
    const { ctx, internalSize, scale } = info;

    ctx.clearRect(0, 0, internalSize, internalSize);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    OUTLINES.forEach((o) => {
      ctx.beginPath();
      buildSvgPath({ ctx, d: o.d, transform: o.transform, scale });
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.5;
    OUTLINES.forEach((o) => {
      ctx.beginPath();
      buildSvgPath({ ctx, d: o.d, transform: o.transform, scale });
      ctx.stroke();
    });

    MUSCLES.forEach((m) => {
      const isSelected = selected.includes(m.id);
      ctx.fillStyle = isSelected
        ? 'rgba(243, 121, 158, 0.9)'
        : 'rgba(243, 121, 158, 0.25)';
      ctx.beginPath();
      buildSvgPath({ ctx, d: m.d, transform: m.transform, scale });
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 0.8;
    MUSCLES.forEach((m) => {
      ctx.beginPath();
      buildSvgPath({ ctx, d: m.d, transform: m.transform, scale });
      ctx.stroke();
    });
  }, []);

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
          const dpr = Taro.getSystemInfoSync().pixelRatio;
          const internalSize = Math.round(cssWidth * dpr);
          canvas.width = internalSize;
          canvas.height = internalSize;
          const ctx = canvas.getContext('2d');
          canvasRef.current = {
            ctx,
            dpr,
            scale: internalSize / VIEW_BOX.width,
            internalSize,
          };
          resolve();
        });
    });
  }, []);

  useReady(() => {
    setupCanvas().then(() => drawAll({ selected: [] }));
  });

  const handleCanvasTap = (e: ITouchEvent) => {
    const info = canvasRef.current;
    if (!info) return;
    const { ctx, dpr } = info;
    const detail = e.detail as unknown as { x: number; y: number };
    const x = detail.x * dpr;
    const y = detail.y * dpr;
    for (let i = MUSCLES.length - 1; i >= 0; i -= 1) {
      const m = MUSCLES[i];
      ctx.beginPath();
      buildSvgPath({ ctx, d: m.d, transform: m.transform, scale: info.scale });
      if (ctx.isPointInPath(x, y)) {
        setSelectedIds((prev) => {
          const next = prev.includes(m.id)
            ? prev.filter((id) => id !== m.id)
            : [...prev, m.id];
          drawAll({ selected: next });
          return next;
        });
        return;
      }
    }
  };

  const handleRemoveChip = ({ id }: { id: string }) => {
    setSelectedIds((prev) => {
      const next = prev.filter((i) => i !== id);
      drawAll({ selected: next });
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedIds([]);
    drawAll({ selected: [] });
  };

  return (
    <View className="page-pain">
      <View className="pain-header">
        <Text className="pain-header__title">点击不舒服的部位</Text>
        <Text className="pain-header__desc">
          支持多选，轻点人体图中疼痛/紧张的肌肉
        </Text>
      </View>

      <View
        className="pain-canvas-wrap"
        style={{ padding: `0 ${CANVAS_PADDING_RPX / 2}rpx` }}
      >
        <Canvas
          id="bodyCanvas"
          type="2d"
          className="pain-canvas"
          onClick={handleCanvasTap}
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
