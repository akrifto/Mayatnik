// src/ui/components/PendulumHUD.tsx

import React, { useState } from 'react';
import {
  Box,
  Palette,
  Pause,
  Play,
  SlidersHorizontal,
  Square,
  Trash2,
} from 'lucide-react';
import type { BrushFXConfig, EngineCallbacks, SimulationConfig } from '../../types';
import { SimulationPanel } from './SimulationPanel';
import { BrushPanel } from './BrushPanel';

type ActivePanel = 'sim' | 'brush' | null;

export interface PendulumHUDProps {
  /** Ссылки на конфиги движка (синхронизируются с UI без привязки к React-циклу) */
  simConfig: SimulationConfig;
  brushConfig: BrushFXConfig;
  callbacks: EngineCallbacks;
  /** Начальное состояние воспроизведения */
  initialPlaying?: boolean;
  /** Опциональное уведомление внешней оболочки о смене снимка конфигов */
  onSimSnapshotChange?: (next: SimulationConfig) => void;
  onBrushSnapshotChange?: (next: BrushFXConfig) => void;
}

/** Создаёт глубокий снимок SimulationConfig для предсказуемого React-рендера */
function cloneSimConfig(src: SimulationConfig): SimulationConfig {
  return {
    ...src,
    links: src.links.map((l) => ({ ...l })),
    mirror2D: { ...src.mirror2D },
    mirror3D: { ...src.mirror3D },
  };
}

/** Создаёт глубокий снимок BrushFXConfig */
function cloneBrushConfig(src: BrushFXConfig): BrushFXConfig {
  return {
    ...src,
    gradientMap: {
      ...src.gradientMap,
      points: src.gradientMap.points.map((p) => ({ ...p })),
    },
    opacityMap: {
      ...src.opacityMap,
      points: src.opacityMap.points.map((p) => ({ ...p })),
    },
    widthMap: {
      ...src.widthMap,
      points: src.widthMap.points.map((p) => ({ ...p })),
    },
  };
}

/**
 * Главный HUD-оверлей проекта Mayatnik.
 * Управляет только UI-состоянием (активная панель, Play/Pause, 2D/3D, локальные снимки форм)
 * и транслирует все изменения наружу в конфиги и коллбэки чистого TypeScript-движка.
 */
export const PendulumHUD: React.FC<PendulumHUDProps> = ({
  simConfig,
  brushConfig,
  callbacks,
  initialPlaying = true,
  onSimSnapshotChange,
  onBrushSnapshotChange,
}) => {
  const [isPlaying, setIsPlaying] = useState(initialPlaying);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  // Локальные снимки конфигов для реактивного обновления элементов управления
  const [simState, setSimState] = useState<SimulationConfig>(() =>
    cloneSimConfig(simConfig)
  );
  const [brushState, setBrushState] = useState<BrushFXConfig>(() =>
    cloneBrushConfig(brushConfig)
  );

  // Синхронизируем изменения обратно в мутируемые объекты движка и уведомляем его
  const applySimChange = (next: SimulationConfig) => {
    simConfig.linkCount = next.linkCount;
    simConfig.links = next.links.map((l) => ({ ...l }));
    simConfig.is3D = next.is3D;
    simConfig.speed = next.speed;
    simConfig.backgroundColor = next.backgroundColor;
    simConfig.mirror2D = { ...next.mirror2D };
    simConfig.mirror3D = { ...next.mirror3D };

    setSimState(next);
    onSimSnapshotChange?.(next);
    callbacks.onConfigChange();
  };

  const applyBrushChange = (next: BrushFXConfig) => {
    brushConfig.gradientMap = {
      ...next.gradientMap,
      points: next.gradientMap.points.map((p) => ({ ...p })),
    };
    brushConfig.opacityMap = {
      ...next.opacityMap,
      points: next.opacityMap.points.map((p) => ({ ...p })),
    };
    brushConfig.widthMap = {
      ...next.widthMap,
      points: next.widthMap.points.map((p) => ({ ...p })),
    };
    brushConfig.exposure = next.exposure;
    brushConfig.glowIntensity = next.glowIntensity;
    brushConfig.lineLengthMax = next.lineLengthMax;

    setBrushState(next);
    onBrushSnapshotChange?.(next);
    callbacks.onConfigChange();
  };

  const handlePlayToggle = () => {
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);
    callbacks.onPlayToggle(nextPlaying);
  };

  const handleModeToggle = () => {
    const nextIs3D = !simState.is3D;
    simConfig.is3D = nextIs3D;
    const next = { ...simState, is3D: nextIs3D };
    setSimState(next);
    onSimSnapshotChange?.(next);
    callbacks.onModeToggle(nextIs3D);
  };

  const handleBgColorChange = (color: string) => {
    simConfig.backgroundColor = color;
    const next = { ...simState, backgroundColor: color };
    setSimState(next);
    onSimSnapshotChange?.(next);
    callbacks.onBgColorChange(color);
  };

  const handleReset = () => {
    callbacks.onReset();
    // После сброса во внешнем движке подтягиваем обновлённый simConfig в UI
    const synced = cloneSimConfig(simConfig);
    setSimState(synced);
    onSimSnapshotChange?.(synced);
  };

  const togglePanel = (panel: Exclude<ActivePanel, null>) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="pointer-events-none fixed top-5 right-5 z-50 flex items-start gap-3">
      {/* Выпадающая панель настроек */}
      {activePanel !== null && (
        <aside
          aria-label={
            activePanel === 'sim' ? 'Настройки симуляции' : 'Настройки кисти и эффектов'
          }
          className="pointer-events-auto mayatnik-scroll flex max-h-[85vh] w-[290px] flex-col overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/85 p-3.5 text-zinc-100 shadow-2xl backdrop-blur-xl"
        >
          {activePanel === 'sim' ? (
            <SimulationPanel
              config={simState}
              onChange={applySimChange}
              onClearTrail={callbacks.onClear}
              onBgColorChange={handleBgColorChange}
              onReset={handleReset}
            />
          ) : (
            <BrushPanel config={brushState} onChange={applyBrushChange} />
          )}
        </aside>
      )}

      {/* Вертикальный док быстрых действий */}
      <nav
        aria-label="Управление визуализацией"
        className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 p-1.5 shadow-2xl backdrop-blur-xl"
      >
        <DockButton
          active={false}
          title={isPlaying ? 'Пауза' : 'Запустить'}
          onClick={handlePlayToggle}
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </DockButton>

        <DockButton
          active={false}
          title="Очистить следы"
          onClick={callbacks.onClear}
        >
          <Trash2 className="h-4 w-4" />
        </DockButton>

        <DockButton
          active={simState.is3D}
          title={simState.is3D ? 'Режим 3D (нажмите для 2D)' : 'Режим 2D (нажмите для 3D)'}
          onClick={handleModeToggle}
        >
          {simState.is3D ? <Box className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </DockButton>

        <div className="my-0.5 h-px w-6 bg-white/10" />

        <DockButton
          active={activePanel === 'sim'}
          title="Настройки симуляции и маятника"
          onClick={() => togglePanel('sim')}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </DockButton>

        <DockButton
          active={activePanel === 'brush'}
          title="Настройки кисти и эффектов"
          onClick={() => togglePanel('brush')}
        >
          <Palette className="h-4 w-4" />
        </DockButton>
      </nav>
    </div>
  );
};

interface DockButtonProps {
  active: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}

const DockButton: React.FC<DockButtonProps> = ({
  active,
  title,
  onClick,
  children,
}) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    onClick={onClick}
    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
      active
        ? 'border-cyan-400/60 bg-cyan-400/15 text-cyan-200'
        : 'border-transparent bg-white/[0.04] text-zinc-300 hover:border-white/15 hover:bg-white/10 hover:text-white'
    }`}
  >
    {children}
  </button>
);
