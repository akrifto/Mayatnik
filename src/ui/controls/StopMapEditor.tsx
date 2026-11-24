// src/ui/controls/StopMapEditor.tsx

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { BrushMapParams, MapControlPoint } from '../../types';
import { RangeField } from '../components/RangeField';

export type StopMapMode = 'color' | 'opacity' | 'width';

interface StopMapEditorProps {
  mode: StopMapMode;
  title: string;
  params: BrushMapParams;
  onChange: (next: BrushMapParams) => void;
}

interface ModePreset {
  defaultPointValue: string | number;
  pointMin?: number;
  pointMax?: number;
  pointStep?: number;
  pointLabel: string;
  densityMin: number;
  densityMax: number;
  densityStep: number;
  flowMin: number;
  flowMax: number;
  flowStep: number;
}

// Конфигурация диапазонов для каждой из трёх карт (повторяет контракты исходного UI)
const MODE_PRESETS: Record<StopMapMode, ModePreset> = {
  color: {
    defaultPointValue: '#00f3ff',
    pointLabel: 'Точка цвета',
    densityMin: 0.0,
    densityMax: 5.0,
    densityStep: 0.01,
    flowMin: -50.0,
    flowMax: 50.0,
    flowStep: 0.01,
  },
  opacity: {
    defaultPointValue: 100,
    pointMin: -100,
    pointMax: 100,
    pointStep: 1,
    pointLabel: 'Прозрачность (-100..100)',
    densityMin: 0.0,
    densityMax: 5.0,
    densityStep: 0.1,
    flowMin: -100.0,
    flowMax: 100.0,
    flowStep: 1,
  },
  width: {
    defaultPointValue: 2.0,
    pointMin: 0.1,
    pointMax: 50.0,
    pointStep: 0.1,
    pointLabel: 'Толщина',
    densityMin: 0.0,
    densityMax: 5.0,
    densityStep: 0.1,
    flowMin: -100.0,
    flowMax: 100.0,
    flowStep: 0.1,
  },
};

const LOGICAL_WIDTH = 260;
const LOGICAL_HEIGHT = 52;
const TRACK_TOP = 4;
const TRACK_HEIGHT = 24;
const MARKER_Y = 41;
const DELETE_DRAG_THRESHOLD_Y = 22;

/** Линейная интерполяция толщины для превью профиля WidthMap */
function getInterpolatedWidth(normX: number, sorted: MapControlPoint[]): number {
  if (sorted.length === 0) return 1.0;
  if (normX <= sorted[0].position) return Number(sorted[0].value);
  if (normX >= sorted[sorted.length - 1].position) return Number(sorted[sorted.length - 1].value);

  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    if (normX >= p1.position && normX <= p2.position) {
      const range = p2.position - p1.position;
      const factor = range === 0 ? 0 : (normX - p1.position) / range;
      const v1 = Number(p1.value);
      const v2 = Number(p2.value);
      return v1 + (v2 - v1) * factor;
    }
  }

  return Number(sorted[0].value);
}

/**
 * Единый переиспользуемый редактор шкалы контрольных точек (Gradient / Opacity / Width).
 * Объединяет интерактивный Canvas, инспектор выбранной точки и глобальные слайдеры Density / Flow.
 */
export const StopMapEditor: React.FC<StopMapEditorProps> = ({
  mode,
  title,
  params,
  onChange,
}) => {
  const preset = MODE_PRESETS[mode];
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    params.points.length > 0 ? 0 : null
  );

  // Состояние перетаскивания храним в ref, чтобы обработчики на window всегда видели актуальные данные без переподписки
  const dragRef = useRef<{
    active: boolean;
    pointIndex: number;
    startY: number;
    markedForDeletion: boolean;
  }>({
    active: false,
    pointIndex: -1,
    startY: 0,
    markedForDeletion: false,
  });

  // Реф на актуальные пропсы, чтобы глобальные слушатели мыши не замыкали устаревшее состояние
  const latestRef = useRef({ params, onChange, selectedIndex });
  latestRef.current = { params, onChange, selectedIndex };

  const [isDragging, setIsDragging] = useState(false);

  // Корректируем selectedIndex, если массив точек изменился снаружи (например, после Reset)
  useEffect(() => {
    if (params.points.length === 0) {
      setSelectedIndex(null);
    } else if (selectedIndex === null || selectedIndex >= params.points.length) {
      setSelectedIndex(0);
    }
  }, [params.points.length, selectedIndex]);

  // Отрисовка шкалы и треугольных маркеров на Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Масштабируем backing store под Retina/HiDPI для чётких линий
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = LOGICAL_WIDTH * dpr;
    const targetH = LOGICAL_HEIGHT * dpr;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    const sorted = [...params.points].sort((a, b) => a.position - b.position);

    if (sorted.length > 0) {
      if (mode === 'color') {
        const grad = ctx.createLinearGradient(0, 0, LOGICAL_WIDTH, 0);
        for (const stop of sorted) {
          grad.addColorStop(
            Math.max(0, Math.min(1, stop.position)),
            String(stop.value)
          );
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, TRACK_TOP, LOGICAL_WIDTH, TRACK_HEIGHT);
      } else if (mode === 'opacity') {
        // Шахматная подложка под полупрозрачной полосой
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, TRACK_TOP, LOGICAL_WIDTH, TRACK_HEIGHT);
        ctx.clip();

        const tileSize = 6;
        for (let x = 0; x < LOGICAL_WIDTH; x += tileSize) {
          for (let y = TRACK_TOP; y < TRACK_TOP + TRACK_HEIGHT; y += tileSize) {
            const isEven =
              (x / tileSize + Math.floor((y - TRACK_TOP) / tileSize)) % 2 === 0;
            ctx.fillStyle = isEven
              ? 'rgba(255, 255, 255, 0.04)'
              : 'rgba(255, 255, 255, 0.11)';
            ctx.fillRect(x, y, tileSize, tileSize);
          }
        }
        ctx.restore();

        const grad = ctx.createLinearGradient(0, 0, LOGICAL_WIDTH, 0);
        for (const stop of sorted) {
          const alpha = Math.max(0, Math.min(1, (Number(stop.value) + 100) / 200));
          grad.addColorStop(
            Math.max(0, Math.min(1, stop.position)),
            `rgba(255, 255, 255, ${alpha})`
          );
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, TRACK_TOP, LOGICAL_WIDTH, TRACK_HEIGHT);
      } else {
        // Режим 'width': профиль толщины в пикселях по центральной оси полосы
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, TRACK_TOP, LOGICAL_WIDTH, TRACK_HEIGHT);

        const centerY = TRACK_TOP + TRACK_HEIGHT / 2;
        ctx.beginPath();
        for (let x = 0; x <= LOGICAL_WIDTH; x++) {
          const val = getInterpolatedWidth(x / LOGICAL_WIDTH, sorted);
          const halfH = Math.min(11, Math.max(0.5, val / 2));
          if (x === 0) ctx.moveTo(x, centerY - halfH);
          else ctx.lineTo(x, centerY - halfH);
        }
        for (let x = LOGICAL_WIDTH; x >= 0; x--) {
          const val = getInterpolatedWidth(x / LOGICAL_WIDTH, sorted);
          const halfH = Math.min(11, Math.max(0.5, val / 2));
          ctx.lineTo(x, centerY + halfH);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Общая рамка полосы шкалы
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, TRACK_TOP + 0.5, LOGICAL_WIDTH - 1, TRACK_HEIGHT - 1);
    }

    // Отрисовка маркеров точек под шкалой
    params.points.forEach((stop, idx) => {
      const x = stop.position * LOGICAL_WIDTH;
      const isSelected = idx === selectedIndex;
      const isDraggingThis = dragRef.current.active && dragRef.current.pointIndex === idx;
      const isDeleting = isDraggingThis && dragRef.current.markedForDeletion;

      ctx.save();
      ctx.translate(x, MARKER_Y);

      const size = 6;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size, size);
      ctx.lineTo(-size, size);
      ctx.closePath();

      if (isDeleting) {
        ctx.fillStyle = '#ff2a55';
      } else if (mode === 'color') {
        ctx.fillStyle = String(stop.value);
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fill();

      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.35)';
      ctx.stroke();
      ctx.restore();
    });

    ctx.restore();
  }, [mode, params.points, selectedIndex]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Глобальное перетаскивание по window с обязательной очисткой слушателей при размонтировании
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag.active || !canvas) return;

      const { params: curParams, onChange: notify } = latestRef.current;
      const rect = canvas.getBoundingClientRect();
      const normPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const deltaY = e.clientY - drag.startY;

      drag.markedForDeletion =
        deltaY > DELETE_DRAG_THRESHOLD_Y && curParams.points.length > 1;

      const nextPoints = curParams.points.map((p, idx) =>
        idx === drag.pointIndex ? { ...p, position: normPos } : { ...p }
      );

      notify({ ...curParams, points: nextPoints });
      renderCanvas();
    };

    const handleMouseUp = () => {
      const drag = dragRef.current;
      if (!drag.active) return;

      const { params: curParams, onChange: notify } = latestRef.current;
      let working = curParams.points.map((p) => ({ ...p }));
      let targetPoint: MapControlPoint | null = working[drag.pointIndex] ?? null;

      if (drag.markedForDeletion && working.length > 1 && drag.pointIndex >= 0) {
        working.splice(drag.pointIndex, 1);
        const fallbackIdx = Math.max(0, drag.pointIndex - 1);
        targetPoint = working[fallbackIdx] ?? null;
      }

      // Сортируем точки по позиции и сохраняем выделение на актуальном объекте
      working.sort((a, b) => a.position - b.position);
      const nextSelectedIdx =
        targetPoint !== null ? working.indexOf(targetPoint) : working.length > 0 ? 0 : null;

      dragRef.current = {
        active: false,
        pointIndex: -1,
        startY: 0,
        markedForDeletion: false,
      };
      setIsDragging(false);
      setSelectedIndex(nextSelectedIdx !== -1 ? nextSelectedIdx : 0);

      notify({ ...curParams, points: working });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, renderCanvas]);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;

    // 1. Проверяем попадание в существующий маркер
    let clickedIdx = -1;
    let bestDist = 14;
    params.points.forEach((stop, idx) => {
      const stopX = stop.position * width;
      const dist = Math.hypot(x - stopX, y - MARKER_Y);
      if (dist < bestDist) {
        bestDist = dist;
        clickedIdx = idx;
      }
    });

    if (clickedIdx !== -1) {
      setSelectedIndex(clickedIdx);
      dragRef.current = {
        active: true,
        pointIndex: clickedIdx,
        startY: e.clientY,
        markedForDeletion: false,
      };
      setIsDragging(true);
      return;
    }

    // 2. Клик по верхней полосе шкалы — добавляем новую точку
    if (y <= 28) {
      const normPos = Math.max(0, Math.min(1, x / width));
      const sorted = [...params.points].sort((a, b) => a.position - b.position);
      const prevStop = [...sorted].reverse().find((s) => s.position < normPos) || sorted[0];

      const newStop: MapControlPoint = {
        position: normPos,
        value: prevStop ? prevStop.value : preset.defaultPointValue,
      };

      const nextPoints = [...params.points.map((p) => ({ ...p })), newStop].sort(
        (a, b) => a.position - b.position
      );
      const insertedIdx = nextPoints.indexOf(newStop);

      setSelectedIndex(insertedIdx);
      onChange({ ...params, points: nextPoints });
    }
  };

  const selectedStop =
    selectedIndex !== null && params.points[selectedIndex]
      ? params.points[selectedIndex]
      : null;

  const updateSelectedValue = (nextVal: string | number) => {
    if (selectedIndex === null || !params.points[selectedIndex]) return;
    const nextPoints = params.points.map((p, idx) =>
      idx === selectedIndex ? { ...p, value: nextVal } : { ...p }
    );
    onChange({ ...params, points: nextPoints });
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-300">
        <span>{title}</span>
        <span className="font-mono text-[10px] text-zinc-500 tabular-nums">
          {params.points.length} {params.points.length === 1 ? 'точка' : 'тчк'}
        </span>
      </div>

      {/* Интерактивный canvas: клик по полосе добавляет точку, перетаскивание вниз удаляет */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        title="Клик по шкале — добавить точку. Потяните маркер вниз — удалить."
        className="h-[52px] w-full cursor-pointer rounded-md select-none"
      />

      {/* Инспектор выбранной контрольной точки */}
      {mode === 'color' ? (
        <div
          className={`flex items-center justify-between gap-2 ${
            selectedStop ? '' : 'opacity-40 pointer-events-none'
          }`}
        >
          <span className="text-[11px] text-zinc-300">{preset.pointLabel}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase text-zinc-400 tabular-nums">
              {selectedStop ? String(selectedStop.value) : '—'}
            </span>
            <input
              type="color"
              disabled={!selectedStop}
              value={selectedStop ? String(selectedStop.value) : '#00f3ff'}
              onChange={(e) => updateSelectedValue(e.target.value)}
              className="h-5 w-7 cursor-pointer rounded border border-white/15 bg-transparent p-0"
            />
          </div>
        </div>
      ) : (
        <RangeField
          label={preset.pointLabel}
          value={selectedStop ? Number(selectedStop.value) : Number(preset.defaultPointValue)}
          min={preset.pointMin ?? 0}
          max={preset.pointMax ?? 100}
          step={preset.pointStep ?? 1}
          disabled={!selectedStop}
          onChange={(val) =>
            updateSelectedValue(mode === 'opacity' ? Math.round(val) : val)
          }
        />
      )}

      {/* Глобальные настройки карты: плотность и скорость потока */}
      <div className="flex flex-col gap-2 border-t border-white/8 pt-2">
        <RangeField
          label="Плотность (Density)"
          value={params.density}
          min={preset.densityMin}
          max={preset.densityMax}
          step={preset.densityStep}
          editableNumber={true}
          onChange={(density) => onChange({ ...params, density })}
        />
        <RangeField
          label="Поток (Flow)"
          value={params.flow}
          min={preset.flowMin}
          max={preset.flowMax}
          step={preset.flowStep}
          editableNumber={false}
          onChange={(flow) => onChange({ ...params, flow })}
        />
      </div>
    </div>
  );
};
