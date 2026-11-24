// src/ui/components/SimulationPanel.tsx

import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { LinkConfig, SimulationConfig } from '../../types';
import { RangeField } from './RangeField';

interface SimulationPanelProps {
  config: SimulationConfig;
  onChange: (next: SimulationConfig) => void;
  onClearTrail: () => void;
  onBgColorChange: (color: string) => void;
  onReset: () => void;
}

const DEFAULT_NEW_LINK: LinkConfig = {
  length: 1.0,
  speed2D: 1.0,
  speed3D: 0.0,
  phase: 0,
};

/**
 * Панель параметров кинематики маятника:
 * число звеньев (1–5), общая скорость, цвет фона и параметры каждого звена.
 */
export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  config,
  onChange,
  onClearTrail,
  onBgColorChange,
  onReset,
}) => {
  const handleLinkCountChange = (count: number) => {
    const clamped = Math.min(5, Math.max(1, Math.round(count)));
    const nextLinks = config.links.slice(0, clamped).map((l) => ({ ...l }));
    while (nextLinks.length < clamped) {
      nextLinks.push({ ...DEFAULT_NEW_LINK });
    }

    onChange({
      ...config,
      linkCount: clamped,
      links: nextLinks,
    });
    onClearTrail();
  };

  const handleLinkFieldChange = (
    index: number,
    patch: Partial<LinkConfig>
  ) => {
    const nextLinks = config.links.map((link, idx) =>
      idx === index ? { ...link, ...patch } : { ...link }
    );
    onChange({ ...config, links: nextLinks });
    onClearTrail();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Заголовок и кнопка сброса */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-zinc-100">
          Параметры кинематики
        </h2>
        <button
          type="button"
          onClick={onReset}
          title="Сбросить параметры симуляции"
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Сброс</span>
        </button>
      </div>

      {/* Глобальные настройки симуляции */}
      <div className="flex flex-col gap-3">
        <RangeField
          label="Звенья (1–5)"
          value={config.linkCount}
          min={1}
          max={5}
          step={1}
          onChange={handleLinkCountChange}
        />

        <RangeField
          label="Скорость симуляции"
          value={config.speed}
          min={0.1}
          max={3.0}
          step={0.1}
          onChange={(speed) => onChange({ ...config, speed })}
        />

        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[11px] text-zinc-300">Цвет фона</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase text-zinc-400 tabular-nums">
              {config.backgroundColor}
            </span>
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(e) => onBgColorChange(e.target.value)}
              className="h-5 w-7 cursor-pointer rounded border border-white/15 bg-transparent p-0"
            />
          </div>
        </div>
      </div>

      {/* Настройки каждого активного звена */}
      <div className="flex flex-col gap-2.5 border-t border-white/10 pt-3">
        {config.links.slice(0, config.linkCount).map((link, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-2 rounded-lg border border-white/8 bg-white/[0.03] p-2.5"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-200">
              <span>Звено #{idx + 1}</span>
              <span className="font-mono text-[10px] font-normal text-zinc-500 tabular-nums">
                {config.is3D ? '3D' : '2D'}
              </span>
            </div>

            <RangeField
              label="Длина"
              value={link.length}
              min={0.1}
              max={5.0}
              step={0.1}
              onChange={(length) => handleLinkFieldChange(idx, { length })}
            />

            <RangeField
              label="Скорость 2D"
              value={link.speed2D}
              min={-10.0}
              max={10.0}
              step={0.1}
              onChange={(speed2D) => handleLinkFieldChange(idx, { speed2D })}
            />

            {/* Скорость 3D отображается только при активном 3D-режиме */}
            {config.is3D && (
              <RangeField
                label="Скорость 3D"
                value={link.speed3D ?? 0.0}
                min={-10.0}
                max={10.0}
                step={0.1}
                onChange={(speed3D) => handleLinkFieldChange(idx, { speed3D })}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
