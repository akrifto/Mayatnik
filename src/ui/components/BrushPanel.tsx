// src/ui/components/BrushPanel.tsx

import React from 'react';
import type { BrushFXConfig } from '../../types';
import { RangeField } from './RangeField';
import { StopMapEditor } from '../controls/StopMapEditor';

interface BrushPanelProps {
  config: BrushFXConfig;
  onChange: (next: BrushFXConfig) => void;
}

/**
 * Панель настроек кисти и пост-обработки:
 * длина хвоста, три карты (градиент, прозрачность, толщина), glow и экспозиция.
 */
export const BrushPanel: React.FC<BrushPanelProps> = ({ config, onChange }) => {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold tracking-wide text-zinc-100">
        Настройки кисти и FX
      </h2>

      {/* Максимальное число точек шлейфа */}
      <RangeField
        label="Длина хвоста"
        value={config.lineLengthMax}
        min={100}
        max={50000}
        step={50}
        onChange={(lineLengthMax) => onChange({ ...config, lineLengthMax })}
      />

      {/* Три переиспользуемых редактора шкалы точек */}
      <StopMapEditor
        mode="color"
        title="Карта градиента"
        params={config.gradientMap}
        onChange={(gradientMap) => onChange({ ...config, gradientMap })}
      />

      <StopMapEditor
        mode="opacity"
        title="Карта прозрачности"
        params={config.opacityMap}
        onChange={(opacityMap) => onChange({ ...config, opacityMap })}
      />

      <StopMapEditor
        mode="width"
        title="Карта толщины"
        params={config.widthMap}
        onChange={(widthMap) => onChange({ ...config, widthMap })}
      />

      {/* Параметры пост-обработки */}
      <div className="flex flex-col gap-2.5 border-t border-white/10 pt-2.5">
        <RangeField
          label="Неоновый Glow"
          value={config.glowIntensity}
          min={0}
          max={5.0}
          step={0.1}
          onChange={(glowIntensity) => onChange({ ...config, glowIntensity })}
        />

        <RangeField
          label="Яркость (Exposure)"
          value={config.exposure}
          min={0.0}
          max={5.0}
          step={0.01}
          onChange={(exposure) => onChange({ ...config, exposure })}
        />
      </div>
    </div>
  );
};
